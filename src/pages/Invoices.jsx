import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Select, Label, Empty, Skeleton, ShimmerRow } from '../components/UI'
import { formatCurrency, taxLabel } from '../utils/helpers'
import { getPayments, amountPaid, amountOutstanding, invoiceStatus, statusBadgeClass, outstandingSummary, pipelineStatus, pipelineBadgeClass, daysOverdue, generateReminder } from '../utils/payments'
import { generateInvoicePdf } from '../utils/invoicePdf'

export default function InvoicesPage(){
  const { data, loading, error: dataError, addInvoice, updateInvoice, deleteInvoice, recordPayment, markPaid, markSent, updateRevisions, addClient } = useData()
  const [form,setForm]=useState({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Draft', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}], revisions_included: data.settings.default_revisions_included ?? 2, revisions_used: 0 })
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [newClientName,setNewClientName]=useState('')
  const [showNewClient,setShowNewClient]=useState(false)
  const [payFor,setPayFor]=useState(null)
  const [payForm,setPayForm]=useState({ amount:'', date:new Date().toISOString().slice(0,10), note:'' })
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')
  const [justCreatedNum,setJustCreatedNum]=useState(null)
  const [expandedId,setExpandedId]=useState(null)

  const justCreated = justCreatedNum ? data.invoices.find(i=> i.invoice_number === justCreatedNum) : null

  const fmtDay = (dStr)=>{
    if (!dStr) return '—'
    try { return new Date(dStr.length > 10 ? dStr : dStr + 'T00:00:00').toLocaleDateString('en-US',{month:'short', day:'numeric'}) } catch { return dStr }
  }

  const activityFor = (inv)=>{
    const events = [{ date: (inv.created_at||'').slice(0,10) || inv.issue_date, label: `Created ${inv.invoice_number}`, key: 'created' }]
    if (inv.sent_at) events.push({ date: inv.sent_at.slice(0,10), label: 'Sent to client', key: 'sent' })
    getPayments(inv).forEach(p=> events.push({ date: p.date, label: `Payment received ${formatCurrency(p.amount, data.settings.currency)}${p.note ? ` — ${p.note}` : ''}`, key: p.id }))
    return events.sort((a,b)=> (a.date||'').localeCompare(b.date||''))
  }

  const visibleInvoices = useMemo(()=>{
    const q = search.trim().toLowerCase()
    return [...data.invoices]
      .filter(inv=>{
        if (statusFilter !== 'All'){
          const derived = invoiceStatus(inv)
          const pipe = pipelineStatus(inv)
          if (['Draft','Sent','Overdue','Paid'].includes(statusFilter)){
            const isOverdue = pipe==='Overdue' || derived==='Overdue' || derived==='Overdue (partial)'
            if (statusFilter==='Overdue' ? !isOverdue : pipe !== statusFilter) return false
          } else {
            if (derived !== statusFilter && !(statusFilter==='Overdue' && derived==='Overdue (partial)')) return false
          }
        }
        if (!q) return true
        return (inv.invoice_number||'').toLowerCase().includes(q) || (inv.client_name||'').toLowerCase().includes(q)
      })
      .sort((a,b)=> b.invoice_number.localeCompare(a.invoice_number))
  }, [data.invoices, search, statusFilter])

  useEffect(()=>{
    if (!editing) setForm(f=> ({ ...f, tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, revisions_included: data.settings.default_revisions_included ?? 2 }))
  }, [data.settings.default_tax_rate, data.settings.default_tax_type, data.settings.default_revisions_included, editing])

  useEffect(()=>{
    if (editing) return
    try{
      const raw = localStorage.getItem('clearbooks_preview_draft')
      if (!raw) return
      const d = JSON.parse(raw)
      if (!d || (!d.clientName && !d.amount)) return
      const isDefaultForm = form.line_items.length===1 && !form.line_items[0].description && Number(form.line_items[0].rate)===0 && !form.client_id
      if (!isDefaultForm) return
      const qty = Math.max(1, Number(d.quantity)||1)
      const rateVal = Number(d.rate) || (Number(d.amount)||0)/qty || 0
      setForm(f=> ({
        ...f,
        line_items: [{ description: d.description || 'Service', quantity: qty, rate: rateVal }],
      }))
      if (d.clientName) setNewClientName(d.clientName.slice(0,40))
      if (d.clientName) setShowNewClient(true)
      setInfo(`Draft from preview loaded — ${d.clientName || 'your client'} · ${formatCurrency(d.total || d.amount || 0, d.currency || data.settings.currency)} — pick or create the client, then hit Create invoice.`)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])
  const subtotal = useMemo(()=> form.line_items.reduce((s,l)=> s + (Number(l.quantity)||0)*(Number(l.rate)||0),0), [form.line_items])
  const tax_rate_num = (form.tax_type === 'none' || form.tax_type === 'exempt') ? 0 : (Number(form.tax_rate) || 0)
  const tax_amount = useMemo(()=> Number((subtotal * tax_rate_num / 100).toFixed(2)), [subtotal, tax_rate_num])
  const total = useMemo(()=> Number((subtotal + tax_amount).toFixed(2)), [subtotal, tax_amount])
  const addLine=()=> setForm({...form, line_items:[...form.line_items,{description:'',quantity:1,rate:0}]})
  const updateLine=(idx, patch)=> setForm({...form, line_items: form.line_items.map((l,i)=> i===idx? {...l,...patch}:l )})
  const removeLine=(idx)=> setForm({...form, line_items: form.line_items.filter((_,i)=>i!==idx)})

  const submit=async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    if(!form.client_id){ setErr('Client is required — select one or click ＋ to add a new client'); return }
    if(!form.issue_date || !form.due_date){ setErr('Issue and due dates are required'); return }
    if(new Date(form.due_date) < new Date(form.issue_date)){ setErr('Due date cannot be before issue date'); return }
    if(form.line_items.length===0){ setErr('At least one line item is required'); return }
    for(let i=0;i<form.line_items.length;i++){
      const l=form.line_items[i]
      if(!l.description.trim() || l.description.trim().length <2){ setErr(`Line ${i+1}: description min 2 chars`); return }
      if(Number(l.quantity) <=0){ setErr(`Line ${i+1}: quantity must be >0`); return }
      if(isNaN(Number(l.rate)) || Number(l.rate) <=0){ setErr(`Line ${i+1}: rate must be >0`); return }
    }
    if(total <=0){ setErr('Invoice total must be positive'); return }
    if (tax_rate_num <0 || tax_rate_num >100) { setErr('Tax rate must be 0–100'); return }
    const revInc = Number(form.revisions_included)
    const revUsed = Number(form.revisions_used)
    if (!Number.isInteger(revInc) || revInc <0 || revInc >100){ setErr('Revisions included must be an integer 0–100'); return }
    if (!Number.isInteger(revUsed) || revUsed <0 || revUsed >100){ setErr('Revisions used must be an integer 0–100'); return }
    const client = data.clients.find(c=>c.id===form.client_id)
    let dbStatus = form.status
    let sent_at = undefined
    if (form.status === 'Draft'){ dbStatus = 'Unpaid'; sent_at = null }
    else if (form.status === 'Sent'){ dbStatus = 'Unpaid'; sent_at = new Date().toISOString() }
    else if (form.status === 'Paid'){ dbStatus = 'Paid' }
    const payload = {
      client_id: form.client_id||null,
      client_name: client?.name||'—',
      issue_date: form.issue_date,
      due_date: form.due_date,
      status: dbStatus,
      ...(sent_at !== undefined ? { sent_at } : {}),
      revisions_included: Math.floor(revInc),
      revisions_used: Math.floor(revUsed),
      tax_type: form.tax_type || 'none',
      tax_rate: tax_rate_num,
      subtotal,
      tax_amount,
      line_items: form.line_items.map(l=> ({...l, description:l.description.trim(), quantity: Number(l.quantity), rate: Number(l.rate), total: (Number(l.quantity)||0)*(Number(l.rate)||0)})),
      total_amount: total,
    }
    try{
      if(editing) {
        await updateInvoice(editing, payload)
        setInfo('Invoice updated!')
      } else {
        const num = await addInvoice(payload)
        setInfo(`Invoice created! ${num||''}`)
        setJustCreatedNum(num || null)
        setExpandedId(null)
        window.scrollTo({top:0, behavior:'smooth'})
        try{ localStorage.removeItem('clearbooks_preview_draft') } catch {}
      }
      setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Draft', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}], revisions_included: data.settings.default_revisions_included ?? 2, revisions_used: 0 }); setEditing(null)
      setTimeout(()=> setInfo(''), 3000)
    }catch(ex){ setErr(ex.message) }
  }
  const handleAddClient = async()=>{
    if(!newClientName.trim() || newClientName.trim().length <2){ setErr('Client name min 2 chars'); return }
    try{
      const res = await addClient({ name:newClientName.trim(), email:'', notes:'' })
      const id = res?.id || res
      setNewClientName(''); setShowNewClient(false); setErr('')
      if(id) setForm(f=>({...f, client_id:id}))
    }catch(ex){ setErr(ex.message) }
  }
  const startEdit=(inv)=>{
    const pipe = pipelineStatus(inv)
    const formStatus = pipe === 'Paid' ? 'Paid' : pipe === 'Sent' ? 'Sent' : pipe === 'Overdue' ? 'Overdue' : pipe === 'Draft' ? 'Draft' : (inv.status === 'Paid' ? 'Paid' : 'Unpaid')
    setEditing(inv.id); setForm({ client_id:inv.client_id||'', issue_date:inv.issue_date, due_date:inv.due_date, status: formStatus, tax_type: inv.tax_type || (inv.tax_rate > 0 ? 'custom' : 'none'), tax_rate: inv.tax_rate ?? 0, line_items: inv.line_items?.length? inv.line_items: [{description:'',quantity:1,rate:0}], revisions_included: inv.revisions_included ?? 2, revisions_used: inv.revisions_used ?? 0 })
    setErr(''); window.scrollTo({top:0,behavior:'smooth'})
  }

  const badge=(s)=> <span className={`text-xs font-bold border rounded-full px-2.5 py-1 backdrop-blur ${statusBadgeClass(s).replace('bg-','bg-').replace('border-','border-')}`}>{s}</span>

  const outstanding = useMemo(()=> outstandingSummary(data.invoices), [data.invoices])

  const handleMarkPaid = async (inv)=>{
    const bal = amountOutstanding(inv)
    if (bal <= 0) return
    if(!confirm(`Mark ${inv.invoice_number} as paid (${formatCurrency(bal, data.settings.currency)})?`)) return
    try{
      await markPaid(inv.id)
      setInfo(`${inv.invoice_number} marked as paid!`)
      setTimeout(()=> setInfo(''), 2500)
    }catch(ex){ alert(ex.message) }
  }

  const handleRecordPayment = async (inv)=>{
    try{
      await recordPayment(inv.id, { amount: payForm.amount, date: payForm.date, note: payForm.note })
      setInfo(`Payment recorded for ${inv.invoice_number}`)
      setPayFor(null); setPayForm({ amount:'', date:new Date().toISOString().slice(0,10), note:'' })
      setTimeout(()=> setInfo(''), 2500)
    }catch(ex){ alert(ex.message) }
  }

  const handleSend = async (inv)=>{
    const client = data.clients.find(c=>c.id===inv.client_id)
    const email = client?.email
    const subject = encodeURIComponent(`Invoice ${inv.invoice_number} from ${data.settings.business_name || data.settings.name || 'ClearBooks'}`)
    const body = encodeURIComponent(`Hi ${inv.client_name},\n\nPlease find invoice ${inv.invoice_number} for ${formatCurrency(inv.total_amount, data.settings.currency)} due ${inv.due_date}.\n\nThank you!`)
    try{ await markSent(inv.id) }catch{}
    if (email) window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
    else alert('No client email on file — invoice marked as sent. Add an email on the Clients page to send directly.')
    setInfo(`${inv.invoice_number} marked as sent`)
    setTimeout(()=> setInfo(''), 2500)
  }

  const handleCopy = async (inv)=>{
    const text = `Invoice ${inv.invoice_number} — ${inv.client_name} — ${formatCurrency(inv.total_amount, data.settings.currency)} — Due ${inv.due_date} — Status ${invoiceStatus(inv)}`
    try{
      await navigator.clipboard.writeText(text)
      setInfo('Invoice details copied to clipboard')
      setTimeout(()=> setInfo(''), 2000)
    }catch{ alert(text) }
  }

  const handleReminder = async (inv)=>{
    const days = daysOverdue(inv)
    const bal = amountOutstanding(inv)
    const business = data.settings.business_name || data.settings.name || 'ClearBooks'
    const { whatsapp } = generateReminder(inv, { businessName: business, currency: data.settings.currency, bal, daysLate: days })
    try{
      await navigator.clipboard.writeText(whatsapp)
      setInfo(`Reminder copied — ${days>0? `${days} days late • `:''}paste into WhatsApp or Email`)
      setTimeout(()=> setInfo(''), 2800)
    }catch{ alert(whatsapp) }
  }

  const handleRevisionUsed = async (inv, delta)=>{
    const cur = Number(inv.revisions_used ?? 0)
    const next = cur + delta
    if (next <0 || next>100) return
    try{ await updateRevisions(inv.id, { revisions_used: next }) }catch(e){ alert(e.message) }
  }

  const downloadPDF=(inv)=>{
    const client = data.clients.find(c=>c.id===inv.client_id) || null
    const doc = generateInvoicePdf({ invoice: inv, settings: data.settings, client })
    doc.save(`${inv.invoice_number}.pdf`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72 opacity-60" />
        </div>
        <div className="grid gap-4">
          <div className="skeleton h-44 rounded-[22px]" />
          <div className="skeleton h-64 rounded-[22px] opacity-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* — Studio Header — */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase text-cyan-300">
            <span className="w-6 h-[1px] bg-cyan-400/60" /> Invoices
            <span className="text-slate-500 font-medium tracking-widest normal-case">Typography-first • Luxury paper</span>
          </div>
          <h1 className="text-[30px] md:text-[36px] font-bold tracking-[-0.03em] text-white mt-1">Invoices</h1>
          <p className="text-[13px] text-slate-400 mt-1 font-light tracking-wide">Create → Send → Track → Paid. Every invoice is a brand artifact.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=> { setEditing(null); window.scrollTo({top: 400, behavior:'smooth'}) }} className="btn-neon rounded-xl px-6 py-3 text-sm font-bold tracking-tight shadow-[0_0_28px_rgba(6,182,214,0.35)]">✦ Create Invoice</button>
          <Link to="/clients" className="glass rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 border border-white/10 hover:text-white">Manage Clients</Link>
        </div>
      </div>

      {/* — Completed hero — luxury preview */}
      {justCreated && (
        <LuxuryInvoicePreview
          inv={justCreated}
          currency={data.settings.currency}
          business={data.settings.business_name || data.settings.name || 'ClearBooks'}
          client={data.clients.find(c=>c.id===justCreated.client_id)}
          onClose={()=>setJustCreatedNum(null)}
          onDownload={()=>downloadPDF(justCreated)}
          onSend={()=>handleSend(justCreated)}
          onMarkPaid={()=>handleMarkPaid(justCreated)}
          activity={activityFor(justCreated)}
          fmtDay={fmtDay}
          badge={badge}
        />
      )}

      {/* — Outstanding bento — */}
      {data.invoices.length > 0 && (
        <Card className="p-0 overflow-hidden border-amber-500/15">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px 220px at 12% 0%, rgba(251,146,60,0.08), transparent 65%)' }} />
          <div className="relative p-5 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-amber-300">Still owed to you</div>
              <div className="text-[28px] font-bold tracking-tight text-white mt-1" style={{ fontFamily: 'Fraunces, serif' }}>{formatCurrency(outstanding.outstanding, data.settings.currency)}</div>
              <div className="text-xs text-slate-400 mt-1 font-light">from {outstanding.openCount} open invoice{outstanding.openCount===1?'':'s'}{outstanding.overdue>0 && <span className="text-red-300 font-medium"> · {formatCurrency(outstanding.overdue, data.settings.currency)} overdue</span>}</div>
            </div>
            <Link to="/reports" className="glass rounded-full px-4 py-2 text-xs font-semibold text-slate-200 border border-white/10 hover:text-white hover:bg-white/5">See reports →</Link>
          </div>
        </Card>
      )}

      {/* — Create / Edit form — glass Bento */}
      <Card className="p-6 md:p-7 border-cyan-400/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl grid place-items-center border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_16px_rgba(6,182,214,0.18)]">✦</div>
          <div>
            <h2 className="font-semibold text-white tracking-tight">{editing?'Edit invoice':'Create invoice'}</h2>
            <p className="text-xs text-slate-500 font-light">Neon CTA below is the most striking action on the page — by design.</p>
          </div>
          {editing && <span className="ml-auto text-[11px] font-bold tracking-widest uppercase bg-amber-500/12 text-amber-300 border border-amber-500/20 rounded-full px-3 py-1">Editing</span>}
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoice-client">Client *</Label>
              <div className="flex gap-2 mt-1.5">
                <Select id="invoice-client" value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}><option value="">Select client</option>{data.clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                <button type="button" onClick={()=>setShowNewClient(v=>!v)} className="w-11 h-11 grid place-items-center rounded-xl glass border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 shrink-0">＋</button>
              </div>
              {showNewClient && <div className="flex gap-2 mt-2"><Input id="invoice-new-client" placeholder="New client name (min 2 chars)" value={newClientName} onChange={e=>setNewClientName(e.target.value)} /><Button type="button" onClick={handleAddClient} className="text-xs whitespace-nowrap">Add</Button></div>}
              {data.clients.length===0 && !showNewClient && <p className="text-xs text-amber-300/80 mt-2">No clients yet — click ＋ to add one, or go to Clients page.</p>}
            </div>
            <div><Label htmlFor="invoice-issue">Issue date *</Label><Input id="invoice-issue" type="date" value={form.issue_date} onChange={e=>setForm({...form, issue_date:e.target.value})} required className="mt-1.5" /></div>
            <div><Label htmlFor="invoice-due">Due date *</Label><Input id="invoice-due" type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} required className="mt-1.5" /></div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-2xl">
            <div><Label htmlFor="invoice-status">Pipeline status</Label><Select id="invoice-status" value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="mt-1.5"><option value="Draft">Draft — not sent</option><option value="Sent">Sent — awaiting</option><option value="Unpaid">Unpaid (legacy)</option><option value="Paid">Paid</option><option value="Overdue">Overdue (auto)</option></Select></div>
            <div><Label htmlFor="invoice-tax-type">Tax</Label><Select id="invoice-tax-type" value={form.tax_type} onChange={e=>setForm({...form, tax_type: e.target.value})} className="mt-1.5"><option value="none">No tax</option><option value="gst">GST</option><option value="vat">VAT</option><option value="custom">Custom</option><option value="exempt">Tax exempt</option></Select></div>
            <div><Label htmlFor="invoice-tax">Rate (%)</Label><Input id="invoice-tax" type="number" min="0" max="100" step="0.01" value={form.tax_type==='none'||form.tax_type==='exempt' ? 0 : form.tax_rate} onChange={e=>setForm({...form, tax_rate: e.target.value})} required disabled={form.tax_type==='none'||form.tax_type==='exempt'} className="mt-1.5 disabled:opacity-40" /></div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-2 font-light">Tax type and rate snapshotted per invoice — changing defaults later won’t affect this invoice.</p>

          {/* Revision Guard */}
          <div className="rounded-2xl border border-amber-500/18 bg-amber-500/[0.06] backdrop-blur p-4">
            <div className="text-sm font-semibold text-amber-200 tracking-tight">Revision Guard — Project Milestone</div>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div><Label htmlFor="revisions_included">Revisions Included *</Label><Input id="revisions_included" type="number" min="0" max="100" step="1" value={form.revisions_included} onChange={e=> setForm({...form, revisions_included: e.target.value === '' ? '' : Number(e.target.value)})} required className="mt-1.5" /></div>
              <div><Label htmlFor="revisions_used">Revisions Used</Label><Input id="revisions_used" type="number" min="0" max="100" step="1" value={form.revisions_used} onChange={e=> setForm({...form, revisions_used: e.target.value === '' ? '' : Number(e.target.value)})} required className="mt-1.5" /></div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-light">PDF shows: Revisions Included: {form.revisions_included ?? 2} | Used: {form.revisions_used ?? 0}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3"><Label>Line items *</Label><button type="button" onClick={addLine} className="text-xs font-semibold glass rounded-full px-3 py-1.5 text-cyan-300 border border-cyan-400/15 hover:bg-cyan-500/10">＋ Add line</button></div>
            <div className="space-y-2.5">
              {form.line_items.map((l,i)=>(
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end glass rounded-2xl p-3.5 border border-white/8">
                  <div className="col-span-1 md:col-span-6"><Label htmlFor={`invoice-desc-${i}`}>Description *</Label><Input id={`invoice-desc-${i}`} value={l.description} onChange={e=>updateLine(i,{description:e.target.value})} placeholder="Color grading — project name" required minLength={2} className="mt-1.5" /></div>
                  <div className="col-span-1 md:col-span-2"><Label htmlFor={`invoice-qty-${i}`}>Qty *</Label><Input id={`invoice-qty-${i}`} type="number" min="1" step="1" value={l.quantity} onChange={e=>updateLine(i,{quantity:e.target.value})} required className="mt-1.5" /></div>
                  <div className="col-span-1 md:col-span-2"><Label htmlFor={`invoice-rate-${i}`}>Rate ({data.settings.currency}) *</Label><Input id={`invoice-rate-${i}`} type="number" min="0.01" step="0.01" value={l.rate} onChange={e=>updateLine(i,{rate:e.target.value})} required className="mt-1.5" /></div>
                  <div className="col-span-1 md:col-span-2 flex md:flex-col items-center md:items-end justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{formatCurrency((Number(l.quantity)||0)*(Number(l.rate)||0), data.settings.currency)}</span>
                    <button type="button" onClick={()=>removeLine(i)} className="text-xs text-red-300 hover:text-red-200 border border-red-500/15 bg-red-500/8 rounded-full px-2.5 py-1 disabled:opacity-30" disabled={form.line_items.length===1}>✕ Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals preview — glass */}
            <div className="glass rounded-2xl p-4 mt-3 space-y-2 text-sm border border-white/8">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="text-slate-200">{formatCurrency(subtotal, data.settings.currency)}</span></div>
              <div className="flex justify-between text-slate-400"><span>{taxLabel(form.tax_type, tax_rate_num)}</span><span className="text-slate-200">{formatCurrency(tax_amount, data.settings.currency)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2 text-white"><span>Total</span><span style={{ fontFamily: 'Fraunces, serif' }}>{formatCurrency(total, data.settings.currency)}</span></div>
              <p className="text-[11px] text-slate-500 font-light">Live preview — final PDF uses luxury paper with serif total.</p>
            </div>
          </div>

          {err && <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3 backdrop-blur">{err}</div>}
          {info && <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 backdrop-blur">{info}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-neon rounded-xl px-8 py-3 text-[15px] font-bold tracking-tight shadow-[0_0_28px_rgba(6,182,214,0.45)] hover:shadow-[0_0_40px_rgba(6,182,214,0.6)] hover:-translate-y-[1px] transition">
              {editing?'Update invoice':'✦ Create invoice'}
            </button>
            {editing && <button type="button" onClick={()=>{setEditing(null); setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Draft', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}], revisions_included: data.settings.default_revisions_included ?? 2, revisions_used: 0 }); setErr('')}} className="glass rounded-xl px-5 py-3 text-sm font-semibold text-slate-300 border border-white/10 hover:text-white">Cancel</button>}
          </div>
          <p className="text-[11px] text-slate-500 font-light">The Create button glows — it’s the primary Studio action. Every other control stays glass-muted.</p>
        </form>
      </Card>

      {data.invoices.length===0 ? <Empty title="No invoices yet" variant="invoice" desc="Create your first invoice — it auto-numbers and exports to luxury PDF." /> :
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap gap-3 p-4 border-b border-white/8" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)' }}>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search number or client…" className="!w-56 !py-2" />
            <Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="!w-auto text-sm !py-2">
              <option>All</option><option>Unpaid</option><option>Sent</option><option>Due soon</option><option>Partial</option><option>Overdue</option><option>Paid</option>
            </Select>
            {(search || statusFilter!=='All') && <span className="text-xs text-slate-400 self-center">{visibleInvoices.length} of {data.invoices.length}</span>}
          </div>
          {visibleInvoices.length===0 ? <p className="text-sm text-slate-500 p-8 text-center">No invoices match your search.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-slate-500" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><tr><th className="text-left px-4 py-3 font-semibold">Number</th><th className="text-left px-4 py-3 font-semibold">Client</th><th className="text-left px-4 py-3 font-semibold">Dates</th><th className="text-right px-4 py-3 font-semibold">Paid / Total</th><th className="text-center px-4 py-3 font-semibold">Status</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {visibleInvoices.map(inv=>{
                  const s = invoiceStatus(inv)
                  const pipe = pipelineStatus(inv)
                  const paid = amountPaid(inv)
                  const bal = amountOutstanding(inv)
                  const pays = getPayments(inv)
                  const rate = Number(inv.tax_rate ?? 0)
                  const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
                  const days = daysOverdue(inv)
                  const isOpen = expandedId === inv.id
                  return (
                    <>
                    <tr key={inv.id} className="hover:bg-white/[0.03] transition align-top group">
                      <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap text-white">{inv.invoice_number}{pipe==='Sent' && <div className="text-[10px] text-cyan-300 font-normal">Sent</div>}{pipe==='Draft' && <div className="text-[10px] text-slate-500 font-normal">Draft</div>}</td>
                      <td className="px-4 py-3 text-slate-200">{inv.client_name}</td>
                      <td className="px-4 py-3 text-xs leading-tight whitespace-nowrap text-slate-300">{inv.issue_date} → {inv.due_date}{inv.payment_date && <div className="text-emerald-300">Paid {inv.payment_date}</div>}<div className="text-slate-500">{taxLabel(ttype, rate)}</div><div className={`text-[10px] font-medium ${ (inv.revisions_used??0) > (inv.revisions_included??2) ? 'text-red-300' : 'text-slate-500'}`}>⟲ {inv.revisions_used ?? 0}/{inv.revisions_included ?? 2} revisions{(inv.revisions_used??0) > (inv.revisions_included??2) ? ' · billable' : ''}</div>{pipe==='Overdue' && <div className="text-[10px] font-bold text-red-300">{days} days late</div>}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap"><span className="font-semibold text-white">{formatCurrency(inv.total_amount, data.settings.currency)}</span>{paid>0 && <div className="text-[11px] text-slate-400">Paid {formatCurrency(paid, data.settings.currency)}{bal>0 && ` · Owes ${formatCurrency(bal, data.settings.currency)}`}</div>}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap"><div className="flex flex-col items-center gap-1"><span className="text-xs font-bold border rounded-full px-2.5 py-1 backdrop-blur" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)', color: '#e2e8f0' }}>{s}</span>{pipe!==s && <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${pipelineBadgeClass(pipe).replace('bg-slate-','bg-white/10 text-slate-300 border-white/10')}`}>{pipe}</span>}{pipe==='Overdue' && <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${days>=14?'bg-red-500 text-white border-red-500':'bg-amber-500 text-white border-amber-500'}`}>{days} late</span>}</div></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end flex-wrap max-w-[300px]">
                          <button onClick={()=>downloadPDF(inv)} className="text-xs btn-neon rounded-full px-3 py-1 font-semibold">PDF</button>
                          <button onClick={()=>handleSend(inv)} className="text-xs glass rounded-full px-3 py-1 text-slate-300 border border-white/10 hover:text-white">Send</button>
                          <button onClick={()=>handleCopy(inv)} className="text-xs glass rounded-full px-3 py-1 text-slate-300 border border-white/10 hover:text-white">Copy</button>
                          {bal > 0 && <button onClick={()=>handleMarkPaid(inv)} className="text-xs bg-emerald-500 text-white rounded-full px-3 py-1 font-semibold hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.3)]">Paid</button>}
                          {bal > 0 && <button onClick={()=>{ setPayFor(payFor===inv.id?null:inv.id); setPayForm({ amount: bal.toFixed(2), date:new Date().toISOString().slice(0,10), note:'' }) }} className="text-xs glass rounded-full px-3 py-1 text-slate-300 border border-white/10 hover:text-white">+ Pay</button>}
                          {bal > 0 && <button onClick={()=>handleReminder(inv)} className="text-xs glass rounded-full px-3 py-1 text-slate-300 border border-white/10 hover:text-white">Nudge</button>}
                          <button onClick={()=>setExpandedId(isOpen?null:inv.id)} className="text-xs bg-white text-slate-900 rounded-full px-3 py-1 font-semibold hover:bg-slate-100">{isOpen?'Hide':'Details'}</button>
                          <button onClick={()=>startEdit(inv)} className="text-xs glass rounded-full px-3 py-1 text-slate-300 border border-white/10 hover:text-white">Edit</button>
                          <button onClick={async()=>{ if(confirm('Delete invoice?')){ try{ await deleteInvoice(inv.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-500/10 text-red-300 border border-red-500/15 rounded-full px-3 py-1 hover:bg-red-500/15">Delete</button>
                        </div>
                        {payFor===inv.id && (
                          <div className="mt-3 glass rounded-xl p-3 flex flex-wrap gap-2 items-end border border-white/10">
                            <div><Label htmlFor={`pay-amt-${inv.id}`}>Amount</Label><Input id={`pay-amt-${inv.id}`} type="number" min="0.01" max={bal} step="0.01" value={payForm.amount} onChange={e=>setPayForm({...payForm, amount:e.target.value})} className="!w-28 mt-1" /></div>
                            <div><Label htmlFor={`pay-date-${inv.id}`}>Date</Label><Input id={`pay-date-${inv.id}`} type="date" value={payForm.date} onChange={e=>setPayForm({...payForm, date:e.target.value})} className="!w-36 mt-1" /></div>
                            <div className="flex-1 min-w-[120px]"><Label htmlFor={`pay-note-${inv.id}`}>Note</Label><Input id={`pay-note-${inv.id}`} value={payForm.note} onChange={e=>setPayForm({...payForm, note:e.target.value})} placeholder="UPI / bank ref…" className="mt-1" /></div>
                            <button onClick={()=>handleRecordPayment(inv)} className="btn-neon rounded-xl px-4 py-2 text-xs font-bold">Save</button>
                            <button onClick={()=>setPayFor(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                          </div>
                        )}
                        {pays.length > 0 && (
                          <div className="mt-2 text-[11px] text-slate-400">
                            {pays.map(p=> <div key={p.id}>✓ {formatCurrency(p.amount, data.settings.currency)} on {p.date}{p.note ? ` · ${p.note}` : ''}</div>)}
                          </div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={inv.id + '-details'} className="">
                        <td colSpan={6} className="px-4 py-4" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="glass rounded-2xl p-4 border border-white/8">
                              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-3">Line items</div>
                              <ul className="text-sm space-y-2">
                                {(inv.line_items||[]).map((l,i)=>(
                                  <li key={i} className="flex justify-between gap-2 text-slate-300"><span className="truncate">{l.description} <span className="text-slate-500">× {l.quantity}</span></span><span className="font-medium whitespace-nowrap text-white">{formatCurrency(l.total ?? (l.quantity*l.rate), data.settings.currency)}</span></li>
                                ))}
                              </ul>
                              <div className="text-sm mt-3 pt-3 border-t border-white/10 space-y-1">
                                <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="text-slate-200">{formatCurrency(inv.subtotal ?? inv.total_amount, data.settings.currency)}</span></div>
                                <div className="flex justify-between text-slate-400"><span>{taxLabel(ttype, rate)}</span><span className="text-slate-200">{formatCurrency(inv.tax_amount ?? 0, data.settings.currency)}</span></div>
                                <div className="flex justify-between font-bold text-white"><span>Total</span><span style={{ fontFamily: 'Fraunces, serif', fontSize: '16px' }}>{formatCurrency(inv.total_amount, data.settings.currency)}</span></div>
                              </div>
                              <div className="mt-3 rounded-xl border border-amber-500/18 bg-amber-500/6 p-3">
                                <div className="text-[11px] font-bold tracking-widest uppercase text-amber-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" /> Revision Guard</div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="text-sm font-mono font-semibold bg-white text-slate-900 border border-amber-200 rounded-full px-2.5 py-1">Revisions Included: {inv.revisions_included ?? 2} | Used: {inv.revisions_used ?? 0}</span>
                                  <div className="flex gap-1">
                                    <button onClick={()=>handleRevisionUsed(inv,-1)} disabled={(inv.revisions_used??0)<=0} className="text-xs w-7 h-7 rounded-full border bg-white text-slate-900 hover:bg-amber-50 disabled:opacity-30">−</button>
                                    <button onClick={()=>handleRevisionUsed(inv, 1)} disabled={(inv.revisions_used??0)>=100} className="text-xs w-7 h-7 rounded-full bg-amber-500 text-white hover:bg-amber-600">＋</button>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5 font-light">{(inv.revisions_used??0) > (inv.revisions_included??2) ? <span className="text-red-300 font-medium">Over by {(inv.revisions_used??0)-(inv.revisions_included??2)} — billable</span> : `${Math.max(0,(inv.revisions_included??2)-(inv.revisions_used??0))} free remaining` } · on PDF as contract term</p>
                              </div>
                            </div>
                            <div className="glass rounded-2xl p-4 border border-white/8">
                              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-3">Invoice activity</div>
                              <ol className="relative border-l border-white/10 ml-1.5 space-y-3">
                                {activityFor(inv).map((ev,i)=>(
                                  <li key={ev.key + i} className="ml-4">
                                    <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-[#0f172a] shadow-[0_0_8px_rgba(6,182,214,0.5)]"></span>
                                    <div className="text-sm font-medium text-slate-200">{ev.label}</div>
                                    <div className="text-[11px] text-slate-500">{fmtDay(ev.date)} · {ev.date}</div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>}
        </Card>
      }
    </div>
  )
}

// — Luxury Paper Preview — Typography-first, massive whitespace, hairlines, Fraunces total
function LuxuryInvoicePreview({ inv, currency, business, client, onClose, onDownload, onSend, onMarkPaid, activity, fmtDay, badge }){
  const rate = Number(inv.tax_rate ?? 0)
  const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
  const sub = Number(inv.subtotal ?? (rate ? inv.total_amount / (1 + rate/100) : inv.total_amount))
  const tax = Number(inv.tax_amount ?? (sub * rate / 100))
  const paid = (Array.isArray(inv.payments) ? inv.payments : []).reduce((s,p)=> s + (Number(p.amount)||0), 0)
  const bal = Number(inv.total_amount) - paid
  const st = invoiceStatus(inv)
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/20 shadow-[0_24px_64px_rgba(2,6,23,0.55),0_0_40px_rgba(6,182,214,0.18)]">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,182,214,0.10), rgba(255,255,255,0.02))' }} aria-hidden />
      {/* top neon bar */}
      <div className="relative bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 h-[2px] w-full" />
      <div className="relative bg-cyan-500/10 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-white/8">
        <span className="text-sm font-bold tracking-tight text-cyan-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" /> Invoice {inv.invoice_number} created</span>
        <button onClick={onClose} className="text-xs glass rounded-full px-3 py-1 text-slate-300 hover:text-white border border-white/10">Dismiss ✕</button>
      </div>

      {/* — Paper — */}
      <div className="relative surface-paper p-8 md:p-12">
        {/* hairline brand */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400">Invoice</div>
            <div className="text-[28px] font-serif font-bold tracking-[-0.03em] text-slate-900 mt-1" style={{ fontFamily: 'Fraunces, serif' }}>INVOICE #{inv.invoice_number}</div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-slate-400 mt-2 font-medium">{business} <span className="text-slate-300">•</span> {new Date(inv.issue_date).toLocaleDateString('en-US',{month:'long', day:'numeric', year:'numeric'})}</div>
          </div>
          <div className="text-right">
            <span className={`inline-flex text-xs font-bold border rounded-full px-3 py-1 ${st==='Paid'?'bg-emerald-50 text-emerald-700 border-emerald-200': st==='Overdue'?'bg-red-50 text-red-700 border-red-200':'bg-slate-50 text-slate-700 border-slate-200'}`}>{st}</span>
            <div className="text-[11px] text-slate-500 mt-2">Due {inv.due_date}</div>
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">Bill to</div>
            <div className="h-px bg-slate-200 mt-2 mb-3" />
            <div className="font-semibold text-slate-900">{inv.client_name}</div>
            {client?.company && <div className="text-sm text-slate-600 mt-1">{client.company}</div>}
            {client?.email && <div className="text-sm text-slate-600">{client.email}</div>}
            {client?.billing_address && <div className="text-sm text-slate-600">{client.billing_address}</div>}
          </div>
          <div className="text-right md:text-left md:ml-auto">
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400">From</div>
            <div className="h-px bg-slate-200 mt-2 mb-3" />
            <div className="font-semibold text-slate-900">{business}</div>
            <div className="text-sm text-slate-500">Post-production • Studio grade</div>
          </div>
        </div>

        {/* — Table — thin hairlines, massive whitespace */}
        <div className="mt-10 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                <th className="text-left px-6 py-3 font-semibold">Service</th>
                <th className="text-center px-4 py-3 font-semibold">Qty</th>
                <th className="text-right px-4 py-3 font-semibold">Rate</th>
                <th className="text-right px-6 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(inv.line_items||[]).map((l,i)=>(
                <tr key={i} className="hover:bg-slate-50/40 transition">
                  <td className="px-6 py-4 text-slate-900">{l.description}</td>
                  <td className="px-4 py-4 text-center text-slate-600">{l.quantity}</td>
                  <td className="px-4 py-4 text-right text-slate-600">{formatCurrency(l.rate, currency)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(l.total ?? (l.quantity*l.rate), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* — Totals — hero serif */}
        <div className="mt-6 max-w-[360px] ml-auto space-y-3">
          <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="text-slate-700">{formatCurrency(sub, currency)}</span></div>
          <div className="flex justify-between text-sm text-slate-500"><span>{taxLabel(ttype, rate)}</span><span className="text-slate-700">{formatCurrency(tax, currency)}</span></div>
          <div className="h-px bg-slate-900 mt-2" />
          <div className="flex justify-between items-baseline pt-2">
            <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500">Total Due</span>
            <span className="font-serif font-bold text-slate-900" style={{ fontFamily: 'Fraunces, serif', fontSize: '32px', lineHeight: 1, letterSpacing: '-0.03em' }}>{formatCurrency(inv.total_amount, currency)}</span>
          </div>
          {paid > 0 && <div className="flex justify-between text-sm text-emerald-700 pt-2 border-t border-slate-100"><span>Paid</span><span className="font-semibold">{formatCurrency(paid, currency)}</span></div>}
          {bal > 0 && paid > 0 && <div className="flex justify-between text-sm text-amber-700 font-medium"><span>Still owed</span><span>{formatCurrency(bal, currency)}</span></div>}
        </div>

        {/* — Milestone — thin card */}
        <div className="mt-8 border border-amber-200 bg-amber-50/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-amber-700">Project Milestone</div>
            <div className="text-xs text-slate-600 mt-0.5">Revision Guard — contract term on PDF</div>
          </div>
          <span className="font-mono text-xs font-bold bg-white border border-amber-200 rounded-full px-3 py-1.5 whitespace-nowrap text-slate-800">Revisions Included: {inv.revisions_included ?? 2} | Used: {inv.revisions_used ?? 0}</span>
        </div>
        { (inv.revisions_used ?? 0) > (inv.revisions_included ?? 2) && <p className="text-[11px] text-red-600 mt-2 text-right font-medium">Over by {(inv.revisions_used ?? 0)-(inv.revisions_included ?? 2)} — extra revisions billable</p>}

        {/* actions */}
        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-slate-200">
          <button onClick={onDownload} className="bg-slate-900 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-black shadow">Download PDF</button>
          <button onClick={onSend} className="bg-white border border-slate-200 text-slate-900 rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-slate-50">Send</button>
          {bal > 0
            ? <button onClick={onMarkPaid} className="bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-emerald-700 shadow-[0_0_16px_rgba(16,185,129,0.3)]">Mark as paid</button>
            : <span className="inline-flex items-center text-sm font-semibold text-emerald-700">✓ Paid</span>}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-3">Invoice activity</div>
          <ol className="relative border-l border-slate-200 ml-1.5 space-y-3">
            {activity.map((ev,i)=>(
              <li key={ev.key + i} className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow"></span>
                <div className="text-sm font-medium text-slate-800">{ev.label}</div>
                <div className="text-[11px] text-slate-500">{fmtDay(ev.date)} · {ev.date}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 text-center text-[11px] tracking-wide text-slate-400 border-t border-slate-100 pt-4">
          Thank you for your business • Generated by ClearBooks — Studio grade
        </div>
      </div>
    </div>
  )
}
