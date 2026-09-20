import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Input, Label, Select } from '../components/UI'
import { useLocalMode } from '../lib/supabase'

export default function Settings(){
  const { data, updateSettings } = useData()
  const { user, deleteAccount, signOut } = useAuth()
  const navigate = useNavigate()
  const [form,setForm]=useState(data.settings)
  const [saved,setSaved]=useState(false)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [deleting,setDeleting]=useState(false)
  useEffect(()=> setForm(data.settings), [data.settings])

  const submit=async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    try{
      await updateSettings(form)
      setSaved(true); setInfo('Settings saved')
      setTimeout(()=>{setSaved(false); setInfo('')},2000)
    }catch(ex){ setErr(ex.message) }
  }

  const handleDelete = async()=>{
    if(!confirm('Delete your account and ALL data? This cannot be undone.')) return
    if(!confirm('Second confirmation — permanently delete everything?')) return
    setDeleting(true); setErr(''); setInfo('')
    const { error, warning } = await deleteAccount()
    setDeleting(false)
    if(error){ setErr(error.message); return }
    if(warning) alert(warning)
    navigate('/')
  }

  const handleLogout = async()=>{
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-gray-500">Profile, invoice defaults & account.</p></div>

      <Card className="p-5 md:p-6">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Your name</Label><Input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Alex Freelancer" /></div>
          <div><Label>Business name (shown on invoices)</Label><Input value={form.business_name||''} onChange={e=>setForm({...form,business_name:e.target.value})} placeholder="Alex Studio LLC" /></div>
          <div><Label>Currency symbol</Label>
            <Select value={form.currency||'$'} onChange={e=>setForm({...form,currency:e.target.value})}>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
              <option value="₹">₹ INR</option>
              <option value="¥">¥ JPY</option>
              <option value="A$">A$ AUD</option>
              <option value="C$">C$ CAD</option>
            </Select>
            <p className="text-xs text-gray-400 mt-1">v1 uses a single symbol (no multi-currency conversions).</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
            <div className="font-semibold mb-1">Account</div>
            <div className="text-gray-600">Email: <span className="font-medium text-gray-900">{user?.email || '—'}</span></div>
            <div className="text-gray-600">User ID: <span className="font-mono text-[11px]">{user?.id || '—'}</span></div>
            <div className="text-gray-500 mt-1">Mode: {useLocalMode ? 'Local demo (configure Supabase for multi-user isolation)' : 'Supabase — secured with RLS (user_id = auth.uid())'}</div>
            {!useLocalMode && <div className="text-emerald-700 mt-1">Your data is private and secured to your account (RLS).</div>}
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="flex gap-2">
            <Button type="submit">{saved?'✓ Saved':'Save settings'}</Button>
            <Button type="button" variant="ghost" onClick={handleLogout}>Logout</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5 border-red-200">
        <h3 className="font-semibold text-red-700">Danger zone</h3>
        <p className="text-sm text-gray-600 mt-1">Delete your account and all associated data (clients, income, expenses, invoices, receipts). This is permanent.</p>
        <Button onClick={handleDelete} disabled={deleting} className="mt-3 bg-red-600 hover:bg-red-700 text-white">{deleting?'Deleting…':'Delete my account and all my data'}</Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold">Supabase setup (production)</h3>
        <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-2 mt-3">
          <li>Create project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-teal-700 underline">supabase.com</a></li>
          <li>SQL Editor → run <code className="bg-gray-100 px-1.5 py-0.5 rounded">supabase/schema.sql</code> (creates tables + RLS + storage policies + delete_current_user)</li>
          <li>Storage → bucket <code className="bg-gray-100 px-1.5 py-0.5 rounded">receipts</code> will be created by SQL; set to public</li>
          <li>Authentication → disable “Confirm email” for instant signup→dashboard, or leave enabled for email confirmation</li>
          <li>Copy URL + anon key to <code className="bg-gray-100 px-1.5 py-0.5 rounded">.env</code> and to Vercel env vars as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY</li>
          <li>Auth → URL Configuration → add Site URL = your Vercel URL and Redirect URLs include <code>{'{VERCEL_URL}'}/update-password</code> for reset flow</li>
        </ol>
        <p className="text-xs text-gray-400 mt-3">RLS ensures no user can ever see another’s rows — every query is filtered by auth.uid().</p>
      </Card>
    </div>
  )
}
