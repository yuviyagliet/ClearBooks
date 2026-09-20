import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Select, Label, Empty } from '../components/UI'
import { formatCurrency } from '../utils/helpers'
import jsPDF from 'jspdf'

export default function InvoicesPage(){
  const { data, addInvoice, updateInvoice, deleteInvoice, addClient } = useData()
  const [form,setForm]=useState({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', line_items:[{description:'', quantity:1, rate:0}]})
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [newClientName,setNewClientName]=useState('')
  const [showNewClient,setShowNewClient]=useState(false)

  const total = useMemo(()=> form.line_items.reduce((s,l)=> s + (Number(l.quantity)||0)*(Number(l.rate)||0),0), [form.line_items])
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
    const client = data.clients.find(c=>c.id===form.client_id)
    const payload = {
      client_id: form.client_id||null,
      client_name: client?.name||'—',
      issue_date: form.issue_date,
      due_date: form.due_date,
      status: form.status,
      line_items: form.line_items.map(l=> ({...l, description:l.description.trim(), quantity: Number(l.quantity), rate: Number(l.rate), total: (Number(l.quantity)||0)*(Number(l.rate)||0)})),
      total_amount: total,
    }
    try{
      if(editing) await updateInvoice(editing, payload)
      else await addInvoice(payload)
      setInfo(editing ? 'Invoice updated!' : `Invoice created! ${payload.invoice_number||''}`)
      setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', line_items:[{description:'', quantity:1, rate:0}]}); setEditing(null)
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
    setEditing(inv.id); setForm({ client_id:inv.client_id||'', issue_date:inv.issue_date, due_date:inv.due_date, status:inv.status, line_items: inv.line_items?.length? inv.line_items: [{description:'',quantity:1,rate:0}]})
    setErr(''); window.scrollTo({top:0,behavior:'smooth'})
  }

  const getStatus = (inv)=>{
    if(inv.status==='Paid') return 'Paid'
    const overdue = new Date(inv.due_date) < new Date(new Date().toISOString().slice(0,10)) && inv.status!=='Paid'
    return overdue? 'Overdue': inv.status
  }
  const badge=(s)=>{
    const m={ Paid:'bg-emerald-50 text-emerald-700 border-emerald-200', Unpaid:'bg-amber-50 text-amber-700 border-amber-200', Overdue:'bg-red-50 text-red-700 border-red-200' }
    return <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${m[s]||'bg-gray-50'}`}>{s}</span>
  }

  const downloadPDF=(inv)=>{
    const doc = new jsPDF()
    const business = data.settings.business_name || data.settings.name || 'ClearBooks'
    const currency = data.settings.currency || '$'
    doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.text(business, 14, 20)
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('Invoice', 14, 28)
    doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.text(inv.invoice_number, 150, 20)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text(`Issue: ${inv.issue_date}`, 150, 28)
    doc.text(`Due: ${inv.due_date}`, 150, 33)
    doc.text(`Status: ${getStatus(inv)}`, 150, 38)
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
    y+=8; doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(`Total: ${currency}${Number(inv.total_amount).toFixed(2)}`, 150, y)
    y+=10; doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(120); doc.text('Thank you for your business!', 14, y)
    doc.text('Generated by ClearBooks', 14, y+5)
    doc.save(`${inv.invoice_number}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-gray-500">Create, track, and export clean PDFs.</p></div>

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
          <div className="max-w-xs"><Label>Status</Label><Select value={form.status} onChange={e=>setForm({...form, status:e.target.value})}><option>Unpaid</option><option>Paid</option><option>Overdue</option></Select></div>

          <div>
            <div className="flex items-center justify-between mb-2"><Label>Line items *</Label><Button type="button" variant="ghost" onClick={addLine} className="text-xs py-1.5">＋ Add line</Button></div>
            <div className="space-y-2">
              {form.line_items.map((l,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="col-span-12 md:col-span-6"><Label htmlFor={`invoice-desc-${i}`}>Description *</Label><Input id={`invoice-desc-${i}`} value={l.description} onChange={e=>updateLine(i,{description:e.target.value})} placeholder="Web design" required minLength={2} /></div>
                  <div className="col-span-4 md:col-span-2"><Label htmlFor={`invoice-qty-${i}`}>Qty *</Label><Input id={`invoice-qty-${i}`} type="number" min="1" step="1" value={l.quantity} onChange={e=>updateLine(i,{quantity:e.target.value})} required /></div>
                  <div className="col-span-4 md:col-span-2"><Label htmlFor={`invoice-rate-${i}`}>Rate ({data.settings.currency}) *</Label><Input id={`invoice-rate-${i}`} type="number" min="0.01" step="0.01" value={l.rate} onChange={e=>updateLine(i,{rate:e.target.value})} required /></div>
                  <div className="col-span-3 md:col-span-1 text-sm font-semibold text-right">{formatCurrency((Number(l.quantity)||0)*(Number(l.rate)||0), data.settings.currency)}</div>
                  <div className="col-span-1 flex justify-end"><button type="button" onClick={()=>removeLine(i)} className="text-xs text-red-600 hover:underline" disabled={form.line_items.length===1}>✕</button></div>
                </div>
              ))}
            </div>
            <div className="text-right font-bold mt-3 text-lg">Total: {formatCurrency(total, data.settings.currency)}</div>
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}

          <div className="flex gap-2">
            <Button type="submit">{editing?'Update invoice':'Create invoice'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm({ client_id:'', issue_date:new Date().toISOString().slice(0,10), due_date:new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), status:'Unpaid', line_items:[{description:'', quantity:1, rate:0}]}); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.invoices.length===0 ? <Empty title="No invoices yet" desc="Create your first invoice — it auto-numbers and exports to PDF." /> :
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="text-left px-4 py-3">Number</th><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Dates</th><th className="text-right px-4 py-3">Total</th><th className="text-center px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {[...data.invoices].sort((a,b)=> b.invoice_number.localeCompare(a.invoice_number)).map(inv=>{
                  const s=getStatus(inv)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{inv.client_name}</td>
                      <td className="px-4 py-3 text-xs leading-tight">{inv.issue_date} → {inv.due_date}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total_amount, data.settings.currency)}</td>
                      <td className="px-4 py-3 text-center">{badge(s)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button onClick={()=>downloadPDF(inv)} className="text-xs bg-teal-700 text-white rounded-full px-3 py-1">PDF</button>
                          <button onClick={()=>startEdit(inv)} className="text-xs border border-gray-200 rounded-full px-3 py-1">Edit</button>
                          <Select value={inv.status} onChange={async e=>{ try{ await updateInvoice(inv.id,{status:e.target.value})}catch(ex){ alert(ex.message)}} } className="text-xs py-1 px-2 w-auto">
                            <option>Unpaid</option><option>Paid</option><option>Overdue</option>
                          </Select>
                          <button onClick={async()=>{ if(confirm('Delete invoice?')){ try{ await deleteInvoice(inv.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>
  )
}
