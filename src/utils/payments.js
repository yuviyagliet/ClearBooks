// Invoice payment helpers — single source of truth for paid/outstanding/status logic.
// An invoice carries a `payments` array: [{ id, amount, date, note?, created_at? }]
// Legacy invoices marked "Paid" without payments are treated as fully paid.

export function getPayments(inv) {
  if (Array.isArray(inv.payments)) return inv.payments
  // Legacy migration: status Paid but no payment records
  if (inv.status === 'Paid' && Number(inv.total_amount) > 0) {
    return [{ id: 'migrated', amount: Number(inv.total_amount), date: inv.issue_date, note: 'Marked as paid (legacy)' }]
  }
  return []
}

export function amountPaid(inv) {
  return getPayments(inv).reduce((s, p) => s + (Number(p.amount) || 0), 0)
}

export function amountOutstanding(inv) {
  const out = Number(inv.total_amount || 0) - amountPaid(inv)
  return out > 0 ? out : 0
}

export function isPaid(inv) {
  return amountOutstanding(inv) <= 0 && Number(inv.total_amount) > 0
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// Derived status — never trust the stored status column alone.
// Returns one of: 'Paid' | 'Partial' | 'Overdue' | 'Due soon' | 'Unpaid' | 'Sent'
export function invoiceStatus(inv, today = todayStr()) {
  if (isPaid(inv)) return 'Paid'
  if (amountPaid(inv) > 0) {
    return inv.due_date && inv.due_date < today ? 'Overdue (partial)' : 'Partial'
  }
  if (inv.due_date && inv.due_date < today) return 'Overdue'
  if (inv.due_date) {
    const days = Math.floor((new Date(inv.due_date) - new Date(today)) / (24 * 3600 * 1000))
    if (days <= 7) return 'Due soon'
  }
  return inv.sent_at ? 'Sent' : 'Unpaid'
}

export const STATUS_BADGE = {
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partial': 'bg-sky-50 text-sky-700 border-sky-200',
  'Overdue (partial)': 'bg-red-50 text-red-700 border-red-200',
  'Overdue': 'bg-red-50 text-red-700 border-red-200',
  'Due soon': 'bg-amber-50 text-amber-700 border-amber-200',
  'Sent': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Unpaid': 'bg-amber-50 text-amber-700 border-amber-200',
}

export function statusBadgeClass(status) {
  return STATUS_BADGE[status] || 'bg-gray-50 text-gray-600 border-gray-200'
}

// Money actually received in a date range (inclusive), from invoice payments.
export function paymentsInRange(invoices, from, to) {
  const f = new Date(from), t = new Date(to)
  let total = 0
  const rows = []
  invoices.forEach(inv => {
    getPayments(inv).forEach(p => {
      const d = new Date(p.date)
      if (d >= f && d <= t) {
        total += Number(p.amount) || 0
        rows.push({ ...p, invoice: inv })
      }
    })
  })
  return { total, rows }
}

export function outstandingSummary(invoices) {
  let outstanding = 0, overdue = 0, openCount = 0
  const today = todayStr()
  invoices.forEach(inv => {
    const bal = amountOutstanding(inv)
    if (bal <= 0) return
    openCount += 1
    outstanding += bal
    if (inv.due_date && inv.due_date < today) overdue += bal
  })
  return { outstanding, overdue, openCount }
}
