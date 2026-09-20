export function formatCurrency(n, symbol='$') {
  const num = Number(n||0)
  return symbol + num.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})
}
export function cn(...a){ return a.filter(Boolean).join(' ') }

export function last6Months() {
  const out=[]
  const now=new Date()
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1)
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('en-US',{month:'short'}), year:d.getFullYear(), month:d.getMonth() })
  }
  return out
}
export function isSameMonth(dateStr, year, month){
  const d=new Date(dateStr)
  return d.getFullYear()===year && d.getMonth()===month
}
export function exportCSV(filename, rows){
  const csv = rows.map(r=> r.map(v=> `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob=new Blob([csv],{type:'text/csv'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
}
export const EXPENSE_CATEGORIES = ['Software','Travel','Equipment','Marketing','Office Supplies','Other']
