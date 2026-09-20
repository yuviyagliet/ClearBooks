import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, useLocalMode } from '../lib/supabase'
import { loadLocal, saveLocal } from '../utils/storage'
import { useAuth } from './AuthContext'
import { track } from '../lib/analytics'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(() => useLocalMode ? loadLocal() : { clients:[], income:[], expenses:[], invoices:[], settings:{name:'', business_name:'', currency:'$', default_tax_rate:18}, invoice_counter:1001 })
  const [loading, setLoading] = useState(!useLocalMode)
  const [error, setError] = useState(null)

  const persist = useCallback((next) => {
    setData(next)
    if (useLocalMode) saveLocal(next)
  }, [])

  const refresh = useCallback(async () => {
    if (useLocalMode) {
      setData(loadLocal())
      setLoading(false)
      return
    }
    if (!user) { 
      setData({ clients:[], income:[], expenses:[], invoices:[], settings:{name:'', business_name:'', currency:'$', default_tax_rate:18}, invoice_counter:1001 })
      setLoading(false); return 
    }
    setLoading(true)
    setError(null)
    const uid = user.id
    try {
      const [clients, income, expenses, invoices] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', uid).order('created_at', {ascending: false}),
        supabase.from('income').select('*').eq('user_id', uid).order('date', {ascending: false}),
        supabase.from('expenses').select('*').eq('user_id', uid).order('date', {ascending: false}),
        supabase.from('invoices').select('*').eq('user_id', uid).order('created_at', {ascending: false}),
      ])
      if (clients.error) throw clients.error
      if (income.error) throw income.error
      if (expenses.error) throw expenses.error
      if (invoices.error) throw invoices.error

      const savedSettings = JSON.parse(localStorage.getItem('clearbooks_settings') || 'null') || { name: user.email?.split('@')[0]||'', business_name:'', currency:'$', default_tax_rate:18 }
      if (savedSettings.default_tax_rate == null) savedSettings.default_tax_rate = 18
      const invCounter = invoices.data?.length ? Math.max(...invoices.data.map(i=> parseInt(String(i.invoice_number).replace(/\D/g,''))||1000))+1 : 1001

      // Backfill tax_rate for old invoices missing it
      let invoicesData = invoices.data || []
      let needsBackfill = invoicesData.some(inv => inv.tax_rate == null)
      if (needsBackfill) {
        console.warn('Backfilling invoices missing tax_rate with default', savedSettings.default_tax_rate, '— historical data may need manual review.')
        // Update in DB in background (best effort, RLS ensures only own rows)
        const toBackfill = invoicesData.filter(inv => inv.tax_rate == null).map(inv => inv.id)
        if (toBackfill.length) {
          // fire and forget; don't block UI
          supabase.from('invoices').update({ tax_rate: savedSettings.default_tax_rate }).in('id', toBackfill).then(({error})=>{
            if (error) console.error('Backfill tax_rate failed', error)
            else console.info('Backfilled', toBackfill.length, 'invoices with tax_rate', savedSettings.default_tax_rate)
          })
        }
        invoicesData = invoicesData.map(inv => inv.tax_rate == null ? { ...inv, tax_rate: savedSettings.default_tax_rate, _taxMigrated: true } : inv)
      }

      setData({
        clients: clients.data || [],
        income: income.data || [],
        expenses: expenses.data || [],
        invoices: invoicesData,
        settings: savedSettings,
        invoice_counter: invCounter,
      })
    } catch (e) {
      console.error('refresh failed', e)
      setError(e.message)
    }
    setLoading(false)
  }, [user])

  useEffect(()=>{ refresh() }, [refresh])

  // CRUD helpers - work both local and supabase with proper error propagation
  const sanitizeClient = (p) => ({
    name: p.name?.trim(),
    email: p.email?.trim() ? p.email.trim() : null,
    notes: p.notes?.trim() || null,
  })
  const addClient = async (payload) => {
    if (!payload.name?.trim()) throw new Error('Client name is required')
    const clean = sanitizeClient(payload)
    if (useLocalMode) {
      const id = 'c'+Date.now()
      const next = { ...data, clients: [...data.clients, { id, ...clean }] }
      persist(next); return { id, ...clean }
    }
    const { data: res, error } = await supabase.from('clients').insert({ ...clean, user_id: user.id }).select().single()
    if (error) throw new Error(error.message)
    await refresh()
    return res
  }
  const updateClient = async (id, payload) => {
    if (!payload.name?.trim()) throw new Error('Client name is required')
    const clean = sanitizeClient(payload)
    if (useLocalMode) {
      const next = { ...data, clients: data.clients.map(c=> c.id===id? {...c, ...clean}:c) }
      persist(next); return
    }
    const { error } = await supabase.from('clients').update(clean).eq('id', id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }
  const deleteClient = async (id) => {
    if (useLocalMode) { persist({ ...data, clients: data.clients.filter(c=>c.id!==id)}); return }
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }

  const addIncome = async (payload) => {
    if (!payload.date) throw new Error('Date is required')
    if (payload.amount == null || payload.amount === '' || isNaN(Number(payload.amount)) || Number(payload.amount) <= 0) throw new Error('Amount must be a positive number')
    if (!payload.description?.trim() || payload.description.trim().length < 2) throw new Error('Description is required (min 2 chars)')
    const wasFirstEntry = data.income.length === 0 && data.expenses.length === 0
    const uid = user?.id || 'anon'
    if (useLocalMode) {
      const id='i'+Date.now()
      const next={ ...data, income:[...data.income, { id, ...payload, amount: Number(payload.amount)}]}
      persist(next);
      if (wasFirstEntry && !localStorage.getItem(`tracked_first_entry_${uid}`)) {
        track('first_entry_created', { type: 'income', amount: Number(payload.amount) })
        localStorage.setItem(`tracked_first_entry_${uid}`, 'true')
      }
      return
    }
    const { error } = await supabase.from('income').insert({ ...payload, amount: Number(payload.amount), user_id:user.id })
    if (error) throw new Error(error.message)
    await refresh()
    if (wasFirstEntry && !localStorage.getItem(`tracked_first_entry_${uid}`)) {
      track('first_entry_created', { type: 'income', amount: Number(payload.amount) })
      localStorage.setItem(`tracked_first_entry_${uid}`, 'true')
    }
  }
  const updateIncome = async (id, payload) => {
    if (payload.amount != null && (isNaN(Number(payload.amount)) || Number(payload.amount) <= 0)) throw new Error('Amount must be positive')
    if (useLocalMode){ persist({...data, income: data.income.map(x=> x.id===id? {...x,...payload, amount: Number(payload.amount)}:x)}); return}
    const { error } = await supabase.from('income').update({...payload, amount: Number(payload.amount)}).eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }
  const deleteIncome = async (id) => {
    if (useLocalMode){ persist({...data, income: data.income.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('income').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }

  const addExpense = async (payload) => {
    if (!payload.date) throw new Error('Date is required')
    if (!payload.category?.trim()) throw new Error('Category is required')
    if (payload.amount == null || payload.amount === '' || isNaN(Number(payload.amount)) || Number(payload.amount) <= 0) throw new Error('Amount must be a positive number')
    if (!payload.description?.trim() || payload.description.trim().length < 2) throw new Error('Description is required (min 2 chars)')
    const wasFirstEntry = data.income.length === 0 && data.expenses.length === 0
    const uid = user?.id || 'anon'
    if (useLocalMode){ const id='e'+Date.now(); persist({...data, expenses:[...data.expenses,{id,...payload, amount: Number(payload.amount)}]});
      if (wasFirstEntry && !localStorage.getItem(`tracked_first_entry_${uid}`)) {
        track('first_entry_created', { type: 'expense', amount: Number(payload.amount) })
        localStorage.setItem(`tracked_first_entry_${uid}`, 'true')
      }
      return}
    const { error } = await supabase.from('expenses').insert({ ...payload, amount: Number(payload.amount), user_id:user.id })
    if (error) throw new Error(error.message)
    await refresh()
    if (wasFirstEntry && !localStorage.getItem(`tracked_first_entry_${uid}`)) {
      track('first_entry_created', { type: 'expense', amount: Number(payload.amount) })
      localStorage.setItem(`tracked_first_entry_${uid}`, 'true')
    }
  }
  const updateExpense = async (id,payload)=>{
    if (payload.amount != null && (isNaN(Number(payload.amount)) || Number(payload.amount) <= 0)) throw new Error('Amount must be positive')
    if(useLocalMode){ persist({...data, expenses: data.expenses.map(x=> x.id===id? {...x,...payload, amount: Number(payload.amount)}:x)}); return}
    const { error } = await supabase.from('expenses').update({...payload, amount: payload.amount != null ? Number(payload.amount) : undefined}).eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }
  const deleteExpense = async(id)=>{
    if(useLocalMode){ persist({...data, expenses:data.expenses.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('expenses').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }

  const addInvoice = async (payload)=>{
    if (!payload.client_id) throw new Error('Client is required')
    if (!payload.issue_date || !payload.due_date) throw new Error('Issue and due dates are required')
    if (!payload.line_items?.length || payload.line_items.some(l=> !l.description?.trim() || Number(l.quantity) <=0 || Number(l.rate) <=0)) throw new Error('Each line item needs description, quantity >0 and rate >0')
    if (payload.total_amount <=0) throw new Error('Invoice total must be positive (rate must be >0)')
    // Snapshot tax_rate — never read from settings at report time
    const tax_rate = Number(payload.tax_rate ?? data.settings.default_tax_rate ?? 0)
    if (isNaN(tax_rate) || tax_rate <0 || tax_rate >100) throw new Error('Tax rate must be 0-100')
    const subtotal = Number(payload.subtotal ?? payload.total_amount)
    const tax_amount = Number((subtotal * tax_rate / 100).toFixed(2))
    const grand_total = Number((subtotal + tax_amount).toFixed(2))
    const toSave = { ...payload, tax_rate, subtotal, tax_amount, total_amount: grand_total }
    const wasFirstInvoice = data.invoices.length === 0
    const uid = user?.id || 'anon'
    if(useLocalMode){
      const num = `INV-${data.invoice_counter}`
      const id='inv'+Date.now()
      const next={...data, invoices:[...data.invoices,{id, invoice_number:num, ...toSave}], invoice_counter: data.invoice_counter+1}
      persist(next);
      if (wasFirstInvoice && !localStorage.getItem(`tracked_first_invoice_${uid}`)) {
        track('first_invoice_created', { total: grand_total, tax_rate })
        localStorage.setItem(`tracked_first_invoice_${uid}`, 'true')
      }
      return num
    }
    const num = `INV-${data.invoice_counter}`
    const { error } = await supabase.from('invoices').insert({ ...toSave, invoice_number:num, user_id:user.id })
    if (error) throw new Error(error.message)
    await refresh();
    if (wasFirstInvoice && !localStorage.getItem(`tracked_first_invoice_${uid}`)) {
      track('first_invoice_created', { total: grand_total, tax_rate })
      localStorage.setItem(`tracked_first_invoice_${uid}`, 'true')
    }
    return num
  }
  const updateInvoice = async(id,payload)=>{
    if(useLocalMode){ persist({...data, invoices:data.invoices.map(x=> x.id===id? {...x,...payload}:x)}); return}
    const { error } = await supabase.from('invoices').update(payload).eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }
  const deleteInvoice = async(id)=>{
    if(useLocalMode){ persist({...data, invoices:data.invoices.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('invoices').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refresh()
  }

  const updateSettings = async(payload)=>{
    const next={...data, settings:{...data.settings,...payload}}
    persist(next)
    localStorage.setItem('clearbooks_settings', JSON.stringify(next.settings))
  }

  return <DataContext.Provider value={{ data, loading, error, refresh, addClient, updateClient, deleteClient, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, addInvoice, updateInvoice, deleteInvoice, updateSettings }}>
    {children}
  </DataContext.Provider>
}
export const useData = () => useContext(DataContext)
