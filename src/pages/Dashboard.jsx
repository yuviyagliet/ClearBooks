import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Empty } from '../components/UI'
import { formatCurrency, last6Months, exportCSV } from '../utils/helpers'
import { track } from '../lib/analytics'

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

  // Onboarding checklist: 3 items, hide when all complete
  const hasIncome = data.income.length > 0
  const hasExpense = data.expenses.length > 0
  const hasInvoice = data.invoices.length > 0
  const allDone = hasIncome && hasExpense && hasInvoice
  const showChecklist = !allDone

  const now=new Date()
  const ym = now.toISOString().slice(0,7)
  const incomeMonth = data.income.filter(i=> i.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const expenseMonth = data.expenses.filter(e=> e.date?.slice(0,7)===ym).reduce((s,x)=>s+Number(x.amount||0),0)
  const profit = incomeMonth - expenseMonth

  const months = last6Months()
  const chartData = months.map(m=>{
    const inc = data.income.filter(i=> isSameMonthLocal(i.date,m.year,m.month)).reduce((s,x)=>s+Number(x.amount),0)
    const exp = data.expenses.filter(e=> isSameMonthLocal(e.date,m.year,m.month)).reduce((s,x)=>s+Number(x.amount),0)
    return { label:m.label, inc, exp }
  })
  const maxVal = Math.max(1, ...chartData.flatMap(d=>[d.inc,d.exp]))

  const handleExportAll = ()=>{
    const rows = [['Type','Date','Invoice Number','Client','Category','Description','Amount','Tax Rate %','Tax Amount','Total','Currency','Status']]
    data.income.forEach(i=> rows.push(['Income', i.date, '', i.client_name||'', '', i.description||'', i.amount, '', '', '', data.settings.currency, '']))
    data.expenses.forEach(e=> rows.push(['Expense', e.date, '', '', e.category||'', e.description||'', e.amount, '', '', '', data.settings.currency, '']))
    data.invoices.forEach(inv=>{
      const rate = Number(inv.tax_rate ?? 0)
      const grand = Number(inv.total_amount || 0)
      const sub = Number(inv.subtotal ?? (rate ? grand / (1 + rate/100) : grand))
      const tax = Number(inv.tax_amount ?? (sub * rate / 100))
      rows.push(['Invoice', inv.issue_date, inv.invoice_number, inv.client_name||'', '', (inv.line_items||[]).map(l=>l.description).join('; '), sub, rate, tax, grand, data.settings.currency, inv.status])
    })
    const date = new Date().toISOString().slice(0,10)
    exportCSV(`clearbooks-export-${date}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500">Your freelance money at a glance — {now.toLocaleString('en-US',{month:'long', year:'numeric'})}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/income" className="bg-teal-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-teal-800">＋ Add Income</Link>
          <Link to="/expenses" className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">＋ Add Expense</Link>
          <button onClick={handleExportAll} className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-black">⬇ Export CSV</button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat title="Income this month" value={formatCurrency(incomeMonth, data.settings.currency)} sub={`${data.income.filter(i=>i.date?.slice(0,7)===ym).length} entries`} color="teal" />
        <Stat title="Expenses this month" value={formatCurrency(expenseMonth, data.settings.currency)} sub={`${data.expenses.filter(e=>e.date?.slice(0,7)===ym).length} entries`} color="amber" />
        <Stat title="Net profit" value={formatCurrency(profit, data.settings.currency)} sub={profit>=0?'Positive cash flow':'Negative — watch spend'} color={profit>=0?'emerald':'red'} />
      </div>

      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Income vs Expenses — last 6 months</h2>
          <span className="text-xs text-gray-500">Amounts in {data.settings.currency}</span>
        </div>
        {chartData.every(d=>d.inc===0 && d.exp===0) ? (
          <Empty title="No data yet" desc="Add income or expenses to see your 6-month trend." action={<Link to="/income" className="text-sm bg-teal-700 text-white rounded-xl px-4 py-2">Add your first income</Link>} />
        ) : (
          <>
            <div className="flex items-end gap-2 md:gap-3 h-44 md:h-56 px-2">
              {chartData.map(d=>(
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex gap-1.5 items-end h-36 md:h-44 w-full justify-center">
                    <div className="flex-1 max-w-10 bg-teal-700 rounded-t-lg transition" style={{height: `${(d.inc/maxVal)*100}%`}} title={`Income ${d.inc}`}></div>
                    <div className="flex-1 max-w-10 bg-amber-500 rounded-t-lg transition" style={{height: `${(d.exp/maxVal)*100}%`}} title={`Expenses ${d.exp}`}></div>
                  </div>
                  <span className="text-xs text-gray-500">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center text-xs mt-4">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-700"></span> Income</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Expenses</span>
            </div>
          </>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Recent income</h3>
          {data.income.length===0 ? <p className="text-sm text-gray-500">No income yet — <Link to="/income" className="text-teal-700 font-medium">add one</Link></p> :
          <ul className="divide-y divide-gray-100">
            {[...data.income].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(i=>(
              <li key={i.id} className="py-2.5 flex justify-between text-sm"><span className="truncate pr-3">{i.description||i.client_name||'Income'} <span className="text-gray-400">· {i.date}</span></span><span className="font-semibold">{formatCurrency(i.amount, data.settings.currency)}</span></li>
            ))}
          </ul>}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Recent expenses</h3>
          {data.expenses.length===0 ? <p className="text-sm text-gray-500">No expenses yet — <Link to="/expenses" className="text-teal-700 font-medium">add one</Link></p> :
          <ul className="divide-y divide-gray-100">
            {[...data.expenses].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,5).map(e=>(
              <li key={e.id} className="py-2.5 flex justify-between text-sm"><span className="truncate pr-3">{e.description||e.category} <span className="text-gray-400">· {e.category} · {e.date}</span></span><span className="font-semibold">{formatCurrency(e.amount, data.settings.currency)}</span></li>
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
function Stat({ title, value, sub, color }){
  const map={ teal:'bg-teal-50 text-teal-700', amber:'bg-amber-50 text-amber-700', emerald:'bg-emerald-50 text-emerald-700', red:'bg-red-50 text-red-700' }
  return <Card className="p-5">
    <div className={`inline-flex text-[10px] tracking-wide uppercase font-bold px-2 py-1 rounded-full ${map[color]||'bg-gray-50'}`}>{title}</div>
    <div className="text-2xl font-bold mt-2">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{sub}</div>
  </Card>
}
