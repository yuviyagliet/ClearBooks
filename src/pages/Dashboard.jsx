import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Empty } from '../components/UI'
import { formatCurrency, last6Months, exportCSV } from '../utils/helpers'
import { outstandingSummary, paymentsInRange, amountOutstanding, pipelineStatus, daysOverdue, expectedIncome, overdueSummary, generateReminder, getNudgeTemplates, getNudgeSeverity } from '../utils/payments'
import { track } from '../lib/analytics'
import { getDemoData } from '../utils/demoData'

export default function Dashboard(){
  const { data } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  // Auto-launch onboarding: only once, on first signup
  useEffect(()=>{
    if (!user) return
    try {
      const pending = localStorage.getItem('clearbooks_just_signed_up') === 'true'
      const onboardedKey = `clearbooks_has_onboarded_${user.id}`
      const hasOnboarded = localStorage.getItem(onboardedKey) === 'true'
      const userPending = localStorage.getItem(`clearbooks_onboarding_pending_${user.id}`) === 'true'
      // Also handle Google OAuth case: if user is new (no data) and never onboarded, treat as pending
      const isNewUser = (data.income.length===0 && data.expenses.length===0 && data.invoices.length===0) && !hasOnboarded
      // For Google, check if account age < 5 min and no flag
      let shouldLaunch = false
      if ((pending || userPending) && !hasOnboarded) shouldLaunch = true
      // Fallback for Google first signup: if isNewUser and not hasOnboarded and user created recently, auto-launch once
      // We check a separate flag to avoid repeat for returning users with empty data
      if (isNewUser && !hasOnboarded && !pending && !userPending) {
        // Check if we've ever set the hasOnboarded flag — if never set, this is first visit
        const hasEverVisited = localStorage.getItem(onboardedKey) !== null
        if (!hasEverVisited) {
          // Only auto-launch if user was created within last 10 minutes (to avoid old users with empty data)
          const createdAt = user.created_at ? new Date(user.created_at).getTime() : Date.now()
          if (Date.now() - createdAt < 10*60*1000) shouldLaunch = true
        }
      }
      if (shouldLaunch) {
        localStorage.removeItem('clearbooks_just_signed_up')
        localStorage.removeItem(`clearbooks_onboarding_pending_${user.id}`)
        localStorage.setItem(onboardedKey, 'true')
        // record that onboarding was launched (for verification)
        try { track('onboarding_auto_launched', { user_id: user.id }) } catch {}
        navigate('/income?onboarding=first_signup', { replace: true })
      }
    } catch {}
  }, [user, data.income.length, data.expenses.length, data.invoices.length, navigate])

  // Onboarding checklist: 3 items, hide when all complete (based on REAL data only — demo never counts)
  const hasIncome = data.income.length > 0
  const hasExpense = data.expenses.length > 0
  const hasInvoice = data.invoices.length > 0
  const allDone = hasIncome && hasExpense && hasInvoice
  const showChecklist = !allDone

  // Premium demo data — shows power of dashboard immediately for empty workspaces
  const isEmpty = !hasIncome && !hasExpense && !hasInvoice
  const [hideDemo, setHideDemo] = useState(()=> {
    try { return localStorage.getItem('clearbooks_hide_demo') === 'true' } catch { return false }
  })
  const showDemo = isEmpty && !hideDemo
  const demo = useMemo(()=> showDemo ? getDemoData(data.settings.currency) : null, [showDemo, data.settings.currency])
  const displayIncome = showDemo ? demo.income : data.income
  const displayExpenses = showDemo ? demo.expenses : data.expenses
  const displayInvoices = showDemo ? demo.invoices : data.invoices
  const displayCurrency = data.settings.currency || demo?.settings.currency || '$'
  const clearDemo = ()=>{
    setHideDemo(true)
    try { localStorage.setItem('clearbooks_hide_demo','true') } catch {}
  }
  const restoreDemo = ()=>{
    setHideDemo(false)
    try { localStorage.removeItem('clearbooks_hide_demo') } catch {}
  }

  const now=new Date()
  const ym = now.toISOString().slice(0,7)
  // Received = money actually in hand (income entries + invoice payments this month)
  const incomeMonth = displayIncome.filter(i=> i.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const monthStart = `${ym}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10)
  const invoicePaidMonth = paymentsInRange(displayInvoices, monthStart, monthEnd).total
  const receivedMonth = incomeMonth + invoicePaidMonth
  // Outstanding = invoiced but not yet paid (never counted as income)
  const outstanding = outstandingSummary(displayInvoices)
  const expenseMonth = displayExpenses.filter(e=> e.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const profit = receivedMonth - expenseMonth

  // === Payment Command Center — pipeline & forecast ===
  const pipelineCounts = useMemo(()=>{
    const c = { Draft:0, Sent:0, Overdue:0, Paid:0 }
    displayInvoices.forEach(inv=>{ const p = pipelineStatus(inv); c[p] = (c[p]||0)+1 })
    return c
  }, [displayInvoices])
  const expected = useMemo(()=> expectedIncome(displayInvoices), [displayInvoices])
  const overdue = useMemo(()=> overdueSummary(displayInvoices), [displayInvoices])
  const [reminderFor, setReminderFor] = useState(null) // { inv, days, bal, templates }
  const [copiedId, setCopiedId] = useState(null)
  const openReminder = (inv)=>{
    const days = daysOverdue(inv)
    const bal = amountOutstanding(inv)
    const business = data.settings.business_name || data.settings.name || 'ClearBooks'
    const nudge = getNudgeTemplates(inv, { businessName: business, currency: displayCurrency, bal, daysLate: days })
    setReminderFor({ inv, days, bal, ...nudge })
    setCopiedId(null)
    try{ track('nudge_opened', { invoice: inv.invoice_number, days, severity: nudge.severity }) }catch{}
    // keep legacy for fallback
    try{ track('reminder_generator_opened', { invoice: inv.invoice_number, days }) }catch{}
  }
  const copyNudge = async (text, id)=>{
    try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=> setCopiedId(null), 1800); try{ track('nudge_copied', { id }) }catch{} }catch{ alert(text) }
  }
  // legacy alias
  const copyReminder = copyNudge
  const copied = !!copiedId

  const months = last6Months()
  const chartData = months.map(m=>{
    const inc = displayIncome.filter(i=> isSameMonthLocal(i.date,m.year,m.month)).reduce((s,x)=>s+Number(x.amount),0)
    const invPaid = displayInvoices.reduce((s,inv)=> s + (Array.isArray(inv.payments) ? inv.payments : []).filter(p=> isSameMonthLocal(p.date,m.year,m.month)).reduce((a,p)=> a + (Number(p.amount)||0),0),0)
    const exp = displayExpenses.filter(e=> isSameMonthLocal(e.date,m.year,m.month)).reduce((s,x)=>s+Number(x.amount),0)
    return { label:m.label, inc: inc + invPaid, exp }
  })
  const maxVal = Math.max(1, ...chartData.flatMap(d=>[d.inc,d.exp]))

  const handleExportAll = ()=>{
    const rows = [['Type','Date','Invoice Number','Client','Category','Description','Amount','Tax Type','Tax Rate %','Tax Amount','Total','Paid','Outstanding','Currency','Status']]
    // Export real data if exists, otherwise demo for preview
    const expIncome = displayIncome
    const expExpenses = displayExpenses
    const expInvoices = displayInvoices
    const expCurrency = displayCurrency
    expIncome.forEach(i=> rows.push(['Income', i.date, '', i.client_name||'', '', i.description||'', i.amount, '', '', '', '', '', '', expCurrency, '']))
    expExpenses.forEach(e=> rows.push(['Expense', e.date, '', '', e.category||'', e.description||'', e.amount, '', '', '', '', '', '', expCurrency, '']))
    expInvoices.forEach(inv=>{
      const rate = Number(inv.tax_rate ?? 0)
      const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
      const grand = Number(inv.total_amount || 0)
      const sub = Number(inv.subtotal ?? (rate ? grand / (1 + rate/100) : grand))
      const tax = Number(inv.tax_amount ?? (sub * rate / 100))
      const paid = (Array.isArray(inv.payments) ? inv.payments : []).reduce((s,p)=> s + (Number(p.amount)||0), 0)
      rows.push(['Invoice', inv.issue_date, inv.invoice_number, inv.client_name||'', '', (inv.line_items||[]).map(l=>l.description).join('; '), sub, ttype, rate, tax, grand, paid, grand - paid, expCurrency, inv.status])
    })
    const date = new Date().toISOString().slice(0,10)
    exportCSV(`clearbooks-export-${date}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Dashboard</h1>
          <p className="text-sm text-slate-500">Your freelance money at a glance — {now.toLocaleString('en-US',{month:'long', year:'numeric'})}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/income" className="bg-teal-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-teal-800 hover:shadow-md hover:-translate-y-[1px] transition">＋ Add Income</Link>
          <Link to="/expenses" className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 hover:shadow-sm transition">＋ Add Expense</Link>
          <button onClick={handleExportAll} className="bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-black hover:shadow-md transition">⬇ Export CSV</button>
        </div>
      </div>

      {/* Premium demo banner — shows power of dashboard instantly */}
      {showDemo && (
        <div className="relative overflow-hidden rounded-[20px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-amber-50/50 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_8px_24px_rgba(15,118,110,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.08),transparent_50%)] pointer-events-none" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-teal-700 bg-white border border-teal-200 rounded-full px-2.5 py-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" /> Sample data — preview mode
            </div>
            <h3 className="font-display font-semibold text-[15px] text-slate-900 mt-2.5">Feel the power — no setup needed</h3>
            <p className="text-sm text-slate-600 mt-1 max-w-[560px] leading-relaxed">We’ve loaded a taste of a real colorist’s studio — FrameFlow Post, Mosaic Pictures & Lumen. Explore charts, outstanding & cash flow. Add your own data and this preview vanishes automatically.</p>
          </div>
          <div className="flex gap-2 shrink-0 relative">
            <button onClick={clearDemo} className="text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-semibold hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition">Clear Demo Data</button>
            <Link to="/income" className="text-sm bg-teal-700 text-white rounded-xl px-4 py-2.5 font-semibold hover:bg-teal-800 hover:shadow-md transition">Add your first income →</Link>
          </div>
        </div>
      )}
      {isEmpty && hideDemo && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">Demo hidden — your workspace is clean and ready.</span>
          <button onClick={restoreDemo} className="text-xs font-semibold text-teal-700 hover:underline">Show demo again</button>
        </div>
      )}

      {showChecklist && (
        <Card className="p-5 border-teal-200 bg-teal-50/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm">Get started — 3 steps to activate your ledger</h3>
              <p className="text-xs text-gray-500 mt-1">Complete these once to get the most out of ClearBooks. This hides automatically when all 3 are done.</p>
            </div>
            <span className="text-xs bg-white border border-teal-200 text-teal-700 rounded-full px-2.5 py-1 font-medium">{[hasIncome, hasExpense, hasInvoice].filter(Boolean).length}/3 done</span>
          </div>
          <ul className="mt-4 grid gap-2">
            <li>
              <Link to="/income" className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition ${hasIncome ? 'bg-white border-emerald-200' : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${hasIncome ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{hasIncome ? '✓' : '1'}</span>
                <span className={`font-medium ${hasIncome ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>Add your first income</span>
                <span className={`ml-auto text-xs font-semibold ${hasIncome ? 'text-emerald-600' : 'text-teal-700'}`}>{hasIncome ? 'Done' : '→'}</span>
              </Link>
            </li>
            <li>
              <Link to="/expenses" className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition ${hasExpense ? 'bg-white border-emerald-200' : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${hasExpense ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{hasExpense ? '✓' : '2'}</span>
                <span className={`font-medium ${hasExpense ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>Add your first expense</span>
                <span className={`ml-auto text-xs font-semibold ${hasExpense ? 'text-emerald-600' : 'text-teal-700'}`}>{hasExpense ? 'Done' : '→'}</span>
              </Link>
            </li>
            <li>
              <Link to="/invoices" className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition ${hasInvoice ? 'bg-white border-emerald-200' : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${hasInvoice ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{hasInvoice ? '✓' : '3'}</span>
                <span className={`font-medium ${hasInvoice ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>Create your first invoice</span>
                <span className={`ml-auto text-xs font-semibold ${hasInvoice ? 'text-emerald-600' : 'text-teal-700'}`}>{hasInvoice ? 'Done' : '→'}</span>
              </Link>
            </li>
          </ul>
        </Card>
      )}

      {/* Received vs Outstanding — unpaid invoices are never counted as income */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Received this month" value={formatCurrency(receivedMonth, displayCurrency)} sub={`Cash in hand${invoicePaidMonth>0 ? ` (incl. ${formatCurrency(invoicePaidMonth, displayCurrency)} invoice payments)` : ''}${showDemo?' · preview':''}`} color="teal" demo={showDemo} />
        <Stat title="Outstanding" value={formatCurrency(outstanding.outstanding, displayCurrency)} sub={outstanding.openCount===0 ? 'Nothing owed — all clear' : `${outstanding.openCount} open invoice${outstanding.openCount===1?'':'s'}${outstanding.overdue>0 ? ` · ${formatCurrency(outstanding.overdue, displayCurrency)} overdue` : ''}${showDemo?' · preview':''}`} color={outstanding.outstanding>0?'amber':'emerald'} demo={showDemo} />
        <Stat title="Expenses this month" value={formatCurrency(expenseMonth, displayCurrency)} sub={`${displayExpenses.filter(e=>e.date?.slice(0,7)===ym).length} entries${showDemo?' · preview':''}`} color="amber" demo={showDemo} />
        <Stat title="Net profit" value={formatCurrency(profit, displayCurrency)} sub={`${profit>=0?'Positive cash flow':'Negative — watch spend'}${showDemo?' · preview':''}`} color={profit>=0?'emerald':'red'} demo={showDemo} />
      </div>
      <p className="text-[11px] text-slate-400 -mt-3 tracking-wide">Invoiced ≠ income: unpaid invoices show under Outstanding until the client pays. Only received money counts toward profit. {showDemo && <span className="text-teal-700 font-medium">· Showing sample data</span>}</p>

      {/* Payment Command Center — pipeline, forecast, urgency */}
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-[15px]">Payment Command Center</h2>
          <span className="text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white rounded-full px-2 py-1">Pipeline: Draft → Sent → Overdue → Paid</span>
        </div>

        {/* Pipeline stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k:'Draft', c: pipelineCounts.Draft, hint:'Not sent yet' },
            { k:'Sent', c: pipelineCounts.Sent, hint:`Awaiting payment` },
            { k:'Overdue', c: pipelineCounts.Overdue, hint:`Needs nudge` },
            { k:'Paid', c: pipelineCounts.Paid, hint:'Cash in' },
          ].map((s,i)=> (
            <Card key={s.k} className={`p-4 relative overflow-hidden ${s.k==='Overdue' && s.c>0 ? 'border-red-200 bg-red-50/40' : s.k==='Sent' && s.c>0 ? 'border-indigo-200 bg-indigo-50/20' : ''}`}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500">{i+1}. {s.k}</div>
              <div className="text-2xl font-bold font-display mt-1">{s.c}</div>
              <div className="text-xs text-slate-500">{s.hint}</div>
              {i < 3 && <span className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-slate-300">→</span>}
            </Card>
          ))}
        </div>

        {/* Forecast + Overdue urgency */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-indigo-50/70 to-white border-indigo-200">
            <div className="text-[11px] font-bold tracking-widest uppercase text-indigo-700">Expected Income</div>
            <div className="text-2xl font-bold font-display mt-1">{formatCurrency(expected.total, displayCurrency)}</div>
            <div className="text-xs text-slate-600 mt-1">{expected.count} Sent invoice{expected.count===1?'':'s'} awaiting payment{showDemo?' · preview':''}</div>
            <p className="text-[11px] text-slate-500 mt-2">Cash-flow forecast — Sent but unpaid. Not overdue yet.</p>
            <Link to="/invoices" className="inline-flex mt-3 text-xs font-semibold bg-white border border-indigo-200 rounded-full px-3 py-1.5 hover:bg-indigo-50">View Sent →</Link>
          </Card>

          <Card className={`p-5 md:col-span-2 ${overdue.count>0 ? 'border-red-200 bg-gradient-to-br from-red-50 to-white' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-[11px] font-bold tracking-widest uppercase ${overdue.count>0?'text-red-700':'text-slate-500'}`}>Overdue — urgency</div>
                <div className="text-2xl font-bold font-display mt-1">{overdue.count===0 ? 'All clear' : `${overdue.count} overdue · ${formatCurrency(overdue.total, displayCurrency)}`}</div>
                <div className="text-xs text-slate-600 mt-1">{overdue.count===0 ? 'No late payments — you’re on top of it.' : 'Sorted by most late · Tap Send Reminder for a polite nudge'}</div>
              </div>
              {overdue.count>0 && <span className="text-[11px] font-bold bg-red-600 text-white rounded-full px-2.5 py-1 animate-pulse">{overdue.list[0]?.days} days late · top</span>}
            </div>

            {overdue.count===0 ? (
              <p className="text-xs text-slate-500 mt-4 bg-white border border-gray-100 rounded-xl p-3">When an invoice passes its due date, it appears here with exactly how late it is.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {overdue.list.slice(0,4).map(({inv, bal, days})=>(
                  <li key={inv.id} className="bg-white border border-red-100 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{inv.invoice_number}</span>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${days>=14?'bg-red-600 text-white border-red-600': days>=7?'bg-amber-500 text-white border-amber-500':'bg-amber-50 text-amber-700 border-amber-200'}`}>{days} {days===1?'day':'days'} late</span>
                      </div>
                      <div className="text-sm font-medium truncate mt-0.5">{inv.client_name} <span className="text-slate-400 font-normal">· {formatCurrency(bal, displayCurrency)} · due {inv.due_date}</span></div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={()=> openReminder(inv)} className="text-xs bg-slate-900 text-white rounded-full px-3 py-1.5 font-semibold hover:bg-black transition">Nudge</button>
                      <Link to="/invoices" className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50">Open</Link>
                    </div>
                  </li>
                ))}
                {overdue.count>4 && <li className="text-[11px] text-slate-500 text-center pt-1">+ {overdue.count-4} more overdue — see Invoices</li>}
              </ul>
            )}
          </Card>
        </div>

        {/* Payment Nudge — 3 severity templates */}
        {reminderFor && (
          <Card className="p-5 border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-sm">Payment Nudge — {reminderFor.inv.invoice_number} · {reminderFor.inv.client_name}</h3>
                <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">{reminderFor.days} days late</span> · {formatCurrency(reminderFor.bal, displayCurrency)} · due {reminderFor.inv.due_date} · <span className={`inline-flex text-[10px] font-bold border rounded-full px-2 py-0.5 ${reminderFor.severity==='gentle'?'bg-emerald-50 text-emerald-700 border-emerald-200':reminderFor.severity==='professional'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200'}`}>{reminderFor.severity==='gentle'?'Gentle · 1–3 days':reminderFor.severity==='professional'?'Professional · 4–10 days':'Final · 10+ days'} recommended</span></p>
              </div>
              <button onClick={()=> setReminderFor(null)} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-slate-50">✕ Close</button>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mt-4">
              {[
                { key:'gentle', data: reminderFor.templates.gentle, accent:'emerald' },
                { key:'professional', data: reminderFor.templates.professional, accent:'amber' },
                { key:'final', data: reminderFor.templates.final, accent:'red' },
              ].map(({key, data: t, accent})=>{
                const isRecommended = reminderFor.severity===key
                return (
                  <div key={key} className={`bg-white border rounded-xl p-3 flex flex-col ${isRecommended ? `ring-2 ${accent==='emerald'?'ring-emerald-200 border-emerald-300':accent==='amber'?'ring-amber-200 border-amber-300':'ring-red-200 border-red-300'} shadow-sm` : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold tracking-widest uppercase border rounded-full px-2 py-1 ${accent==='emerald'?'bg-emerald-50 text-emerald-700 border-emerald-200':accent==='amber'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200'}`}>{t.badge}</span>
                      {isRecommended && <span className="text-[10px] font-bold bg-slate-900 text-white rounded-full px-2 py-0.5">Recommended</span>}
                    </div>
                    <div className="font-display font-semibold text-xs mt-2">{t.title}</div>
                    <div className="text-[11px] text-slate-500">{t.tone}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2 truncate">Subject: {t.subject}</div>
                    <div className="mt-2 flex-1">
                      <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">WhatsApp</div>
                      <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap bg-white border border-gray-100 rounded-lg p-2">{t.whatsapp}</p>
                      <button onClick={()=> copyNudge(t.whatsapp, key+'-wa')} className={`mt-2 w-full text-xs rounded-full px-3 py-1.5 font-semibold ${isRecommended?'bg-teal-700 text-white hover:bg-teal-800':'bg-white border border-gray-200 hover:bg-slate-50'}`}>{copiedId===key+'-wa'?'✓ Copied':'Copy WhatsApp'}</button>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">Email</div>
                      <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-2">{t.email}</p>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={()=> copyNudge(t.email, key+'-em')} className={`flex-1 text-xs rounded-full px-2 py-1.5 font-semibold border ${isRecommended?'bg-white border-gray-200 hover:bg-slate-50':'bg-white border-gray-200 hover:bg-slate-50'}`}>{copiedId===key+'-em'?'✓ Copied':'Copy email'}</button>
                        <button onClick={()=> copyNudge(t.subject, key+'-sub')} className="text-xs bg-slate-900 text-white rounded-full px-2 py-1.5 hover:bg-black">{copiedId===key+'-sub'?'✓':'Copy subject'}</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-3 text-center">High-end professional English — makes you look like a serious agency. Copy-paste into WhatsApp or Email. Recommended template auto-selected by days overdue.</p>
          </Card>
        )}
      </div>

      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Income vs Expenses — last 6 months</h2>
          <span className="text-xs text-slate-500">Amounts in {displayCurrency}{showDemo?' · preview':''}</span>
        </div>
        {chartData.every(d=>d.inc===0 && d.exp===0) ? (
          <Empty
            variant="generic"
            title="Your financial journey starts here"
            desc="Add your first income to see the magic — your 6-month trend, cash flow and profit will bloom right here."
            action={<Link to="/income" className="bg-teal-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-teal-800 hover:shadow-md transition">Add your first income →</Link>}
          />
        ) : (
          <>
            <div className="flex items-end gap-2 md:gap-3 h-44 md:h-56 px-2">
              {chartData.map(d=>(
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="flex gap-1.5 items-end h-36 md:h-44 w-full justify-center">
                    <div className="flex-1 max-w-10 bg-gradient-to-t from-teal-700 to-teal-600 rounded-t-xl shadow-sm group-hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" style={{height: `${(d.inc/maxVal)*100}%`}} title={`Income ${d.inc}`}></div>
                    <div className="flex-1 max-w-10 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-xl shadow-sm group-hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" style={{height: `${(d.exp/maxVal)*100}%`}} title={`Expenses ${d.exp}`}></div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 tracking-wide">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center text-xs mt-4 font-medium">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-700 shadow-sm"></span> Income</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span> Expenses</span>
            </div>
            {showDemo && <p className="text-[11px] text-center text-teal-700 mt-3 font-medium">Previewing sample studio data — add your own to personalize</p>}
          </>
        )}
      </Card>

      {outstanding.outstanding > 0 && (
        <Card className="p-5 border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Needs attention — {formatCurrency(outstanding.outstanding, displayCurrency)} still owed{showDemo && <span className="ml-2 text-[11px] font-normal text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">preview</span>}</h3>
            <Link to="/invoices" className="text-xs font-semibold text-teal-700 hover:underline">Open invoices →</Link>
          </div>
          <ul className="divide-y divide-amber-100">
            {[...displayInvoices].filter(inv=> amountOutstanding(inv) > 0).sort((a,b)=> a.due_date.localeCompare(b.due_date)).slice(0,4).map(inv=>{
              const bal = amountOutstanding(inv)
              const overdue = inv.due_date < new Date().toISOString().slice(0,10)
              return (
                <li key={inv.id} className="py-2 flex items-center justify-between text-sm gap-2">
                  <span className="truncate"><span className="font-mono text-xs font-semibold">{inv.invoice_number}</span> · {inv.client_name} <span className="text-slate-400">· due {inv.due_date}</span></span>
                  <span className="flex items-center gap-2 shrink-0"><span className="font-semibold">{formatCurrency(bal, displayCurrency)}</span><span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${overdue?'bg-red-50 text-red-700 border-red-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{overdue?'Overdue':'Due'}</span></span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Recent income</h3>
            {showDemo && <span className="text-[10px] font-bold tracking-widest uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-1">Preview</span>}
          </div>
          {displayIncome.length===0 ? <p className="text-sm text-slate-500">No income yet — <Link to="/income" className="text-teal-700 font-medium hover:underline">add one</Link></p> :
          <ul className="divide-y divide-gray-100">
            {[...displayIncome].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(i=>(
              <li key={i.id} className="py-2.5 flex justify-between text-sm"><span className="truncate pr-3">{i.description||i.client_name||'Income'} <span className="text-slate-400">· {i.date}</span></span><span className="font-semibold">{formatCurrency(i.amount, displayCurrency)}</span></li>
            ))}
          </ul>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Recent expenses</h3>
            {showDemo && <span className="text-[10px] font-bold tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">Preview</span>}
          </div>
          {displayExpenses.length===0 ? <p className="text-sm text-slate-500">No expenses yet — <Link to="/expenses" className="text-teal-700 font-medium hover:underline">add one</Link></p> :
          <ul className="divide-y divide-gray-100">
            {[...displayExpenses].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(e=>(
              <li key={e.id} className="py-2.5 flex justify-between text-sm"><span className="truncate pr-3">{e.description||e.category} <span className="text-slate-400">· {e.category} · {e.date}</span></span><span className="font-semibold">{formatCurrency(e.amount, displayCurrency)}</span></li>
            ))}
          </ul>}
        </Card>
      </div>
    </div>
  )
}

function isSameMonthLocal(dateStr, year, month){
  if(!dateStr) return false
  const d=new Date(dateStr)
  return d.getFullYear()===year && d.getMonth()===month
}
function Stat({ title, value, sub, color, demo }){
  const map={ teal:'bg-teal-50 text-teal-700 border-teal-100', amber:'bg-amber-50 text-amber-700 border-amber-100', emerald:'bg-emerald-50 text-emerald-700 border-emerald-100', red:'bg-red-50 text-red-700 border-red-100' }
  return <Card className={`p-5 relative overflow-hidden ${demo?'ring-1 ring-teal-200/50':''}`}>
    {demo && <div className="absolute top-3 right-3 text-[9px] font-bold tracking-widest uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Demo</div>}
    <div className={`inline-flex text-[10px] tracking-widest uppercase font-bold px-2.5 py-1 rounded-full border ${map[color]||'bg-gray-50 border-gray-100'}`}>{title}</div>
    <div className="text-2xl font-bold mt-3 tracking-tight font-display">{value}</div>
    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{sub}</div>
  </Card>
}
