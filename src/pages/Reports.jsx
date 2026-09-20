import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Label } from '../components/UI'
import { formatCurrency, exportCSV } from '../utils/helpers'

export default function Reports(){
  const { data } = useData()
  const [from, setFrom] = useState(()=> new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10))
  const [to, setTo] = useState(()=> new Date().toISOString().slice(0,10))

  const filtered = useMemo(()=>{
    const f = new Date(from), t = new Date(to)
    const inRange = (dStr)=>{
      const d=new Date(dStr); return d>=f && d<=t
    }
    const income = data.income.filter(i=> inRange(i.date))
    const expenses = data.expenses.filter(e=> inRange(e.date))
    const totalIncome = income.reduce((s,x)=>s+Number(x.amount),0)
    const totalExpenses = expenses.reduce((s,x)=>s+Number(x.amount),0)
    const byCategory = {}
    expenses.forEach(e=>{ byCategory[e.category]=(byCategory[e.category]||0)+Number(e.amount)})
    return { income, expenses, totalIncome, totalExpenses, net: totalIncome-totalExpenses, byCategory }
  }, [data, from, to])

  const maxCat = Math.max(1, ...Object.values(filtered.byCategory))
  const colors = ['#0f766e','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6']

  const handleExport=()=>{
    const rows = [['Type','Date','Category/Client','Description','Amount','Currency']]
    filtered.income.forEach(i=> rows.push(['Income', i.date, i.client_name||'', i.description||'', i.amount, data.settings.currency]))
    filtered.expenses.forEach(e=> rows.push(['Expense', e.date, e.category||'', e.description||'', e.amount, data.settings.currency]))
    exportCSV(`clearbooks-${from}_to_${to}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-gray-500">Filter by date, see breakdown, export CSV for tax season.</p></div>
        <Button onClick={handleExport}>⬇ Export CSV</Button>
      </div>

      <Card className="p-5 flex flex-wrap gap-4 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <div className="text-xs text-gray-500 pb-2">Showing {filtered.income.length} income + {filtered.expenses.length} expenses</div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-teal-700">Total income</div><div className="text-2xl font-bold mt-1">{formatCurrency(filtered.totalIncome, data.settings.currency)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-amber-700">Total expenses</div><div className="text-2xl font-bold mt-1">{formatCurrency(filtered.totalExpenses, data.settings.currency)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-gray-700">Net profit</div><div className={`text-2xl font-bold mt-1 ${filtered.net>=0?'text-emerald-700':'text-red-600'}`}>{formatCurrency(filtered.net, data.settings.currency)}</div></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Expenses by category</h3>
          {Object.keys(filtered.byCategory).length===0 ? <p className="text-sm text-gray-500">No expenses in range.</p> :
            <div className="space-y-3">
              {/* simple bar + pseudo pie */}
              <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                {Object.entries(filtered.byCategory).map(([cat, amt], i)=>{
                  const pct = (amt / filtered.totalExpenses)*100
                  return <div key={cat} title={`${cat} ${pct.toFixed(1)}%`} style={{ width: pct+'%', background: colors[i%colors.length] }}></div>
                })}
              </div>
              <div className="space-y-2">
                {Object.entries(filtered.byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt],i)=>(
                  <div key={cat} className="flex items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{background:colors[i%colors.length]}}></span>
                    <span className="flex-1">{cat}</span>
                    <span className="font-semibold">{formatCurrency(amt, data.settings.currency)}</span>
                    <span className="text-xs text-gray-500 w-12 text-right">{((amt/filtered.totalExpenses)*100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          }
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Details</h3>
          <div className="max-h-64 overflow-auto text-sm divide-y divide-gray-100">
            {[...filtered.income.map(i=>({...i, _type:'Income'})), ...filtered.expenses.map(e=>({...e,_type:'Expense'}))].sort((a,b)=> b.date.localeCompare(a.date)).map((r,i)=>(
              <div key={i} className="py-2 flex justify-between gap-2">
                <span className="truncate"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r._type==='Income'?'bg-teal-50 text-teal-700':'bg-amber-50 text-amber-700'}`}>{r._type}</span> {r.date} · {r.description||r.category||r.client_name||'—'}</span>
                <span className="font-semibold whitespace-nowrap">{r._type==='Expense'?'-':''}{formatCurrency(r.amount, data.settings.currency)}</span>
              </div>
            ))}
            {filtered.income.length===0 && filtered.expenses.length===0 && <p className="text-gray-500 py-4">No records in this range.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
