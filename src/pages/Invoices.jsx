import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Select, Label, Empty } from '../components/UI'
import { formatCurrency, TAX_TYPES, taxLabel } from '../utils/helpers'
import { getPayments, amountPaid, amountOutstanding, invoiceStatus, statusBadgeClass, outstandingSummary } from '../utils/payments'
import jsPDF from 'jspdf'

export default function InvoicesPage(){
  const { data, addInvoice, updateInvoice, deleteInvoice, recordPayment, markPaid, markSent, addClient } = useData()
  const [form,setForm]=useState({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}]})
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [newClientName,setNewClientName]=useState('')
  const [showNewClient,setShowNewClient]=useState(false)
  const [payFor,setPayFor]=useState(null) // invoice id with payment form open
  const [payForm,setPayForm]=useState({ amount:'', date:new Date().toISOString().slice(0,10), note:'' })
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('All')

  const visibleInvoices = useMemo(()=>{
    const q = search.trim().toLowerCase()
    return [...data.invoices]
      .filter(inv=>{
        if (statusFilter !== 'All' && invoiceStatus(inv) !== statusFilter && !(statusFilter==='Overdue' && invoiceStatus(inv)==='Overdue (partial)')) return false
        if (!q) return true
        return (inv.invoice_number||'').toLowerCase().includes(q) || (inv.client_name||'').toLowerCase().includes(q)
      })
      .sort((a,b)=> b.invoice_number.localeCompare(a.invoice_number))
  }, [data.invoices, search, statusFilter])

  // Keep tax defaults in sync with settings for new invoices (not when editing)
  useEffect(()=>{
    if (!editing) setForm(f=> ({ ...f, tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0 }))
  }, [data.settings.default_tax_rate, data.settings.default_tax_type, editing])
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
    const client = data.clients.find(c=>c.id===form.client_id)
    const payload = {
      client_id: form.client_id||null,
      client_name: client?.name||'—',
      issue_date: form.issue_date,
      due_date: form.due_date,
      status: form.status,
      tax_type: form.tax_type || 'none',
      tax_rate: tax_rate_num,
      subtotal,
      tax_amount,
      line_items: form.line_items.map(l=> ({...l, description:l.description.trim(), quantity: Number(l.quantity), rate: Number(l.rate), total: (Number(l.quantity)||0)*(Number(l.rate)||0)})),
      total_amount: total,
    }
    try{
      if(editing) await updateInvoice(editing, payload)
      else await addInvoice(payload)
      setInfo(editing ? 'Invoice updated!' : `Invoice created! ${payload.invoice_number||''}`)
      setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}]}); setEditing(null)
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
    setEditing(inv.id); setForm({ client_id:inv.client_id||'', issue_date:inv.issue_date, due_date:inv.due_date, status:inv.status === 'Paid' ? 'Paid' : 'Unpaid', tax_type: inv.tax_type || (inv.tax_rate > 0 ? 'custom' : 'none'), tax_rate: inv.tax_rate ?? 0, line_items: inv.line_items?.length? inv.line_items: [{description:'',quantity:1,rate:0}]})
    setErr(''); window.scrollTo({top:0,behavior:'smooth'})
  }

  const badge=(s)=> <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${statusBadgeClass(s)}`}>{s}</span>

  // --- Payment workflow actions ---
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
    const bal = amountOutstanding(inv)
    const text = `Hi ${inv.client_name}, friendly reminder: invoice ${inv.invoice_number} for ${formatCurrency(bal, data.settings.currency)} was due ${inv.due_date}. Please let me know when paid. Thanks!`
    try{
      await navigator.clipboard.writeText(text)
      setInfo('Reminder text copied — paste it to your client')
      setTimeout(()=> setInfo(''), 2500)
    }catch{ alert(text) }
  }

  const downloadPDF=(inv)=>{
    const doc = new jsPDF()
    const business = data.settings.business_name || data.settings.name || 'ClearBooks'
    const currency = data.settings.currency || '$'
    const st = invoiceStatus(inv)
    const paid = amountPaid(inv)
    const bal = amountOutstanding(inv)
    doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.text(business, 14, 20)
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('Invoice', 14, 28)
    doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.text(inv.invoice_number, 150, 20)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text(`Issue: ${inv.issue_date}`, 150, 28)
    doc.text(`Due: ${inv.due_date}`, 150, 33)
    doc.text(`Status: ${st}`, 150, 38)
    if (inv.payment_date) doc.text(`Paid: ${inv.payment_date}`, 150, 43)
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.text('Bill to:', 14, 42)
    doc.setFont('helvetica','normal'); doc.text(inv.client_name||'—', 14, 48)
    const clientObj = data.clients.find(c=>c.id===inv.client_id)
    if(clientObj?.email) doc.text(clientObj.email, 14, 53)
    let y=64
    doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('Description', 14, y); doc.text('Qty', 110, y); doc.text('Rate', 130, y); doc.text('Total', 170, y)
    doc.line(14,y+2,196,y+2)
    y+=8
    doc.setFont('helvetica','normal')
    inv.line_items?.forEach(l=>{
      if(y>270){ doc.addPage(); y=20}
      doc.text(String(l.description||'').slice(0,45), 14, y)
      doc.text(String(l.quantity), 110, y)
      doc.text(currency+Number(l.rate).toFixed(2), 130, y)
      doc.text(currency+Number(l.total ?? (l.quantity*l.rate)).toFixed(2), 170, y)
      y+=6
    })
    y+=4; doc.line(14,y,196,y)
    y+=8; doc.setFont('helvetica','normal'); doc.setFontSize(10)
    const rate = Number(inv.tax_rate ?? 0)
    const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
    const grand = Number(inv.total_amount)
    const sub = Number(inv.subtotal ?? (rate ? grand / (1 + rate/100) : grand))
    const tax = Number(inv.tax_amount ?? (sub * rate / 100))
    doc.text(`Subtotal: ${currency}${sub.toFixed(2)}`, 150, y)
    y+=6; doc.text(`${taxLabel(ttype, rate)}: ${currency}${tax.toFixed(2)}`, 150, y)
    y+=6; doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(`Total: ${currency}${grand.toFixed(2)}`, 150, y)
    if (paid > 0) { y+=6; doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text(`Paid: ${currency}${paid.toFixed(2)}`, 150, y) }
    if (bal > 0 && paid > 0) { y+=6; doc.text(`Still owed: ${currency}${bal.toFixed(2)}`, 150, y) }
    y+=10; doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(120); doc.text('Thank you for your business!', 14, y)
    doc.text('Generated by ClearBooks', 14, y+5)
    doc.save(`${inv.invoice_number}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-gray-500">Create → Send → Track → Paid.</p></div>

      {/* Outstanding summary */}
      {data.invoices.length > 0 && (
        <Card className="p-5 bg-amber-50/40 border-amber-200">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide font-bold text-amber-700">Still owed to you</div>
              <div className="text-2xl font-bold">{formatCurrency(outstanding.outstanding, data.settings.currency)}</div>
              <div className="text-xs text-gray-500 mt-1">from {outstanding.openCount} open invoice{outstanding.openCount===1?'':'s'}{outstanding.overdue>0 && <span className="text-red-600 font-medium"> · {formatCurrency(outstanding.overdue, data.settings.currency)} overdue</span>}</div>
            </div>
            <Link to="/reports" className="text-xs bg-white border border-gray-200 rounded-full px-4 py-2 font-medium hover:bg-gray-50">See reports →</Link>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{editing?'Edit invoice':'Create invoice'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoice-client">Client *</Label>
              <div className="flex gap-2">
                <Select id="invoice-client" value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}><option value="">Select client</option>{data.clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                <Button type="button" variant="ghost" onClick={()=>setShowNewClient(v=>!v)} className="px-2.5">＋</Button>
              </div>
              {showNewClient && <div className="flex gap-2 mt-2"><Input id="invoice-new-client" placeholder="New client name (min 2 chars)" value={newClientName} onChange={e=>setNewClientName(e.target.value)} /><Button type="button" onClick={handleAddClient} className="text-xs">Add</Button></div>}
              {data.clients.length===0 && !showNewClient && <p className="text-xs text-amber-600 mt-1">No clients yet — click ＋ to add one, or go to Clients page.</p>}
            </div>
            <div><Label htmlFor="invoice-issue">Issue date *</Label><Input id="invoice-issue" type="date" value={form.issue_date} onChange={e=>setForm({...form, issue_date:e.target.value})} required /></div>
            <div><Label htmlFor="invoice-due">Due date *</Label><Input id="invoice-due" type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} required /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-2xl">
            <div><Label htmlFor="invoice-status">Status</Label><Select id="invoice-status" value={form.status} onChange={e=>setForm({...form, status:e.target.value})}><option>Unpaid</option><option>Paid</option><option>Overdue</option></Select></div>
            <div><Label htmlFor="invoice-tax-type">Tax</Label><Select id="invoice-tax-type" value={form.tax_type} onChange={e=>setForm({...form, tax_type: e.target.value})}><option value="none">No tax</option><option value="gst">GST</option><option value="vat">VAT</option><option value="custom">Custom</option><option value="exempt">Tax exempt</option></Select></div>
            <div><Label htmlFor="invoice-tax">Rate (%) *</Label><Input id="invoice-tax" type="number" min="0" max="100" step="0.01" value={form.tax_type==='none'||form.tax_type==='exempt' ? 0 : form.tax_rate} onChange={e=>setForm({...form, tax_rate: e.target.value})} required disabled={form.tax_type==='none'||form.tax_type==='exempt'} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">Tax type and rate are snapshotted per invoice — changing defaults later won’t affect this invoice. Rules vary by country; pick what applies.</p>

          <div>
            <div className="flex items-center justify-between mb-2"><Label>Line items *</Label><Button type="button" variant="ghost" onClick={addLine} className="text-xs py-1.5">＋ Add line</Button></div>
            <div className="space-y-2">
              {form.line_items.map((l,i)=>(
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="col-span-1 md:col-span-6"><Label htmlFor={`invoice-desc-${i}`}>Description *</Label><Input id={`invoice-desc-${i}`} value={l.description} onChange={e=>updateLine(i,{description:e.target.value})} placeholder="Color grading — project name" required minLength={2} /></div>
                  <div className="col-span-1 md:col-span-2"><Label htmlFor={`invoice-qty-${i}`}>Qty *</Label><Input id={`invoice-qty-${i}`} type="number" min="1" step="1" value={l.quantity} onChange={e=>updateLine(i,{quantity:e.target.value})} required /></div>
                  <div className="col-span-1 md:col-span-2"><Label htmlFor={`invoice-rate-${i}`}>Rate ({data.settings.currency}) *</Label><Input id={`invoice-rate-${i}`} type="number" min="0.01" step="0.01" value={l.rate} onChange={e=>updateLine(i,{rate:e.target.value})} required /></div>
                  <div className="col-span-1 md:col-span-1 flex md:block justify-between items-center"><span className="text-xs text-gray-500 md:hidden">Total</span><span className="text-sm font-semibold">{formatCurrency((Number(l.quantity)||0)*(Number(l.rate)||0), data.settings.currency)}</span><button type="button" onClick={()=>removeLine(i)} className="ml-3 text-xs text-red-600 hover:underline md:hidden" disabled={form.line_items.length===1}>Remove</button></div>
                  <div className="hidden md:flex col-span-1 justify-end"><button type="button" onClick={()=>removeLine(i)} className="text-xs text-red-600 hover:underline" disabled={form.line_items.length===1}>✕</button></div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal, data.settings.currency)}</span></div>
              <div className="flex justify-between"><span>{taxLabel(form.tax_type, tax_rate_num)}</span><span>{formatCurrency(tax_amount, data.settings.currency)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total</span><span>{formatCurrency(total, data.settings.currency)}</span></div>
              <p className="text-[11px] text-gray-400">Tax type and rate are snapshotted — yearly reports use each invoice’s own values.</p>
            </div>
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}

          <div className="flex gap-2">
            <Button type="submit">{editing?'Update invoice':'Create invoice'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', tax_type: data.settings.default_tax_type || 'none', tax_rate: data.settings.default_tax_rate ?? 0, line_items:[{description:'', quantity:1, rate:0}]}); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.invoices.length===0 ? <Empty title="No invoices yet" desc="Create your first invoice — it auto-numbers and exports to PDF." /> :
        <Card className="overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search number or client…" className="!w-56" />
            <Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="!w-auto text-sm">
              <option>All</option><option>Unpaid</option><option>Sent</option><option>Due soon</option><option>Partial</option><option>Overdue</option><option>Paid</option>
            </Select>
            {(search || statusFilter!=='All') && <span className="text-xs text-gray-500 self-center">{visibleInvoices.length} of {data.invoices.length}</span>}
          </div>
          {visibleInvoices.length===0 ? <p className="text-sm text-gray-500 p-6 text-center">No invoices match your search.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="text-left px-4 py-3">Number</th><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Dates</th><th className="text-right px-4 py-3">Paid / Total</th><th className="text-center px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {visibleInvoices.map(inv=>{
                  const s = invoiceStatus(inv)
                  const paid = amountPaid(inv)
                  const bal = amountOutstanding(inv)
                  const pays = getPayments(inv)
                  const rate = Number(inv.tax_rate ?? 0)
                  const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 align-top">
                      <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">{inv.invoice_number}{inv.sent_at && <div className="text-[10px] text-gray-400 font-normal">Sent</div>}</td>
                      <td className="px-4 py-3">{inv.client_name}</td>
                      <td className="px-4 py-3 text-xs leading-tight whitespace-nowrap">{inv.issue_date} → {inv.due_date}{inv.payment_date && <div className="text-emerald-600">Paid {inv.payment_date}</div>}<div className="text-gray-400">{taxLabel(ttype, rate)}</div></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap"><span className="font-semibold">{formatCurrency(inv.total_amount, data.settings.currency)}</span>{paid>0 && <div className="text-[11px] text-gray-500">Paid {formatCurrency(paid, data.settings.currency)}{bal>0 && ` · Owes ${formatCurrency(bal, data.settings.currency)}`}</div>}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">{badge(s)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end flex-wrap max-w-[280px]">
                          <button onClick={()=>downloadPDF(inv)} className="text-xs bg-teal-700 text-white rounded-full px-3 py-1">PDF</button>
                          <button onClick={()=>handleSend(inv)} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">Send</button>
                          <button onClick={()=>handleCopy(inv)} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">Copy</button>
                          {bal > 0 && <button onClick={()=>handleMarkPaid(inv)} className="text-xs bg-emerald-600 text-white rounded-full px-3 py-1 hover:bg-emerald-700">Mark as Paid</button>}
                          {bal > 0 && <button onClick={()=>{ setPayFor(payFor===inv.id?null:inv.id); setPayForm({ amount: bal.toFixed(2), date:new Date().toISOString().slice(0,10), note:'' }) }} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">+ Payment</button>}
                          {bal > 0 && <button onClick={()=>handleReminder(inv)} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">Remind</button>}
                          <button onClick={()=>startEdit(inv)} className="text-xs border border-gray-200 rounded-full px-3 py-1">Edit</button>
                          <button onClick={async()=>{ if(confirm('Delete invoice?')){ try{ await deleteInvoice(inv.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">Delete</button>
                        </div>
                        {payFor===inv.id && (
                          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-end">
                            <div><Label htmlFor={`pay-amt-${inv.id}`}>Amount</Label><Input id={`pay-amt-${inv.id}`} type="number" min="0.01" max={bal} step="0.01" value={payForm.amount} onChange={e=>setPayForm({...payForm, amount:e.target.value})} className="!w-28" /></div>
                            <div><Label htmlFor={`pay-date-${inv.id}`}>Date</Label><Input id={`pay-date-${inv.id}`} type="date" value={payForm.date} onChange={e=>setPayForm({...payForm, date:e.target.value})} className="!w-36" /></div>
                            <div className="flex-1 min-w-[120px]"><Label htmlFor={`pay-note-${inv.id}`}>Note</Label><Input id={`pay-note-${inv.id}`} value={payForm.note} onChange={e=>setPayForm({...payForm, note:e.target.value})} placeholder="UPI / bank ref…" /></div>
                            <Button onClick={()=>handleRecordPayment(inv)} className="!py-2 text-xs">Save</Button>
                            <button onClick={()=>setPayFor(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        )}
                        {pays.length > 0 && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {pays.map(p=> <div key={p.id}>✓ {formatCurrency(p.amount, data.settings.currency)} on {p.date}{p.note ? ` · ${p.note}` : ''}</div>)}
                          </div>
                        )}
                      </td>
                    </tr>
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
