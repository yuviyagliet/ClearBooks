import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Input, Select, Label, Empty } from '../components/UI'
import { EXPENSE_CATEGORIES, formatCurrency } from '../utils/helpers'
import { supabase, useLocalMode } from '../lib/supabase'

export default function ExpensesPage(){
  const { data, addExpense, updateExpense, deleteExpense } = useData()
  const { user } = useAuth()
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), category:'Software', customCategory:'', amount:'', description:'', receipt_url:'' })
  const [editing, setEditing]=useState(null)
  const [uploading, setUploading]=useState(false)
  const [categories, setCategories]=useState(EXPENSE_CATEGORIES)
  const [err, setErr]=useState('')
  const [info, setInfo]=useState('')
  const [search,setSearch]=useState('')

  const visibleExpenses = [...data.expenses].filter(e=>{
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (e.description||'').toLowerCase().includes(q) || (e.category||'').toLowerCase().includes(q)
  }).sort((a,b)=>b.date.localeCompare(a.date))

  const submit= async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    const cat = form.category==='__custom' ? form.customCategory.trim() : form.category
    if(!cat){ setErr('Category is required'); return }
    if(form.category==='__custom' && form.customCategory && !categories.includes(form.customCategory.trim())){
      setCategories([...categories, form.customCategory.trim()])
    }
    const amountNum = Number(form.amount)
    if(!form.date){ setErr('Date is required'); return }
    if(!form.amount || isNaN(amountNum) || amountNum <=0){ setErr('Amount must be a positive number'); return }
    if(!form.description.trim() || form.description.trim().length < 2){ setErr('Description is required (min 2 chars)'); return }
    const payload={ date:form.date, category:cat, amount: amountNum, description: form.description.trim(), receipt_url: form.receipt_url||'' }
    try{
      if(editing) await updateExpense(editing, payload)
      else await addExpense(payload)
      setInfo(editing ? 'Expense updated!' : 'Expense added!')
      setForm({ date:new Date().toISOString().slice(0,10), category:'Software', customCategory:'', amount:'', description:'', receipt_url:''}); setEditing(null)
      setTimeout(()=> setInfo(''), 2000)
    }catch(ex){
      setErr(ex.message || 'Failed to save expense')
    }
  }
  const startEdit=(row)=>{
    setEditing(row.id); setForm({ date:row.date, category: categories.includes(row.category)? row.category:'__custom', customCategory: categories.includes(row.category)?'':row.category, amount:String(row.amount), description:row.description||'', receipt_url: row.receipt_url||''})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const handleReceipt = async(e)=>{
    const file=e.target.files?.[0]; if(!file) return
    setErr(''); setInfo('')
    if(file.size > 5*1024*1024){ setErr('File too large — max 5MB'); return }
    if(!file.type.startsWith('image/')){ setErr('Only image files allowed'); return }
    if(useLocalMode){
      const reader=new FileReader()
      reader.onload=()=> setForm(f=>({...f, receipt_url: reader.result }))
      reader.readAsDataURL(file)
      return
    }
    if(!user){ setErr('You must be logged in to upload'); return }
    setUploading(true)
    try{
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
      const path=`${user.id}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false, contentType: file.type })
      if(error) throw error
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      setForm(f=>({...f, receipt_url: urlData.publicUrl }))
      setInfo('Receipt uploaded!')
      setTimeout(()=> setInfo(''), 2000)
    }catch(err){ setErr('Upload failed: '+ (err.message||'unknown')) }
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-gray-500">Track spend & attach receipts (scoped to your account).</p></div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{editing?'Edit expense':'Add expense'}</h2>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <div><Label htmlFor="expense-date">Date *</Label><Input id="expense-date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></div>
          <div>
            <Label htmlFor="expense-category">Category *</Label>
            <Select id="expense-category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
              {categories.map(c=> <option key={c} value={c}>{c}</option>)}
              <option value="__custom">＋ Add custom…</option>
            </Select>
            {form.category==='__custom' && <Input id="expense-custom-category" className="mt-2" placeholder="Custom category (min 2 chars)" value={form.customCategory} onChange={e=>setForm({...form, customCategory:e.target.value})} required />}
          </div>
          <div><Label htmlFor="expense-amount">Amount ({data.settings.currency}) *</Label><Input id="expense-amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required placeholder="49.00" /></div>
          <div><Label htmlFor="expense-description">Description *</Label><Input id="expense-description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Adobe CC, flight, laptop…" required minLength={2} /></div>
          <div className="md:col-span-2">
            <Label htmlFor="expense-receipt">Receipt image (optional, max 5MB)</Label>
            <div className="flex gap-2 items-center">
              <Input id="expense-receipt" type="file" accept="image/*" onChange={handleReceipt} className="flex-1" />
              {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
            </div>
            {form.receipt_url && <div className="mt-2 flex items-center gap-2"><img src={form.receipt_url} alt="receipt" className="w-16 h-16 object-cover rounded-xl border" /><a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline">View receipt</a><button type="button" onClick={()=>setForm({...form,receipt_url:''})} className="text-xs border rounded-full px-2 py-1">Remove</button></div>}
            {!useLocalMode && <p className="text-[11px] text-gray-400 mt-1">Stored privately in Supabase Storage <code>receipts/{'{user_id}'}</code> — RLS isolated per user (only you can view). Bucket is private with user-scoped policies.</p>}
            {useLocalMode && <p className="text-[11px] text-amber-600 mt-1">Demo mode: receipt stored as data URL. Configure Supabase for private per-user storage.</p>}
          </div>
          {err && <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="md:col-span-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit">{editing?'Update':'Add expense'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={()=>{setEditing(null); setForm({ date:new Date().toISOString().slice(0,10), category:'Software', customCategory:'', amount:'', description:'', receipt_url:''}); setErr('')}}>Cancel</Button>}
          </div>
        </form>
      </Card>

      {data.expenses.length===0 ? <Empty variant="expense" title="Every great production tracks its spend" desc="Add your first expense to see the magic — receipts, categories and burn rate, all beautifully organized." action={<Button onClick={()=> document.getElementById('expense-amount')?.focus()}>Add your first expense →</Button>} /> :
        <Card className="overflow-hidden">
          {data.expenses.length > 3 && (
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description or category…" className="max-w-xs" />
            </div>
          )}
          {visibleExpenses.length===0 ? <p className="text-sm text-gray-500 p-6 text-center">No expenses match your search.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Description</th><th className="text-right px-4 py-3">Amount</th><th className="text-center px-4 py-3">Receipt</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {visibleExpenses.map(row=>(
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3"><span className="bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 text-xs">{row.category}</span></td>
                    <td className="px-4 py-3 max-w-[220px] truncate">{row.description||'—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.amount, data.settings.currency)}</td>
                    <td className="px-4 py-3 text-center">{row.receipt_url ? <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline font-medium">View</a> : <span className="text-xs text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-right flex gap-1 justify-end">
                      <button onClick={()=>startEdit(row)} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-white">Edit</button>
                      <button onClick={async()=>{ if(confirm('Delete this expense?')){ try{ await deleteExpense(row.id)}catch(e){ alert(e.message)}}}} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </Card>
      }
    </div>
  )
}
