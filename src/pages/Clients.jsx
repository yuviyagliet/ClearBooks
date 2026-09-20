import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Label, Empty } from '../components/UI'

export default function ClientsPage(){
  const { data, addClient, updateClient, deleteClient } = useData()
  const [form,setForm]=useState({ name:'', email:'', notes:'' })
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')

  const submit=async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    if(!form.name.trim() || form.name.trim().length <2){ setErr('Name is required (min 2 chars)'); return }
    if(form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){ setErr('Invalid email format'); return }
    try{
      if(editing) await updateClient(editing, form)
      else await addClient(form)
      setInfo(editing ? 'Client updated!' : 'Client added!')
      setForm({ name:'', email:'', notes:''}); setEditing(null)
      setTimeout(()=> setInfo(''), 2000)
    }catch(ex){ setErr(ex.message) }
  }
  const startEdit=(c)=>{ setEditing(c.id); setForm({ name:c.name, email:c.email||'', notes:c.notes||''}); setErr(''); window.scrollTo({top:0,behavior:'smooth'}) }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Clients</h1><p className="text-sm text-gray-500">Keep your contacts handy for invoices.</p></div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{editing?'Edit client':'Add client'}</h2>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Acme Co" minLength={2} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="hello@acme.co" /></div>
          <div><Label>Notes</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Retainer, Net 15…" /></div>
          {err && <div className="md:col-span-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="md:col-span-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="md:col-span-3 flex gap-2">
            <Button type="submit">{editing?'Update':'Add client'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm({name:'',email:'',notes:''}); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.clients.length===0 ? <Empty title="No clients yet" desc="Add your first client to use when creating invoices." /> :
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.clients.map(c=>(
            <Card key={c.id} className="p-5">
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-gray-500">{c.email||'No email'}</div>
              {c.notes && <div className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-100 rounded-xl p-2.5">{c.notes}</div>}
              <div className="flex gap-2 mt-3">
                <button onClick={()=>startEdit(c)} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">Edit</button>
                <button onClick={async()=>{ if(confirm('Delete this client?')){ try{ await deleteClient(c.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  )
}
