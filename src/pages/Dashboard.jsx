import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Empty, SkeletonCard, BentoSkeletonGrid } from '../components/UI'
import { formatCurrency, last6Months, exportCSV } from '../utils/helpers'
import { outstandingSummary, paymentsInRange, amountOutstanding, pipelineStatus, daysOverdue, expectedIncome, overdueSummary, generateReminder, getNudgeTemplates } from '../utils/payments'
import { track } from '../lib/analytics'
import { getDemoData } from '../utils/demoData'

export default function Dashboard(){
  const { data, loading } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  useEffect(()=>{
    if (!user) return
    try {
      const pending = localStorage.getItem('clearbooks_just_signed_up') === 'true'
      const onboardedKey = `clearbooks_has_onboarded_${user.id}`
      const hasOnboarded = localStorage.getItem(onboardedKey) === 'true'
      const userPending = localStorage.getItem(`clearbooks_onboarding_pending_${user.id}`) === 'true'
      const isNewUser = (data.income.length===0 && data.expenses.length===0 && data.invoices.length===0) && !hasOnboarded
      let shouldLaunch = false
      if ((pending || userPending) && !hasOnboarded) shouldLaunch = true
      if (isNewUser && !hasOnboarded && !pending && !userPending) {
        const hasEverVisited = localStorage.getItem(onboardedKey) !== null
        if (!hasEverVisited) {
          const createdAt = user.created_at ? new Date(user.created_at).getTime() : Date.now()
          if (Date.now() - createdAt < 10*60*1000) shouldLaunch = true
        }
      }
      if (shouldLaunch) {
        localStorage.removeItem('clearbooks_just_signed_up')
        localStorage.removeItem(`clearbooks_onboarding_pending_${user.id}`)
        localStorage.setItem(onboardedKey, 'true')
        try { track('onboarding_auto_launched', { user_id: user.id }) } catch {}
        navigate('/income?onboarding=first_signup', { replace: true })
      }
    } catch {}
  }, [user, data.income.length, data.expenses.length, data.invoices.length, navigate])

  const hasIncome = data.income.length > 0
  const hasExpense = data.expenses.length > 0
  const hasInvoice = data.invoices.length > 0
  const allDone = hasIncome && hasExpense && hasInvoice
  const showChecklist = !allDone

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
  const incomeMonth = displayIncome.filter(i=> i.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const monthStart = `${ym}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10)
  const invoicePaidMonth = paymentsInRange(displayInvoices, monthStart, monthEnd).total
  const receivedMonth = incomeMonth + invoicePaidMonth
  const outstanding = outstandingSummary(displayInvoices)
  const expenseMonth = displayExpenses.filter(e=> e.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const profit = receivedMonth - expenseMonth

  const pipelineCounts = useMemo(()=>{
    const c = { Draft:0, Sent:0, Overdue:0, Paid:0 }
    displayInvoices.forEach(inv=>{ const p = pipelineStatus(inv); c[p] = (c[p]||0)+1 })
    return c
  }, [displayInvoices])
  const expected = useMemo(()=> expectedIncome(displayInvoices), [displayInvoices])
  const overdue = useMemo(()=> overdueSummary(displayInvoices), [displayInvoices])
  const [reminderFor, setReminderFor] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const openReminder = (inv)=>{
    const days = daysOverdue(inv)
    const bal = amountOutstanding(inv)
    const business = data.settings.business_name || data.settings.name || 'ClearBooks'
    const nudge = getNudgeTemplates(inv, { businessName: business, currency: displayCurrency, bal, daysLate: days })
    setReminderFor({ inv, days, bal, ...nudge })
    setCopiedId(null)
    try{ track('nudge_opened', { invoice: inv.invoice_number, days, severity: nudge.severity }) }catch{}
    try{ track('reminder_generator_opened', { invoice: inv.invoice_number, days }) }catch{}
  }
  const copyNudge = async (text, id)=>{
    try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=> setCopiedId(null), 1800); try{ track('nudge_copied', { id }) }catch{} }catch{ alert(text) }
  }
  const copyReminder = copyNudge

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

  if (loading) return <BentoSkeletonGrid />

  return (
    <div className="space-y-6">
      {/* — Studio Header — */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase text-cyan-300">
            <span className="w-6 h-[1px] bg-cyan-400/60" /> Command Center
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-500 font-medium tracking-widest normal-case">Post-production • {now.toLocaleString('en-US',{month:'long', year:'numeric'})}</span>
          </div>
          <h1 className="text-[30px] md:text-[36px] font-bold tracking-[-0.03em] text-white mt-1">Dashboard</h1>
          <p className="text-[13px] text-slate-400 mt-1 font-light tracking-wide">Your studio money — glass-clear. Outstanding is the hero.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link to="/invoices" className="btn-neon rounded-xl px-5 py-2.5 text-sm font-bold tracking-tight hover:shadow-[0_0_32px_rgba(6,182,214,0.5)]">✦ Create Invoice</Link>
          <Link to="/income" className="glass rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white border border-white/10">＋ Income</Link>
          <Link to="/expenses" className="glass rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 border border-white/10">＋ Expense</Link>
          <button onClick={handleExportAll} className="bg-white text-slate-900 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 shadow">⬇ Export</button>
        </div>
      </div>

      {/* — Demo aura — */}
      {showDemo && (
        <div className="bento-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-cyan-400/20" style={{ background: 'linear-gradient(135deg, rgba(6,182,214,0.10), rgba(16,185,129,0.07) 55%, rgba(255,255,255,0.03))' }}>
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-cyan-200 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" /> Sample data — preview mode
            </div>
            <h3 className="font-display font-semibold text-[15px] text-white mt-3">Feel the studio — no setup needed</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-[560px] leading-relaxed">FrameFlow Post • Mosaic Pictures • Lumen — explore the command center. Add your own data and this preview dissolves.</p>
          </div>
          <div className="flex gap-2 shrink-0 relative">
            <button onClick={clearDemo} className="text-sm glass rounded-xl px-4 py-2.5 font-semibold text-slate-200 border border-white/10 hover:bg-white/10">Clear Demo</button>
            <Link to="/income" className="btn-neon text-sm rounded-xl px-4 py-2.5 font-semibold">Add your first income →</Link>
          </div>
        </div>
      )}
      {isEmpty && hideDemo && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 text-sm border border-white/8">
          <span className="text-slate-400">Demo hidden — workspace pristine.</span>
          <button onClick={restoreDemo} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Show demo again</button>
        </div>
      )}

      {/* — Checklist — bento */}
      {showChecklist && (
        <Card className="p-5 !bg-cyan-500/[0.06] border-cyan-400/15">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm text-white tracking-tight">Get started — 3 steps to activate your ledger</h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Complete once. This bento hides when all three glow.</p>
            </div>
            <span className="text-xs bg-white text-slate-900 rounded-full px-3 py-1 font-bold tracking-wide">{[hasIncome, hasExpense, hasInvoice].filter(Boolean).length}/3</span>
          </div>
          <ul className="mt-4 grid md:grid-cols-3 gap-2">
            {[
              { done: hasIncome, to: '/income', n: '1', label: 'Add your first income' },
              { done: hasExpense, to: '/expenses', n: '2', label: 'Add your first expense' },
              { done: hasInvoice, to: '/invoices', n: '3', label: 'Create your first invoice' },
            ].map(item=>(
              <li key={item.n}>
                <Link to={item.to} className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition ${item.done ? 'glass border-emerald-400/20 bg-emerald-500/8' : 'glass border-white/8 hover:border-cyan-400/20 hover:bg-white/5'}`}>
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 border ${item.done ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-400 border-white/10'}`}>{item.done ? '✓' : item.n}</span>
                  <span className={`font-medium ${item.done ? 'text-emerald-300 line-through decoration-emerald-400/40' : 'text-slate-200'}`}>{item.label}</span>
                  <span className={`ml-auto text-xs font-semibold ${item.done ? 'text-emerald-300' : 'text-cyan-300'}`}>{item.done ? 'Done' : '→'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* — BENTO COMMAND CENTER — */}
      <div className="grid grid-cols-12 gap-4 auto-rows-auto">
        {/* HERO — Outstanding — largest card */}
        <Card className="col-span-12 lg:col-span-8 min-h-[320px] p-0 overflow-hidden border-amber-500/12 lg:row-span-2">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(700px 320px at 18% 0%, rgba(251,146,60,0.10), transparent 60%), radial-gradient(520px 260px at 92% 100%, rgba(6,182,214,0.08), transparent 65%)' }} />
          <div className="relative p-6 md:p-7 h-full flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" /> Outstanding Payments
                  <span className="bg-amber-500/15 border border-amber-500/20 text-amber-200 rounded-full px-2 py-0.5 tracking-widest">Hero</span>
                </div>
                <div className="text-[36px] md:text-[44px] font-bold tracking-[-0.04em] text-white mt-2 leading-none font-serif" style={{ fontFamily: 'Fraunces, ui-serif, Georgia, serif' }}>{formatCurrency(outstanding.outstanding, displayCurrency)}</div>
                <div className="text-xs text-slate-400 mt-2 font-light tracking-wide">
                  {outstanding.openCount===0 ? 'Nothing owed — studio is clear' : `${outstanding.openCount} open invoice${outstanding.openCount===1?'':'s'} • ${outstanding.overdue>0 ? `${formatCurrency(outstanding.overdue, displayCurrency)} overdue` : 'all on time'}`}
                  {showDemo && <span className="ml-2 text-cyan-300 font-medium">· preview</span>}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Cash in flight</span>
                <div className="w-16 h-16 rounded-2xl grid place-items-center border border-amber-500/15 bg-amber-500/8 backdrop-blur" style={{ boxShadow: '0 8px 24px rgba(251,146,60,0.18), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <span className="text-xl">◈</span>
                </div>
              </div>
            </div>

            {/* overdue urgency strip */}
            {outstanding.outstanding > 0 ? (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Needs nudge</span>
                  <Link to="/invoices" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Open invoices →</Link>
                </div>
                <ul className="space-y-2">
                  {[...displayInvoices].filter(inv=> amountOutstanding(inv) > 0).sort((a,b)=> a.due_date.localeCompare(b.due_date)).slice(0,3).map(inv=>{
                    const bal = amountOutstanding(inv)
                    const isOver = inv.due_date < new Date().toISOString().slice(0,10)
                    return (
                      <li key={inv.id} className="glass rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 border border-white/8 hover:border-white/12 hover:bg-white/[0.07] transition">
                        <span className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-white">{inv.invoice_number}</span>
                          <span className="text-slate-500 mx-1">·</span>
                          <span className="text-sm text-slate-200 truncate">{inv.client_name}</span>
                          <span className="text-xs text-slate-500 ml-2">due {inv.due_date}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-white">{formatCurrency(bal, displayCurrency)}</span>
                          <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${isOver?'bg-red-500/15 text-red-300 border-red-500/20':'bg-amber-500/12 text-amber-300 border-amber-500/20'}`}>{isOver?'Overdue':'Due'}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {displayInvoices.filter(inv=> amountOutstanding(inv)>0).length > 3 && (
                  <p className="text-[11px] text-slate-500 text-center">+ {displayInvoices.filter(inv=> amountOutstanding(inv)>0).length - 3} more — see Invoices</p>
                )}
              </div>
            ) : (
              <div className="mt-6 glass rounded-xl p-4 border border-emerald-500/12 bg-emerald-500/5">
                <p className="text-sm text-emerald-200 font-medium">All clear — no outstanding. Studio is funded.</p>
                <p className="text-xs text-slate-400 mt-1">Unpaid invoices appear here with urgency, sorted by most late.</p>
              </div>
            )}

            <div className="mt-auto pt-5 flex gap-2">
              <Link to="/invoices" className="flex-1 btn-neon rounded-xl py-2.5 text-center text-sm font-bold">View Pipeline →</Link>
              <button onClick={handleExportAll} className="glass rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 border border-white/10 hover:text-white">Export</button>
            </div>
          </div>
        </Card>

        {/* — Stack on right — Received + Net Profit — */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:content-start">
          <BentoStat label="Received this month" value={formatCurrency(receivedMonth, displayCurrency)} sub={`Cash in hand${invoicePaidMonth>0 ? ` • ${formatCurrency(invoicePaidMonth, displayCurrency)} invoice` : ''}`} accent="cyan" demo={showDemo} />
          <BentoStat label="Net profit" value={formatCurrency(profit, displayCurrency)} sub={profit>=0?'Positive cash flow':'Negative — watch spend'} accent={profit>=0?'emerald':'red'} demo={showDemo} pulse={profit>=0} />
        </div>

        {/* — Expenses — third bento */}
        <Card className="col-span-6 lg:col-span-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-orange-300">Expenses</span>
            <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
          </div>
          <div className="text-[28px] font-bold tracking-tight text-white mt-2">{formatCurrency(expenseMonth, displayCurrency)}</div>
          <div className="text-xs text-slate-400 mt-1 font-light">{displayExpenses.filter(e=>e.date?.slice(0,7)===ym).length} entries • this month</div>
          <div className="mt-4 h-[2px] rounded-full overflow-hidden bg-white/8">
            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400" style={{ width: `${Math.min(100, (expenseMonth/Math.max(1, receivedMonth))*100)}%` }} />
          </div>
        </Card>

        {/* — Pipeline stepper — bento */}
        <Card className="col-span-6 lg:col-span-8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-display font-semibold text-[13px] tracking-tight text-white">Pipeline</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-white text-slate-900 rounded-full px-2 py-0.5">Draft → Sent → Overdue → Paid</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { k:'Draft', c: pipelineCounts.Draft, tone:'slate' },
              { k:'Sent', c: pipelineCounts.Sent, tone:'cyan' },
              { k:'Overdue', c: pipelineCounts.Overdue, tone:'red' },
              { k:'Paid', c: pipelineCounts.Paid, tone:'emerald' },
            ].map((s,i)=> (
              <div key={s.k} className={`relative rounded-2xl p-3.5 border backdrop-blur overflow-hidden ${s.c>0 ? (s.k==='Overdue' ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_16px_rgba(239,68,68,0.15)]' : s.k==='Sent' ? 'bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_16px_rgba(6,182,214,0.15)]' : 'bg-white/[0.05] border-white/10') : 'bg-white/[0.03] border-white/5'}`}>
                <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{i+1}. {s.k}</div>
                <div className="text-2xl font-bold text-white mt-1 tracking-tight">{s.c}</div>
                <div className="text-[11px] text-slate-500">{s.k==='Draft'?'Not sent': s.k==='Sent'?'Awaiting': s.k==='Overdue'?'Needs nudge':'Cash in'}</div>
                {i<3 && <span className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">›</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* — Forecast + Overdue Nudge — second bento row */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4 p-5 border-cyan-400/15" style={{ background: 'linear-gradient(180deg, rgba(6,182,214,0.09), rgba(255,255,255,0.02))' }}>
          <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-cyan-300">Expected Income — Forecast</div>
          <div className="text-[30px] font-bold tracking-tight text-white mt-2">{formatCurrency(expected.total, displayCurrency)}</div>
          <div className="text-xs text-slate-400 mt-1 font-light">{expected.count} Sent invoice{expected.count===1?'':'s'} awaiting payment{showDemo?' · preview':''}</div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Cash-flow forecast — Sent but unpaid. Not overdue yet.</p>
          <Link to="/invoices" className="inline-flex mt-3 text-xs font-semibold glass rounded-full px-3 py-1.5 text-cyan-200 border border-cyan-400/15 hover:bg-cyan-500/10">View Sent →</Link>
        </Card>

        <Card className={`col-span-12 lg:col-span-8 p-5 ${overdue.count>0 ? 'border-red-500/18' : 'border-white/8'}`} style={overdue.count>0? { background: 'linear-gradient(180deg, rgba(239,68,68,0.08), rgba(255,255,255,0.02))' } : {}}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-[10px] font-bold tracking-[0.16em] uppercase ${overdue.count>0?'text-red-300':'text-slate-500'}`}>Overdue — urgency</div>
              <div className="text-2xl font-bold tracking-tight text-white mt-1">{overdue.count===0 ? 'All clear' : `${overdue.count} overdue · ${formatCurrency(overdue.total, displayCurrency)}`}</div>
              <div className="text-xs text-slate-400 mt-1 font-light">{overdue.count===0 ? 'No late payments — you’re on top of it.' : 'Sorted by most late · Tap Nudge for polite follow-up'}</div>
            </div>
            {overdue.count>0 && <span className="text-[11px] font-bold bg-red-500 text-white rounded-full px-2.5 py-1 shadow-[0_0_16px_rgba(239,68,68,0.4)] animate-pulse">{overdue.list[0]?.days} days late · top</span>}
          </div>

          {overdue.count===0 ? (
            <p className="text-xs text-slate-400 mt-4 glass rounded-xl p-3 border border-white/8">When an invoice passes its due date, it appears here with exactly how late it is.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {overdue.list.slice(0,3).map(({inv, bal, days})=>(
                <li key={inv.id} className="glass rounded-xl p-3 flex items-center justify-between gap-3 border border-white/8">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-white">{inv.invoice_number}</span>
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${days>=14?'bg-red-500 text-white border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.4)]': days>=7?'bg-amber-500 text-white border-amber-500/20':'bg-amber-500/12 text-amber-300 border-amber-500/20'}`}>{days} {days===1?'day':'days'} late</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200 truncate mt-0.5">{inv.client_name} <span className="text-slate-500 font-normal">· {formatCurrency(bal, displayCurrency)} · due {inv.due_date}</span></div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={()=> openReminder(inv)} className="text-xs bg-white text-slate-900 rounded-full px-3 py-1.5 font-semibold hover:bg-slate-100 shadow">Nudge</button>
                    <Link to="/invoices" className="text-xs glass rounded-full px-3 py-1.5 text-slate-300 border border-white/10 hover:text-white">Open</Link>
                  </div>
                </li>
              ))}
              {overdue.count>3 && <li className="text-[11px] text-slate-500 text-center pt-1">+ {overdue.count-3} more overdue — see Invoices</li>}
            </ul>
          )}
        </Card>
      </div>

      {/* — Nudge panel — glass */}
      {reminderFor && (
        <Card className="p-5 border-cyan-400/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-white">Payment Nudge — {reminderFor.inv.invoice_number} · {reminderFor.inv.client_name}</h3>
              <p className="text-xs text-slate-400 mt-1"><span className="font-semibold text-slate-200">{reminderFor.days} days late</span> · {formatCurrency(reminderFor.bal, displayCurrency)} · due {reminderFor.inv.due_date} · <span className={`inline-flex text-[10px] font-bold border rounded-full px-2 py-0.5 ${reminderFor.severity==='gentle'?'bg-emerald-500/12 text-emerald-300 border-emerald-500/20':reminderFor.severity==='professional'?'bg-amber-500/12 text-amber-300 border-amber-500/20':'bg-red-500/12 text-red-300 border-red-500/20'}`}>{reminderFor.severity==='gentle'?'Gentle · 1–3 days':reminderFor.severity==='professional'?'Professional · 4–10 days':'Final · 10+ days'} recommended</span></p>
            </div>
            <button onClick={()=> setReminderFor(null)} className="text-xs glass rounded-full px-3 py-1.5 text-slate-400 hover:text-white border border-white/10">✕ Close</button>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {[
              { key:'gentle', data: reminderFor.templates.gentle, accent:'emerald' },
              { key:'professional', data: reminderFor.templates.professional, accent:'amber' },
              { key:'final', data: reminderFor.templates.final, accent:'red' },
            ].map(({key, data: t})=>{
              const isRecommended = reminderFor.severity===key
              return (
                <div key={key} className={`rounded-xl p-3 flex flex-col border backdrop-blur ${isRecommended ? 'bg-white/[0.06] border-cyan-400/25 shadow-[0_8px_24px_rgba(6,182,214,0.15)]' : 'glass border-white/8'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold tracking-widest uppercase border rounded-full px-2 py-1 ${key==='gentle'?'bg-emerald-500/12 text-emerald-300 border-emerald-500/20':key==='amber'?'bg-amber-500/12 text-amber-300 border-amber-500/20': key==='final'?'bg-red-500/12 text-red-300 border-red-500/20':'bg-amber-500/12 text-amber-300 border-amber-500/20'}`}>{t.badge}</span>
                    {isRecommended && <span className="text-[10px] font-bold bg-cyan-400 text-slate-900 rounded-full px-2 py-0.5">Recommended</span>}
                  </div>
                  <div className="font-display font-semibold text-xs mt-2 text-white">{t.title}</div>
                  <div className="text-[11px] text-slate-500">{t.tone}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-2 glass rounded-lg p-2 truncate border border-white/5">Subject: {t.subject}</div>
                  <div className="mt-2 flex-1">
                    <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">WhatsApp</div>
                    <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap glass rounded-lg p-2 border border-white/5 text-slate-300">{t.whatsapp}</p>
                    <button onClick={()=> copyNudge(t.whatsapp, key+'-wa')} className={`mt-2 w-full text-xs rounded-full px-3 py-1.5 font-semibold ${isRecommended?'btn-neon':'glass border border-white/10 text-slate-300 hover:text-white'}`}>{copiedId===key+'-wa'?'✓ Copied':'Copy WhatsApp'}</button>
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500">Email</div>
                    <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap bg-black/20 border border-white/5 rounded-lg p-2 text-slate-300">{t.email}</p>
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={()=> copyNudge(t.email, key+'-em')} className="flex-1 text-xs rounded-full px-2 py-1.5 font-semibold glass border border-white/10 text-slate-300 hover:text-white">{copiedId===key+'-em'?'✓ Copied':'Copy email'}</button>
                      <button onClick={()=> copyNudge(t.subject, key+'-sub')} className="text-xs bg-white text-slate-900 rounded-full px-2 py-1.5 font-semibold hover:bg-slate-100">{copiedId===key+'-sub'?'✓':'Copy subject'}</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* — Chart bento — */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-white">Income vs Expenses — last 6 months</h2>
          <span className="text-xs text-slate-500 font-light tracking-wide">Amounts in {displayCurrency}{showDemo?' · preview':''}</span>
        </div>
        {chartData.every(d=>d.inc===0 && d.exp===0) ? (
          <Empty
            variant="generic"
            title="Your financial journey starts here"
            desc="Add your first income to see the magic — your 6-month trend, cash flow and profit will bloom right here."
            action={<Link to="/income" className="btn-neon rounded-xl px-5 py-2.5 text-sm font-semibold">Add your first income →</Link>}
          />
        ) : (
          <>
            <div className="flex items-end gap-2 md:gap-3 h-44 md:h-56 px-2">
              {chartData.map(d=>(
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="flex gap-1.5 items-end h-36 md:h-44 w-full justify-center">
                    <div className="flex-1 max-w-10 rounded-t-xl transition-all duration-500 hover:-translate-y-1" style={{height: `${(d.inc/maxVal)*100}%`, background: 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 55%, #0891b2 100%)', boxShadow: '0 4px 16px rgba(6,182,214,0.28)', border: '1px solid rgba(255,255,255,0.10)', borderBottom: 'none'}} title={`Income ${d.inc}`}></div>
                    <div className="flex-1 max-w-10 rounded-t-xl transition-all duration-500 hover:-translate-y-1" style={{height: `${(d.exp/maxVal)*100}%`, background: 'linear-gradient(180deg, #fdba74 0%, #fb923c 60%, #f97316 100%)', boxShadow: '0 4px 16px rgba(251,146,60,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none'}} title={`Expenses ${d.exp}`}></div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 tracking-wide">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center text-xs mt-4 font-medium">
              <span className="inline-flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-full shadow-sm" style={{background:'#06b6d4'}}></span> Income</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-full shadow-sm" style={{background:'#fb923c'}}></span> Expenses</span>
            </div>
            {showDemo && <p className="text-[11px] text-center text-cyan-300 mt-3 font-medium">Previewing sample studio data — add your own to personalize</p>}
          </>
        )}
      </Card>

      {/* — Recent bento — */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white">Recent income</h3>
            {showDemo && <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-1">Preview</span>}
          </div>
          {displayIncome.length===0 ? <p className="text-sm text-slate-500">No income yet — <Link to="/income" className="text-cyan-300 font-medium hover:underline">add one</Link></p> :
          <ul className="divide-y divide-white/5">
            {[...displayIncome].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(i=>(
              <li key={i.id} className="py-3 flex justify-between text-sm hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition"><span className="truncate pr-3 text-slate-300">{i.description||i.client_name||'Income'} <span className="text-slate-500">· {i.date}</span></span><span className="font-semibold text-white">{formatCurrency(i.amount, displayCurrency)}</span></li>
            ))}
          </ul>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-white">Recent expenses</h3>
            {showDemo && <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-1">Preview</span>}
          </div>
          {displayExpenses.length===0 ? <p className="text-sm text-slate-500">No expenses yet — <Link to="/expenses" className="text-cyan-300 font-medium hover:underline">add one</Link></p> :
          <ul className="divide-y divide-white/5">
            {[...displayExpenses].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(e=>(
              <li key={e.id} className="py-3 flex justify-between text-sm hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition"><span className="truncate pr-3 text-slate-300">{e.description||e.category} <span className="text-slate-500">· {e.category} · {e.date}</span></span><span className="font-semibold text-white">{formatCurrency(e.amount, displayCurrency)}</span></li>
            ))}
          </ul>}
        </Card>
      </div>

      <p className="text-[11px] text-slate-500 tracking-wide font-light">Invoiced ≠ income: unpaid sits in Outstanding until paid. Only received counts. {showDemo && <span className="text-cyan-400 font-medium">· Showing sample data</span>}</p>
    </div>
  )
}

function isSameMonthLocal(dateStr, year, month){
  if(!dateStr) return false
  const d=new Date(dateStr)
  return d.getFullYear()===year && d.getMonth()===month
}
function BentoStat({ label, value, sub, accent='cyan', demo, pulse=false }){
  const accentMap = {
    cyan: 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
    red: 'text-red-300 border-red-500/20 bg-red-500/10',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
    orange: 'text-orange-300 border-orange-500/20 bg-orange-500/10',
  }
  const dot = { cyan:'#06b6d4', emerald:'#10b981', red:'#ef4444', amber:'#f59e0b', orange:'#fb923c' }[accent] || '#06b6d4'
  return (
    <Card className={`p-5 relative overflow-hidden ${demo?'ring-1 ring-cyan-500/20':''} ${pulse?'shadow-[0_0_24px_rgba(16,185,129,0.12)]':''}`}>
      {demo && <div className="absolute top-3 right-3 text-[9px] font-bold tracking-widest uppercase text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5 backdrop-blur">Demo</div>}
      <div className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase font-bold px-2.5 py-1 rounded-full border backdrop-blur ${accentMap[accent]||accentMap.cyan}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} /> {label}
      </div>
      <div className="text-[26px] font-bold mt-3 tracking-[-0.02em] text-white leading-none">{value}</div>
      <div className="text-xs text-slate-400 mt-2 leading-relaxed font-light">{sub}</div>
      <div className="mt-4 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </Card>
  )
}
