import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card, Button, Empty } from '../components/UI'
import { formatCurrency, last6Months } from '../utils/helpers'

export default function Dashboard(){
  const { data } = useData()
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500">Your freelance money at a glance — {now.toLocaleString('en-US',{month:'long', year:'numeric'})}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/income" className="bg-teal-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-teal-800">＋ Add Income</Link>
          <Link to="/expenses" className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">＋ Add Expense</Link>
        </div>
      </div>

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
