import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Label, Empty } from '../components/UI'
import { formatCurrency } from '../utils/helpers'
import { amountPaid, amountOutstanding } from '../utils/payments'

const emptyForm = { name:'', email:'', company:'', phone:'', billing_address:'', gstin:'', notes:'' }

export default function ClientsPage(){
  const { data, addClient, updateClient, deleteClient } = useData()
  const [form,setForm]=useState(emptyForm)
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [search,setSearch]=useState('')

  const visibleClients = data.clients.filter(c=>{
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (c.name||'').toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q)
  })
  const [expanded,setExpanded]=useState(null)

  // Per-client totals from invoices
  const stats = useMemo(()=>{
    const map = {}
    data.clients.forEach(c=> { map[c.id] = { billed: 0, paid: 0, outstanding: 0, invoices: [], lastPayment: null } })
    data.invoices.forEach(inv=>{
      const key = inv.client_id
      if (!key || !map[key]) return
      const paid = amountPaid(inv)
      const bal = amountOutstanding(inv)
      map[key].billed += Number(inv.total_amount) || 0
      map[key].paid += paid
      map[key].outstanding += bal
      map[key].invoices.push(inv)
      ;(Array.isArray(inv.payments) ? inv.payments : []).forEach(p=>{
        if (!map[key].lastPayment || p.date > map[key].lastPayment) map[key].lastPayment = p.date
      })
    })
    Object.values(map).forEach(s=> s.invoices.sort((a,b)=> b.issue_date.localeCompare(a.issue_date)))
    return map
  }, [data.clients, data.invoices])

  const submit=async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    if(!form.name.trim() || form.name.trim().length <2){ setErr('Name is required (min 2 chars)'); return }
    if(form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){ setErr('Invalid email format'); return }
    try{
      if(editing) await updateClient(editing, form)
      else await addClient(form)
      setInfo(editing ? 'Client updated!' : 'Client added!')
      setForm(emptyForm); setEditing(null)
      setTimeout(()=> setInfo(''), 2000)
    }catch(ex){ setErr(ex.message) }
  }
  const startEdit=(c)=>{ setEditing(c.id); setForm({ name:c.name||'', email:c.email||'', company:c.company||'', phone:c.phone||'', billing_address:c.billing_address||'', gstin:c.gstin||'', notes:c.notes||''}); setErr(''); window.scrollTo({top:0,behavior:'smooth'}) }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Clients</h1><p className="text-sm text-gray-500">Billing details, totals, and invoice history per client.</p></div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{editing?'Edit client':'Add client'}</h2>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-4">
          <div><Label htmlFor="client-name">Name *</Label><Input id="client-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Acme Studio" minLength={2} /></div>
          <div><Label htmlFor="client-company">Company</Label><Input id="client-company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Acme Studio Pvt Ltd" /></div>
          <div><Label htmlFor="client-email">Email</Label><Input id="client-email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="accounts@acme.co" /></div>
          <div><Label htmlFor="client-phone">Phone (optional)</Label><Input id="client-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210" /></div>
          <div><Label htmlFor="client-gstin">GSTIN (if relevant)</Label><Input id="client-gstin" value={form.gstin} onChange={e=>setForm({...form,gstin:e.target.value})} placeholder="27ABCDE1234F1Z5" /></div>
          <div><Label htmlFor="client-address">Billing address</Label><Input id="client-address" value={form.billing_address} onChange={e=>setForm({...form,billing_address:e.target.value})} placeholder="Street, City, PIN" /></div>
          <div className="md:col-span-3"><Label htmlFor="client-notes">Notes</Label><Input id="client-notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Retainer, Net 15…" /></div>
          {err && <div className="md:col-span-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="md:col-span-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="md:col-span-3 flex gap-2">
            <Button type="submit">{editing?'Update':'Add client'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm(emptyForm); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.clients.length===0 ? <Empty variant="client" title="Your roster, beautifully organized" desc="Add your first client to see the magic — billing details, outstanding totals and invoice history, all in one premium view." action={<Button onClick={()=> document.getElementById('client-name')?.focus()}>Add your first client →</Button>} /> :
        <>
        {data.clients.length > 1 && (
          <div className="flex gap-2 items-center">
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" className="max-w-xs" />
            {search && <span className="text-xs text-gray-500">{visibleClients.length} of {data.clients.length}</span>}
          </div>
        )}
        {visibleClients.length===0 ? <p className="text-sm text-gray-500">No clients match your search.</p> :
        <div className="grid md:grid-cols-2 gap-4">
          {visibleClients.map(c=>{
            const s = stats[c.id] || { billed: 0, paid: 0, outstanding: 0, invoices: [], lastPayment: null }
            const open = expanded === c.id
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.company || c.name}</div>
                    {c.company && <div className="text-xs text-gray-500">{c.name}</div>}
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      {c.gstin && <div className="font-mono">GSTIN: {c.gstin}</div>}
                      {c.billing_address && <div className="truncate">{c.billing_address}</div>}
                    </div>
                  </div>
                  {s.outstanding > 0
                    ? <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-1 shrink-0">Owes {formatCurrency(s.outstanding, data.settings.currency)}</span>
                    : s.billed > 0 && <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-1 shrink-0">Clear</span>}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2"><div className="text-[10px] uppercase tracking-wide text-gray-500">Invoiced</div><div className="text-sm font-bold">{formatCurrency(s.billed, data.settings.currency)}</div></div>
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2"><div className="text-[10px] uppercase tracking-wide text-emerald-700">Paid</div><div className="text-sm font-bold text-emerald-700">{formatCurrency(s.paid, data.settings.currency)}</div></div>
                  <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2"><div className="text-[10px] uppercase tracking-wide text-amber-700">Owes</div><div className="text-sm font-bold text-amber-700">{formatCurrency(s.outstanding, data.settings.currency)}</div></div>
                </div>
                {s.lastPayment && <div className="text-[11px] text-gray-400 mt-2">Last payment: {s.lastPayment}</div>}
                {c.notes && <div className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-100 rounded-xl p-2.5">{c.notes}</div>}

                {s.invoices.length > 0 && (
                  <button onClick={()=>setExpanded(open?null:c.id)} className="text-xs font-semibold text-teal-700 hover:underline mt-3">
                    {open ? 'Hide invoices ▲' : `View ${s.invoices.length} invoice${s.invoices.length===1?'':'s'} ▼`}
                  </button>
                )}
                {open && (
                  <ul className="mt-2 divide-y divide-gray-100 border-t border-gray-100">
                    {s.invoices.map(inv=>{
                      const paid = amountPaid(inv)
                      const bal = amountOutstanding(inv)
                      return (
                        <li key={inv.id} className="py-2 flex items-center justify-between text-xs gap-2">
                          <span><span className="font-mono font-semibold">{inv.invoice_number}</span> <span className="text-gray-400">· {inv.issue_date}</span></span>
                          <span className={`font-bold border rounded-full px-2 py-0.5 ${bal<=0?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {bal<=0 ? 'Paid' : `Owes ${formatCurrency(bal, data.settings.currency)}`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  <Link to="/invoices" className="text-xs bg-teal-700 text-white rounded-full px-3 py-1.5 font-medium">+ Invoice</Link>
                  <button onClick={()=>startEdit(c)} className="text-xs border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50">Edit</button>
                  <button onClick={async()=>{ if(confirm('Delete this client? Invoices keep their saved client name.')){ try{ await deleteClient(c.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1.5">Delete</button>
                </div>
              </Card>
            )
          })}
        </div>}
        </>
      }
    </div>
  )
}
