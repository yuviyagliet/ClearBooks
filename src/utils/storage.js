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
    { id: 'inv1', invoice_number: 'INV-1001', client_id: 'c1', client_name: 'Acme Co', issue_date: new Date().toISOString().slice(0,10), due_date: new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10), status: 'Unpaid', line_items: [{description:'Design', quantity:1, rate:2500, total:2500}], total_amount: 2500 },
  ],
  settings: { name: 'Alex Freelancer', business_name: 'Alex Studio', currency: '$' },
  invoice_counter: 1002,
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(defaultData))
      return structuredClone(defaultData)
    }
    return JSON.parse(raw)
  } catch { return structuredClone(defaultData) }
}
export function saveLocal(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}
export function resetLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(defaultData))
  return structuredClone(defaultData)
}
