// LocalStorage fallback when Supabase not configured
const LS_KEY = 'clearbooks_data_v1'

const defaultData = {
  clients: [
    { id: 'c1', name: 'Acme Co', email: 'hello@acme.co', notes: 'Retainer client' },
    { id: 'c2', name: 'Jane Studio', email: 'jane@studio.com', notes: '' },
  ],
  income: [
    { id: 'i1', date: new Date().toISOString().slice(0,10), client_id: 'c1', client_name: 'Acme Co', amount: 2500, description: 'Website redesign' },
    { id: 'i2', date: new Date(Date.now()- 25*24*3600*1000).toISOString().slice(0,10), client_id: 'c2', client_name: 'Jane Studio', amount: 1200, description: 'Logo pack' },
  ],
  expenses: [
    { id: 'e1', date: new Date().toISOString().slice(0,10), category: 'Software', amount: 49, description: 'Figma', receipt_url: '' },
    { id: 'e2', date: new Date(Date.now()-10*24*3600*1000).toISOString().slice(0,10), category: 'Marketing', amount: 120, description: 'Ads', receipt_url: '' },
  ],
  invoices: [
    { id: 'inv1', invoice_number: 'INV-1001', client_id: 'c1', client_name: 'Acme Co', issue_date: new Date().toISOString().slice(0,10), due_date: new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10), status: 'Unpaid', line_items: [{description:'Design', quantity:1, rate:2500, total:2500}], total_amount: 2500, tax_rate: 0, subtotal: 2500, tax_amount: 0 },
  ],
  settings: { name: 'Alex Freelancer', business_name: 'Alex Studio', currency: '$', default_tax_rate: 18 },
  invoice_counter: 1002,
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(defaultData))
      return structuredClone(defaultData)
    }
    const parsed = JSON.parse(raw)
    // Migration: backfill tax_rate for old invoices + default_tax_rate for settings
    let migrated = false
    if (parsed.settings && parsed.settings.default_tax_rate == null) {
      parsed.settings.default_tax_rate = 18
      migrated = true
    }
    if (Array.isArray(parsed.invoices)) {
      parsed.invoices.forEach(inv => {
        if (inv.tax_rate == null) {
          inv.tax_rate = parsed.settings?.default_tax_rate ?? 18
          // flag for review
          inv._taxMigrated = true
          migrated = true
        }
        // ensure subtotal/tax_amount exist for display
        if (inv.subtotal == null) inv.subtotal = inv.total_amount || 0
        if (inv.tax_amount == null) inv.tax_amount = Number((inv.subtotal * (inv.tax_rate||0) / 100).toFixed(2))
        if (inv.total_amount == null) inv.total_amount = inv.subtotal + inv.tax_amount
        // migrate legacy "Paid" invoices into payment records
        if (!Array.isArray(inv.payments)) {
          inv.payments = inv.status === 'Paid'
            ? [{ id: 'mig-' + inv.id, amount: Number(inv.total_amount) || 0, date: inv.issue_date, note: 'Marked as paid (legacy)' }]
            : []
          migrated = true
        }
      })
      if (migrated) console.warn('Migrated old invoices to add tax_rate — historical data may need manual review (flagged _taxMigrated).')
    }
    if (migrated) localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    return parsed
  } catch { return structuredClone(defaultData) }
}
export function saveLocal(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}
export function resetLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(defaultData))
  return structuredClone(defaultData)
}
