import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Select, Label, Empty } from '../components/UI'
import { formatCurrency } from '../utils/helpers'

export default function IncomePage(){
  const { data, addIncome, updateIncome, deleteIncome, addClient } = useData()
  const [searchParams] = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'first_signup'
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), client_id:'', amount:'', description:'' })
  const [editing, setEditing] = useState(null)
  const [newClientName, setNewClientName] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')

  useEffect(()=>{
    if (isOnboarding) {
      // focus amount field for onboarding
      setTimeout(()=> document.getElementById('income-amount')?.focus(), 300)
    }
  },[isOnboarding])

  const submit = async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    if(!form.date){ setErr('Date is required'); return }
    const amt = Number(form.amount)
    if(!form.amount || isNaN(amt) || amt <=0){ setErr('Amount must be a positive number'); return }
    if(!form.description.trim() || form.description.trim().length <2){ setErr('Description is required (min 2 chars)'); return }
    const client = data.clients.find(c=>c.id===form.client_id)
    const payload = { date:form.date, client_id:form.client_id||null, client_name: client?.name||'—', amount: amt, description: form.description.trim() }
    try{
      if(editing) await updateIncome(editing, payload)
      else await addIncome(payload)
      setInfo(editing ? 'Income updated!' : 'Income added!')
      setForm({ date:new Date().toISOString().slice(0,10), client_id:'', amount:'', description:'' }); setEditing(null)
      setTimeout(()=> setInfo(''), 2000)
    }catch(ex){ setErr(ex.message || 'Failed to save') }
  }
  const startEdit=(item)=>{
    setEditing(item.id); setForm({ date:item.date, client_id:item.client_id||'', amount:String(item.amount), description:item.description||'' })
    window.scrollTo({top:0, behavior:'smooth'})
  }

  const handleAddClient = async()=>{
    if(!newClientName.trim() || newClientName.trim().length <2){ setErr('Client name min 2 chars'); return }
    try{
      const res = await addClient({ name:newClientName.trim(), email:'', notes:'' })
      setNewClientName(''); setShowNewClient(false)
      const id = res?.id || res
      if(id) setForm(f=>({...f, client_id:id}))
      setErr('')
    }catch(ex){ setErr(ex.message) }
  }

  return (
    <div className="space-y-6">
      {isOnboarding && (
        <div className="bg-teal-700 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base">Welcome to ClearBooks! Let’s add your first income.</h2>
            <p className="text-teal-100 text-sm mt-1">This is the Add income form — fill it and your dashboard checklist will update.</p>
          </div>
          <Link to="/dashboard" className="text-xs bg-white text-teal-700 rounded-full px-4 py-2 font-semibold hover:bg-teal-50 self-start md:self-center">Skip → Dashboard</Link>
        </div>
      )}
      <div><h1 className="text-2xl font-bold">Income</h1><p className="text-sm text-gray-500">Log client payments & revenue.</p></div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{editing?'Edit income':'Add income'}</h2>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <div><Label htmlFor="income-date">Date *</Label><Input id="income-date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></div>
          <div>
            <Label htmlFor="income-client">Client</Label>
            <div className="flex gap-2">
              <Select id="income-client" value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}>
                <option value="">— No client —</option>
                {data.clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button type="button" variant="ghost" onClick={()=>setShowNewClient(v=>!v)}>＋</Button>
            </div>
            {showNewClient && <div className="flex gap-2 mt-2"><Input id="income-new-client" placeholder="New client name (min 2 chars)" value={newClientName} onChange={e=>setNewClientName(e.target.value)} /><Button type="button" onClick={handleAddClient}>Add</Button></div>}
          </div>
          <div><Label htmlFor="income-amount">Amount ({data.settings.currency}) *</Label><Input id="income-amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required placeholder="1500.00" /></div>
          <div><Label htmlFor="income-desc">Description / notes *</Label><Input id="income-desc" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Project milestone, retainer…" required minLength={2} /></div>
          {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="md:col-span-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit">{editing?'Update':'Add income'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm({ date:new Date().toISOString().slice(0,10), client_id:'', amount:'', description:''}); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.income.length===0 ? <Empty title="No income yet" desc="Add your first payment to see it here." /> :
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Client</th><th className="text-left px-4 py-3">Description</th><th className="text-right px-4 py-3">Amount</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {[...data.income].sort((a,b)=>b.date.localeCompare(a.date)).map(row=>(
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">{row.client_name||'—'}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate">{row.description||'—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.amount, data.settings.currency)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap flex gap-1 justify-end">
                      <button onClick={()=>startEdit(row)} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-white">Edit</button>
                      <button onClick={async()=>{ if(confirm('Delete this income?')){ try{ await deleteIncome(row.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 hover:bg-red-100">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>
  )
}
