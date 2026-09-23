import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, useLocalMode } from '../lib/supabase'
import { loadLocal, saveLocal } from '../utils/storage'
import { useAuth } from './AuthContext'
import { track } from '../lib/analytics'
import { toFriendlyError } from '../utils/errors'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const defaultSettings = { name:'', business_name:'', currency:'$', default_tax_rate:0, default_tax_type:'none', invoiceTheme:'modern-minimal', primaryColor:'#0f766e', logoUrl:null, logoName:null, paymentInstructions:{ bankName:'', accountNumber:'', ifsc:'', accountHolder:'', paypalLink:'', upiId:'', custom:'' }, termsEnabled:false, termsText:'Payment due within 14 days. Late payments may incur fees. Thank you for your business!', default_revisions_included:2 }
  const [data, setData] = useState(() => useLocalMode ? loadLocal() : { clients:[], income:[], expenses:[], invoices:[], settings: defaultSettings, invoice_counter:1001 })
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
      setData({ clients:[], income:[], expenses:[], invoices:[], settings: defaultSettings, invoice_counter:1001 })
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

      const savedSettings = JSON.parse(localStorage.getItem('clearbooks_settings') || 'null') || { name: user.email?.split('@')[0]||'', business_name:'', currency:'$', default_tax_rate:0, default_tax_type:'none', invoiceTheme:'modern-minimal', primaryColor:'#0f766e', logoUrl:null, logoName:null, paymentInstructions:{ bankName:'', accountNumber:'', ifsc:'', accountHolder:'', paypalLink:'', upiId:'', custom:'' }, termsEnabled:false, termsText:'Payment due within 14 days. Late payments may incur fees. Thank you for your business!' }
      // Existing users keep their stored rate; only brand-new users default to No tax (0%)
      if (savedSettings.default_tax_rate == null) savedSettings.default_tax_rate = 0
      if (savedSettings.default_tax_type == null) savedSettings.default_tax_type = 'none'
      if (!savedSettings.invoiceTheme) savedSettings.invoiceTheme = 'modern-minimal'
      if (!savedSettings.primaryColor) savedSettings.primaryColor = '#0f766e'
      if (savedSettings.logoUrl === undefined) savedSettings.logoUrl = null
      if (savedSettings.logoName === undefined) savedSettings.logoName = null
      if (!savedSettings.paymentInstructions || typeof savedSettings.paymentInstructions !== 'object') savedSettings.paymentInstructions = { bankName:'', accountNumber:'', ifsc:'', accountHolder:'', paypalLink:'', upiId:'', custom:'' }
      if (savedSettings.termsEnabled === undefined) savedSettings.termsEnabled = false
      if (savedSettings.termsText === undefined) savedSettings.termsText = 'Payment due within 14 days. Late payments may incur fees. Thank you for your business!'
      if (savedSettings.default_revisions_included == null) savedSettings.default_revisions_included = 2
      const invCounter = invoices.data?.length ? Math.max(...invoices.data.map(i=> parseInt(String(i.invoice_number).replace(/\D/g,''))||1000))+1 : 1001

      // Backfill tax_rate/tax_type for old invoices missing them (0% keeps old totals intact)
      let invoicesData = invoices.data || []
      let needsBackfill = invoicesData.some(inv => inv.tax_rate == null || inv.tax_type == null)
      if (needsBackfill) {
        console.warn('Backfilling invoices missing tax_rate/tax_type with 0% No tax — historical data may need manual review.')
        // Update in DB in background (best effort, RLS ensures only own rows)
        const toBackfill = invoicesData.filter(inv => inv.tax_rate == null).map(inv => inv.id)
        if (toBackfill.length) {
          // fire and forget; don't block UI
          supabase.from('invoices').update({ tax_rate: 0, tax_type: 'none' }).in('id', toBackfill).then(({error})=>{
            if (error) console.error('Backfill tax_rate failed', error)
            else console.info('Backfilled', toBackfill.length, 'invoices with 0% No tax')
          })
        }
        invoicesData = invoicesData.map(inv => (inv.tax_rate == null || inv.tax_type == null) ? { ...inv, tax_rate: inv.tax_rate ?? 0, tax_type: inv.tax_type ?? (inv.tax_rate > 0 ? 'custom' : 'none'), _taxMigrated: true } : inv)
      }

      // Revision Guard backfill — ensure contract terms exist (2 included, 0 used)
      const needsRev = invoicesData.some(inv => inv.revisions_included == null || inv.revisions_used == null)
      if (needsRev){
        const toBackfillRev = invoicesData.filter(inv => inv.revisions_included == null).map(inv=> inv.id)
        if (toBackfillRev.length){
          supabase.from('invoices').update({ revisions_included: 2, revisions_used: 0 }).in('id', toBackfillRev).then(({error})=>{
            if (error) console.warn('Backfill revisions failed (run schema migration)', error.message)
          })
        }
        invoicesData = invoicesData.map(inv=> ({ ...inv, revisions_included: inv.revisions_included ?? 2, revisions_used: inv.revisions_used ?? 0 }))
      }

      // Normalize payments array so UI never breaks on older rows/DBs
      invoicesData = invoicesData.map(inv => ({
        ...inv,
        payments: Array.isArray(inv.payments) ? inv.payments : (inv.status === 'Paid' ? [{ id: 'mig-' + inv.id, amount: Number(inv.total_amount) || 0, date: inv.issue_date, note: 'Marked as paid (legacy)' }] : []),
      }))

      setData({
        clients: clients.data || [],
        income: income.data || [],
        expenses: expenses.data || [],
        invoices: invoicesData,
        settings: savedSettings,
        invoice_counter: invCounter,
      })
    } catch (e) {
      const friendly = toFriendlyError(e, 'refresh')
      console.error('refresh failed', e)
      setError(friendly.message)
    }
    setLoading(false)
  }, [user])

  useEffect(()=>{ refresh() }, [refresh])

  // CRUD helpers - work both local and supabase with proper error propagation
  const sanitizeClient = (p) => ({
    name: p.name?.trim(),
    email: p.email?.trim() ? p.email.trim() : null,
    company: p.company?.trim() || null,
    phone: p.phone?.trim() || null,
    billing_address: p.billing_address?.trim() || null,
    gstin: p.gstin?.trim() || null,
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
    if (error) throw toFriendlyError(error, 'addClient')
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
    if (error) throw toFriendlyError(error, 'updateClient')
    await refresh()
  }
  const deleteClient = async (id) => {
    if (useLocalMode) { persist({ ...data, clients: data.clients.filter(c=>c.id!==id)}); return }
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw toFriendlyError(error, 'deleteClient')
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
    if (error) throw toFriendlyError(error, 'addIncome')
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
    if (error) throw toFriendlyError(error, 'updateIncome')
    await refresh()
  }
  const deleteIncome = async (id) => {
    if (useLocalMode){ persist({...data, income: data.income.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('income').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw toFriendlyError(error, 'deleteIncome')
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
    if (error) throw toFriendlyError(error, 'addExpense')
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
    if (error) throw toFriendlyError(error, 'updateExpense')
    await refresh()
  }
  const deleteExpense = async(id)=>{
    if(useLocalMode){ persist({...data, expenses:data.expenses.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('expenses').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw toFriendlyError(error, 'deleteExpense')
    await refresh()
  }

  const addInvoice = async (payload)=>{
    if (!payload.client_id) throw new Error('Client is required')
    if (!payload.issue_date || !payload.due_date) throw new Error('Issue and due dates are required')
    if (!payload.line_items?.length || payload.line_items.some(l=> !l.description?.trim() || Number(l.quantity) <=0 || Number(l.rate) <=0)) throw new Error('Each line item needs description, quantity >0 and rate >0')
    if (payload.total_amount <=0) throw new Error('Invoice total must be positive (rate must be >0)')
    // Snapshot tax type + rate — never read from settings at report time
    const validTypes = ['none','gst','vat','custom','exempt']
    const tax_type = validTypes.includes(payload.tax_type) ? payload.tax_type : 'none'
    let tax_rate = Number(payload.tax_rate ?? data.settings.default_tax_rate ?? 0)
    if (tax_type === 'none' || tax_type === 'exempt') tax_rate = 0
    if (isNaN(tax_rate) || tax_rate <0 || tax_rate >100) throw new Error('Tax rate must be 0-100')
    const subtotal = Number(payload.subtotal ?? payload.total_amount)
    const tax_amount = Number((subtotal * tax_rate / 100).toFixed(2))
    const grand_total = Number((subtotal + tax_amount).toFixed(2))
    // Revision Guard — contract term, 0-100 revisions, default 2
    let revisions_included = Number(payload.revisions_included ?? data.settings.default_revisions_included ?? 2)
    if (isNaN(revisions_included) || revisions_included < 0 || revisions_included > 100) throw new Error('Revisions included must be 0–100')
    let revisions_used = Number(payload.revisions_used ?? 0)
    if (isNaN(revisions_used) || revisions_used < 0 || revisions_used > 100) throw new Error('Revisions used must be 0–100')
    if (revisions_used > revisions_included + 10) console.warn('Revisions used exceeds included — consider extra billing')
    const toSave = { ...payload, tax_type, tax_rate, subtotal, tax_amount, total_amount: grand_total, payments: payload.payments ?? [], revisions_included: Math.floor(revisions_included), revisions_used: Math.floor(revisions_used) }
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
    // Resilient insert: try full payload, fallback without subtotal/tax_amount/revisions if schema not yet migrated.
    // Schema-cache errors are mapped to a friendly message (see src/utils/errors.js) but still logged.
    let insertError = null
    let { error } = await supabase.from('invoices').insert({ ...toSave, invoice_number:num, user_id:user.id })
    if (error && (error.message.includes('subtotal') || error.message.includes('tax_amount') || error.message.includes('revisions_') || error.message.includes('schema cache'))) {
      console.warn('Retrying invoice insert without subtotal/tax_amount/revisions (run schema migration)', error.message)
      const { subtotal: _s, tax_amount: _t, revisions_included: _ri, revisions_used: _ru, ...rest } = toSave
      const fallback = { ...rest, total_amount: grand_total, invoice_number:num, user_id:user.id }
      const retry = await supabase.from('invoices').insert(fallback)
      if (retry.error) insertError = retry.error
      else error = null
    } else {
      insertError = error
    }
    if (insertError || error) throw toFriendlyError(insertError || error, 'addInvoice')
    await refresh();
    if (wasFirstInvoice && !localStorage.getItem(`tracked_first_invoice_${uid}`)) {
      track('first_invoice_created', { total: grand_total, tax_rate })
      localStorage.setItem(`tracked_first_invoice_${uid}`, 'true')
    }
    return num
  }
  const updateInvoice = async(id,payload)=>{
    if(useLocalMode){ persist({...data, invoices:data.invoices.map(x=> x.id===id? {...x,...payload}:x)}); return}
    // Strip computed-only fields before sending to Supabase
    const { _taxMigrated, _rate, _sub, _tax, ...clean } = payload
    // Drop payments-related keys if the column doesn't exist yet (older DBs)
    const { error } = await supabase.from('invoices').update(clean).eq('id',id).eq('user_id', user.id)
    if (error) {
      if (error.message.includes('payments') || error.message.includes('payment_date') || error.message.includes('sent_at') || error.message.includes('revisions_') || error.message.includes('schema cache')) {
        const { payments: _p, payment_date: _pd, sent_at: _s, revisions_included: _ri, revisions_used: _ru, ...rest } = clean
        const retry = await supabase.from('invoices').update(rest).eq('id',id).eq('user_id', user.id)
        if (retry.error) throw toFriendlyError(retry.error, 'updateInvoice')
        await refresh()
        return
      }
      throw toFriendlyError(error, 'updateInvoice')
    }
    await refresh()
  }

  const updateRevisions = async (id, { revisions_used, revisions_included })=>{
    const inv = data.invoices.find(x=> x.id===id)
    if (!inv) throw new Error('Invoice not found')
    const payload = {}
    if (revisions_used != null){
      const v = Number(revisions_used)
      if (isNaN(v) || v <0 || v >100) throw new Error('Revisions used must be 0–100')
      payload.revisions_used = Math.floor(v)
    }
    if (revisions_included != null){
      const v = Number(revisions_included)
      if (isNaN(v) || v <0 || v>100) throw new Error('Revisions included must be 0–100')
      payload.revisions_included = Math.floor(v)
    }
    await updateInvoice(id, payload)
  }

  const normalizeInvoice = (inv) => ({
    ...inv,
    payments: Array.isArray(inv.payments) ? inv.payments : (inv.status === 'Paid' ? [{ id: 'mig-' + inv.id, amount: Number(inv.total_amount) || 0, date: inv.issue_date, note: 'Marked as paid (legacy)' }] : []),
  })

  const recordPayment = async (id, { amount, date, note }) => {
    const inv = data.invoices.find(x => x.id === id)
    if (!inv) throw new Error('Invoice not found')
    const amt = Number(amount)
    if (!amt || isNaN(amt) || amt <= 0) throw new Error('Payment amount must be positive')
    if (!date) throw new Error('Payment date is required')
    const paid = (Array.isArray(inv.payments) ? inv.payments : []).reduce((s,p)=> s + (Number(p.amount)||0), 0)
    const outstanding = Number(inv.total_amount) - paid
    if (amt > outstanding + 0.009) throw new Error(`Payment exceeds outstanding (${outstanding.toFixed(2)})`)
    const payment = { id: 'p' + Date.now(), amount: amt, date, note: note?.trim() || '' }
    const payments = [...(Array.isArray(inv.payments) ? inv.payments : []), payment]
    const newPaid = paid + amt
    const fullyPaid = newPaid >= Number(inv.total_amount) - 0.009
    const payload = { payments, status: fullyPaid ? 'Paid' : inv.status === 'Paid' ? 'Unpaid' : inv.status, payment_date: fullyPaid ? date : (inv.payment_date || null) }
    await updateInvoice(id, payload)
    return payment
  }

  const markPaid = async (id, date) => {
    const inv = data.invoices.find(x => x.id === id)
    if (!inv) throw new Error('Invoice not found')
    const paid = (Array.isArray(inv.payments) ? inv.payments : []).reduce((s,p)=> s + (Number(p.amount)||0), 0)
    const outstanding = Number(inv.total_amount) - paid
    if (outstanding <= 0) return
    const d = date || new Date().toISOString().slice(0,10)
    return await recordPayment(id, { amount: Number(outstanding.toFixed(2)), date: d, note: 'Marked as paid' })
  }

  const markSent = async (id) => {
    await updateInvoice(id, { sent_at: new Date().toISOString() })
  }
  const deleteInvoice = async(id)=>{
    if(useLocalMode){ persist({...data, invoices:data.invoices.filter(x=>x.id!==id)}); return}
    const { error } = await supabase.from('invoices').delete().eq('id',id).eq('user_id', user.id)
    if (error) throw toFriendlyError(error, 'deleteInvoice')
    await refresh()
  }

  const updateSettings = async(payload)=>{
    const next={...data, settings:{...data.settings,...payload}}
    persist(next)
    localStorage.setItem('clearbooks_settings', JSON.stringify(next.settings))
  }

  return <DataContext.Provider value={{ data, loading, error, refresh, addClient, updateClient, deleteClient, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, addInvoice, updateInvoice, deleteInvoice, recordPayment, markPaid, markSent, updateRevisions, normalizeInvoice, updateSettings }}>
    {children}
  </DataContext.Provider>
}
export const useData = () => useContext(DataContext)
