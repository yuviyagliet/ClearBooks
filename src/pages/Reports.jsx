import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Card, Button, Input, Label } from '../components/UI'
import { formatCurrency, exportCSV } from '../utils/helpers'
import { amountPaid, amountOutstanding, paymentsInRange } from '../utils/payments'
import { taxLabel } from '../utils/helpers'

export default function Reports(){
  const { data } = useData()
  const [from, setFrom] = useState(()=> new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10))
  const [to, setTo] = useState(()=> new Date().toISOString().slice(0,10))

  const isInvalidRange = useMemo(()=> new Date(from) > new Date(to), [from, to])

  const filtered = useMemo(()=>{
    const f = new Date(from), t = new Date(to)
    const inRange = (dStr)=>{
      const d=new Date(dStr); return d>=f && d<=t
    }
    if (isInvalidRange) return { income: [], expenses: [], invoices: [], totalIncome: 0, totalExpenses: 0, net: 0, byCategory: {}, totalTax: 0, taxByInvoice: [], invoicedTotal: 0, invoicePaidTotal: 0, invoiceOutstanding: 0 }
    const income = data.income.filter(i=> inRange(i.date))
    const expenses = data.expenses.filter(e=> inRange(e.date))
    const invoices = data.invoices.filter(inv=> inRange(inv.issue_date))
    const totalIncome = income.reduce((s,x)=>s+Number(x.amount),0)
    const totalExpenses = expenses.reduce((s,x)=>s+Number(x.amount),0)
    const byCategory = {}
    expenses.forEach(e=>{ byCategory[e.category]=(byCategory[e.category]||0)+Number(e.amount)})
    // Tax summary: always use each invoice's own stored tax type + rate, never global settings
    const taxByInvoice = invoices.map(inv=>{
      const rate = Number(inv.tax_rate ?? 0)
      const ttype = inv.tax_type || (rate > 0 ? 'custom' : 'none')
      const grand = Number(inv.total_amount || 0)
      const sub = Number(inv.subtotal ?? (rate ? grand / (1 + rate/100) : grand))
      const tax = Number(inv.tax_amount ?? (sub * rate / 100))
      return { ...inv, _rate: rate, _type: ttype, _sub: sub, _tax: tax }
    })
    const totalTax = taxByInvoice.reduce((s,inv)=> s + inv._tax, 0)
    // Invoiced vs Received: unpaid invoices are money owed, NOT income
    const invoicedTotal = invoices.reduce((s,inv)=> s + (Number(inv.total_amount)||0), 0)
    const invoicePaidTotal = invoices.reduce((s,inv)=> s + amountPaid(inv), 0)
    const invoiceOutstanding = invoices.reduce((s,inv)=> s + amountOutstanding(inv), 0)
    return { income, expenses, invoices, totalIncome, totalExpenses, net: totalIncome-totalExpenses, byCategory, totalTax, taxByInvoice, invoicedTotal, invoicePaidTotal, invoiceOutstanding }
  }, [data, from, to, isInvalidRange])

  const maxCat = Math.max(1, ...Object.values(filtered.byCategory))
  const colors = ['#0f766e','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6']

  const handleExport=()=>{
    if (isInvalidRange) return
    const rows = [['Type','Date','Invoice Number','Client','Category','Description','Amount','Tax Type','Tax Rate %','Tax Amount','Total','Paid','Outstanding','Currency','Status']]
    filtered.income.forEach(i=> rows.push(['Income', i.date, '', i.client_name||'', '', i.description||'', i.amount, '', '', '', '', '', '', data.settings.currency, '']))
    filtered.expenses.forEach(e=> rows.push(['Expense', e.date, '', '', e.category||'', e.description||'', e.amount, '', '', '', '', '', '', data.settings.currency, '']))
    filtered.taxByInvoice.forEach(inv=> rows.push(['Invoice', inv.issue_date, inv.invoice_number, inv.client_name||'', '', (inv.line_items||[]).map(l=>l.description).join('; '), inv._sub, inv._type, inv._rate, inv._tax, inv.total_amount, amountPaid(inv), amountOutstanding(inv), data.settings.currency, inv.status]))
    exportCSV(`clearbooks-export-${from}_to_${to}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-gray-500">Filter by date, see breakdown, export CSV for your records and tax preparation.</p></div>
        <Button onClick={handleExport} disabled={isInvalidRange} aria-disabled={isInvalidRange}>⬇ Export CSV</Button>
      </div>

      <Card className="p-5 flex flex-wrap gap-4 items-end">
        <div><Label htmlFor="reports-from">From</Label><Input id="reports-from" type="date" value={from} onChange={e=>setFrom(e.target.value)} max={to} /></div>
        <div><Label htmlFor="reports-to">To</Label><Input id="reports-to" type="date" value={to} onChange={e=>setTo(e.target.value)} min={from} /></div>
        <div className="text-xs text-gray-500 pb-2">Showing {filtered.income.length} income + {filtered.expenses.length} expenses</div>
      </Card>
      {isInvalidRange && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">The start date must be earlier than or equal to the end date.</div>}

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-teal-700">Received (income)</div><div className="text-2xl font-bold mt-1">{formatCurrency(filtered.totalIncome, data.settings.currency)}</div><div className="text-[11px] text-gray-400 mt-1">Cash actually received</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-amber-700">Total expenses</div><div className="text-2xl font-bold mt-1">{formatCurrency(filtered.totalExpenses, data.settings.currency)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-violet-700">Tax collected</div><div className="text-2xl font-bold mt-1">{formatCurrency(filtered.totalTax, data.settings.currency)}</div><div className="text-[11px] text-gray-400 mt-1">Sum of each invoice’s own tax type + rate</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wide font-bold text-gray-700">Net profit</div><div className={`text-2xl font-bold mt-1 ${filtered.net>=0?'text-emerald-700':'text-red-600'}`}>{formatCurrency(filtered.net, data.settings.currency)}</div><div className="text-[11px] text-gray-400 mt-1">Received − expenses</div></Card>
      </div>
      {/* Invoiced vs Received — unpaid invoices are NOT income */}
      <Card className="p-5 border-amber-200 bg-amber-50/30">
        <h3 className="font-semibold text-sm">Invoices in range — owed vs received</h3>
        <p className="text-[11px] text-gray-500 mt-1">Unpaid invoices are money you’re owed, not income. They don’t count toward profit until the client pays.</p>
        <div className="grid grid-cols-3 gap-3 mt-3 text-center">
          <div className="bg-white border border-gray-200 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wide text-gray-500">Invoiced</div><div className="font-bold">{formatCurrency(filtered.invoicedTotal, data.settings.currency)}</div></div>
          <div className="bg-white border border-emerald-200 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wide text-emerald-700">Paid</div><div className="font-bold text-emerald-700">{formatCurrency(filtered.invoicePaidTotal, data.settings.currency)}</div></div>
          <div className="bg-white border border-amber-200 rounded-xl p-3"><div className="text-[10px] uppercase tracking-wide text-amber-700">Outstanding</div><div className="font-bold text-amber-700">{formatCurrency(filtered.invoiceOutstanding, data.settings.currency)}</div></div>
        </div>
      </Card>
      {filtered.invoices.length>0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Tax by invoice (per-invoice rate)</h3>
          <p className="text-xs text-gray-500 mb-3">Each invoice’s GST/VAT is snapshotted at creation — changing default rate never affects past invoices. {filtered.taxByInvoice.some(i=>i._taxMigrated) && <span className="text-amber-600 font-medium">Some older invoices were backfilled and may need manual review.</span>}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="text-left px-3 py-2">Invoice</th><th className="text-left px-3 py-2">Date</th><th className="text-right px-3 py-2">Subtotal</th><th className="text-right px-3 py-2">Tax</th><th className="text-right px-3 py-2">Tax Amt</th><th className="text-right px-3 py-2">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.taxByInvoice.map(inv=>(
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number}{inv._taxMigrated && <span className="ml-1 text-amber-600" title="Backfilled, review needed">*</span>}</td>
                    <td className="px-3 py-2 text-xs">{inv.issue_date}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv._sub, data.settings.currency)}</td>
                    <td className="px-3 py-2 text-right">{taxLabel(inv._type, inv._rate)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(inv._tax, data.settings.currency)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(inv.total_amount, data.settings.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
