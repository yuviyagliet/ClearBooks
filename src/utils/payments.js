// Invoice payment helpers — single source of truth for paid/outstanding/status logic.
// An invoice carries a `payments` array: [{ id, amount, date, note?, created_at? }]
// Legacy invoices marked "Paid" without payments are treated as fully paid.

// --- Pipeline: Draft → Sent → Overdue → Paid ---
// Draft: not yet sent (sent_at == null) and unpaid, or explicit status 'Draft'
// Sent: sent_at != null, due_date >= today, unpaid
// Overdue: due_date < today and unpaid (balance >0)
// Paid: balance ==0
// We keep legacy derived statuses (Partial, Due soon) for UI fidelity and map them into pipeline.

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
// Returns one of: 'Paid' | 'Partial' | 'Overdue' | 'Due soon' | 'Unpaid' | 'Sent' | 'Draft'
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
  return inv.sent_at ? 'Sent' : (inv.status === 'Draft' ? 'Draft' : 'Unpaid')
}

export const STATUS_BADGE = {
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partial': 'bg-sky-50 text-sky-700 border-sky-200',
  'Overdue (partial)': 'bg-red-50 text-red-700 border-red-200',
  'Overdue': 'bg-red-50 text-red-700 border-red-200',
  'Due soon': 'bg-amber-50 text-amber-700 border-amber-200',
  'Sent': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Unpaid': 'bg-amber-50 text-amber-700 border-amber-200',
  'Draft': 'bg-slate-50 text-slate-600 border-slate-200',
}

export function statusBadgeClass(status) {
  return STATUS_BADGE[status] || 'bg-gray-50 text-gray-600 border-gray-200'
}

// === PIPELINE (Payment Command Center) ===
export const PIPELINE_STEPS = ['Draft', 'Sent', 'Overdue', 'Paid']
export const PIPELINE_BADGE = {
  'Draft': 'bg-slate-50 text-slate-600 border-slate-200',
  'Sent': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Overdue': 'bg-red-50 text-red-700 border-red-200',
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function pipelineStatus(inv, today = todayStr()){
  if (isPaid(inv)) return 'Paid'
  const overdue = inv.due_date && inv.due_date < today && amountOutstanding(inv) > 0
  if (overdue) return 'Overdue'
  if (inv.sent_at) return 'Sent'
  // Legacy: status 'Draft' explicit, or Unsent -> Draft
  if (inv.status === 'Draft') return 'Draft'
  // Treat legacy Unpaid without sent_at as Draft
  return 'Draft'
}

export function pipelineBadgeClass(step){
  return PIPELINE_BADGE[step] || 'bg-gray-50 text-gray-600 border-gray-200'
}

export function daysOverdue(inv, today = todayStr()){
  if (!inv.due_date) return 0
  if (amountOutstanding(inv) <= 0) return 0
  const due = new Date(inv.due_date)
  const t = new Date(today)
  // strip time
  due.setHours(0,0,0,0); t.setHours(0,0,0,0)
  const diff = Math.floor((t - due)/(24*3600*1000))
  return diff > 0 ? diff : 0
}

export function daysUntilDue(inv, today = todayStr()){
  if (!inv.due_date) return null
  const due = new Date(inv.due_date)
  const t = new Date(today)
  due.setHours(0,0,0,0); t.setHours(0,0,0,0)
  return Math.floor((due - t)/(24*3600*1000))
}

export function urgencyLabel(inv){
  const d = daysOverdue(inv)
  if (d <= 0) return null
  if (d === 1) return '1 day late'
  return `${d} days late`
}

export function expectedIncome(invoices, today = todayStr()){
  // Sent but unpaid, not overdue — i.e., pipeline Sent and outstanding>0
  let total = 0, count = 0
  invoices.forEach(inv=>{
    const pipe = pipelineStatus(inv, today)
    const bal = amountOutstanding(inv)
    if (pipe === 'Sent' && bal > 0) { total += bal; count += 1 }
  })
  return { total, count }
}

export function overdueSummary(invoices, today = todayStr()){
  let total = 0, count = 0
  const list = []
  invoices.forEach(inv=>{
    if (pipelineStatus(inv, today) === 'Overdue'){
      const bal = amountOutstanding(inv)
      const days = daysOverdue(inv, today)
      total += bal; count += 1
      list.push({ inv, bal, days })
    }
  })
  list.sort((a,b)=> b.days - a.days)
  return { total, count, list }
}

// === Reminder Copy Generator — polite, professional nudge ===
// Returns variants for WhatsApp/Email copy-paste. Freelancer can choose tone.
export function generateReminder(inv, { client, businessName='ClearBooks', currency='$', paid, bal, daysLate } = {}){
  const cName = inv.client_name || client?.name || 'there'
  const invNo = inv.invoice_number || 'your invoice'
  const due = inv.due_date || 'recently'
  const amount = typeof bal === 'number' ? bal : amountOutstanding(inv)
  const days = typeof daysLate === 'number' ? daysLate : daysOverdue(inv)
  const urgency = days > 0 ? `${days} day${days===1?'':'s'} late` : `due ${due}`
  const biz = businessName || 'us'
  // Polite professional — short for WhatsApp, fuller for email
  const whatsapp = `Hi ${cName}, hope you’re well! Quick nudge — ${invNo} for ${formatCurrency(amount, currency)} was due ${due} (${urgency}). Could you let me know when to expect it? Happy to resend the PDF if helpful. Thanks so much — ${biz}.`
  const emailSubject = `Friendly reminder — ${invNo} ${urgency} (${formatCurrency(amount, currency)})`
  const emailBody = `Hi ${cName},\n\nHope you’re doing well.\n\nJust a gentle nudge — ${invNo} for ${formatCurrency(amount, currency)} was due on ${due}${days>0?` and is now ${days} day${days===1?'':'s'} overdue`:''}. The outstanding balance is ${formatCurrency(amount, currency)}.\n\nIf you’ve already sent it, please ignore this note and thank you! If not, could you share an expected date? I’m happy to resend the invoice or payment details.\n\nPayment details are on the invoice PDF. Let me know if you need anything else.\n\nWarm regards,\n${biz}`
  const short = `Hi ${cName}, ${invNo} — ${formatCurrency(amount, currency)} due ${due} · ${urgency}. Link to PDF?`
  return { whatsapp, emailSubject, emailBody, short, amount, days, urgency }
}

// === Payment Nudge System — 3 severity templates (high-end agency English) ===
// Gentle (1-3 days) · Professional (4-10 days) · Final Notice (10+ days)
export function getNudgeSeverity(days){
  const d = Number(days)||0
  if (d <= 3) return 'gentle'
  if (d <= 10) return 'professional'
  return 'final'
}

export function getNudgeTemplates(inv, { businessName='ClearBooks', currency='$', bal, daysLate } = {}){
  const cName = inv.client_name || 'there'
  const invNo = inv.invoice_number || 'your invoice'
  const due = inv.due_date || 'recently'
  const amount = typeof bal === 'number' ? bal : amountOutstanding(inv)
  const days = typeof daysLate === 'number' ? daysLate : daysOverdue(inv)
  const biz = businessName || 'ClearBooks'
  const amtStr = formatCurrency(amount, currency)
  const severity = getNudgeSeverity(days)
  // Proposed settlement for final notice: today + 2 business days
  const today = new Date()
  const settleBy = new Date(today.getTime()+2*24*3600*1000).toISOString().slice(0,10)

  const gentle = {
    id: 'gentle',
    title: 'The Gentle Reminder',
    badge: '1–3 days late',
    tone: 'Friendly check-in',
    subject: `Quick check-in — ${invNo} (due ${due})`,
    whatsapp: `Hi ${cName}, hope you're well! Friendly check-in — ${invNo} for ${amtStr} was due on ${due} (${days} day${days===1?'':'s'} ago). It may have slipped through a busy week — no worries at all. Could you share when it might be scheduled? Happy to resend the PDF or payment details if helpful. Appreciate your partnership.\n\n — ${biz}`,
    email: `Hi ${cName},\n\nHope you're well.\n\nJust a friendly check-in — ${invNo} for ${amtStr} was due on ${due} and is now ${days} day${days===1?'':'s'} overdue. No rush if it's already in motion — it may have simply slipped through.\n\nCould you let me know the expected date? I'm happy to resend the invoice or bank/UPI details. If it's already sent, please disregard and thank you.\n\nWarm regards,\n${biz}\n${invNo} · ${amtStr} · Due ${due}`,
  }
  const professional = {
    id: 'professional',
    title: 'The Professional Follow-up',
    badge: '4–10 days late',
    tone: 'Payment schedules & accounting',
    subject: `Following up — ${invNo} — payment schedule for accounting`,
    whatsapp: `Hi ${cName}, following up on ${invNo} for ${amtStr} — due on ${due}, now ${days} days overdue. For our accounting close this week, could you confirm the payment timeline? If it's already processed, please share the reference/UTR and we'll reconcile immediately. Thanks for your support.\n\n — ${biz}`,
    email: `Hi ${cName},\n\nFollowing up on ${invNo} for ${amtStr}, due on ${due} — now ${days} days overdue (outstanding ${amtStr}).\n\nFor our accounting schedule, could you confirm the payment timeline this week? If it's already in motion, please disregard — just share the reference and we'll close it out.\n\nPayment details are on the PDF. Let me know if you need anything else.\n\nThank you for your partnership.\nWarm regards,\n${biz}\n${invNo} · Due ${due} · ${amtStr}`,
  }
  const final = {
    id: 'final',
    title: 'The Final Notice',
    badge: '10+ days late',
    tone: 'Urgent settlement & project hold',
    subject: `Action required — ${invNo} overdue ${days} days — settlement needed`,
    whatsapp: `Hi ${cName}, ${invNo} for ${amtStr} is now ${days} days overdue (due ${due}). To avoid a temporary hold on revisions and upcoming deliverables, please arrange settlement by ${settleBy} or share a firm payment date this week. If it's already underway, please share the reference and we'll reconcile right away. Thanks for prompt attention.\n\n — ${biz}`,
    email: `Hi ${cName},\n\n${invNo} for ${amtStr} is now ${days} days overdue (due on ${due}). Outstanding balance: ${amtStr}.\n\nTo keep the project timeline on track and avoid a temporary hold on revisions and deliverables, please arrange settlement by ${settleBy} or confirm a firm payment date this week.\n\nIf the transfer is already in progress, please share the UTR/reference and we'll reconcile immediately. Payment instructions are on the invoice PDF — happy to resend if needed.\n\nThank you for your prompt attention to this.\n\nBest regards,\n${biz}\n${invNo} · Due ${due} · ${amtStr} · ${days} days overdue`,
  }

  const all = { gentle, professional, final }
  const recommended = all[severity]
  return { severity, days, amount, amtStr, templates: all, recommended, cName, invNo, due, biz }
}

function formatCurrency(n, symbol='$'){
  const num = Number(n||0)
  return symbol + num.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})
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
