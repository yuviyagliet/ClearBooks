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

// Tax handling: type is snapshotted per invoice. 'none' and 'exempt' always mean 0%.
// Default for new users is No tax — rates vary by jurisdiction, registration, client location.
export const TAX_TYPES = [
  { value: 'none', label: 'No tax' },
  { value: 'gst', label: 'GST' },
  { value: 'vat', label: 'VAT' },
  { value: 'custom', label: 'Custom' },
  { value: 'exempt', label: 'Tax exempt' },
]
export const DEFAULT_TAX_TYPE = 'none'
export const DEFAULT_TAX_RATE = 0
export function taxTypeLabel(type){
  return (TAX_TYPES.find(t=> t.value === type) || { label: 'Tax' }).label
}
// Human-readable tax line, e.g. "GST (18%)", "Tax exempt", "No tax"
export function taxLabel(type, rate){
  if (type === 'exempt') return 'Tax exempt'
  if (type === 'none' || Number(rate) <= 0) return 'No tax'
  return `${taxTypeLabel(type)} (${Number(rate)}%)`
}
