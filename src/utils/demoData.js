// Premium demo data — high-end post-production freelancer
// Only shown when the user has zero real records + hasn't dismissed demo.

export function getDemoData(currency = '$') {
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const daysAgo = (n) => iso(new Date(today.getTime() - n * 24 * 3600 * 1000))
  const daysAhead = (n) => iso(new Date(today.getTime() + n * 24 * 3600 * 1000))

  const clients = [
    { id: 'demo-c1', name: 'Aarav Shah', company: 'FrameFlow Post', email: 'accounts@frameflow.studio', phone: '+91 98101 22334', billing_address: 'Bandra West, Mumbai — 400050', gstin: '27ABCDE1234F1Z5', notes: 'Retainer — Color + finishing' },
    { id: 'demo-c2', name: 'Mira Kapoor', company: 'Mosaic Pictures', email: 'mira@mosaic.pictures', phone: '+91 98765 00112', billing_address: 'Koramangala, Bengaluru', gstin: '29AACCM1234F1Z2', notes: 'Commercial slate' },
    { id: 'demo-c3', name: 'Noah Reed', company: 'Lumen Collective', email: 'noah@lumencollective.co', billing_address: 'SoHo, New York, NY 10013', notes: 'Documentary finishing' },
  ]

  const income = [
    { id: 'demo-i1', date: daysAgo(4), client_id: 'demo-c1', client_name: 'FrameFlow Post', amount: 85000, description: 'Feature — Color grading (Act 2 & 3)' },
    { id: 'demo-i2', date: daysAgo(11), client_id: 'demo-c2', client_name: 'Mosaic Pictures', amount: 42000, description: 'TVC — Beauty grade + grain pass' },
    { id: 'demo-i3', date: daysAgo(18), client_id: 'demo-c3', client_name: 'Lumen Collective', amount: 63000, description: 'Doc — Conforming & HDR trim' },
    { id: 'demo-i4', date: daysAgo(26), client_id: 'demo-c1', client_name: 'FrameFlow Post', amount: 35000, description: 'Retainer — Monthly look dev' },
  ]

  const expenses = [
    { id: 'demo-e1', date: daysAgo(2), category: 'Software', amount: 3200, description: 'DaVinci Resolve Studio Renewal', receipt_url: '' },
    { id: 'demo-e2', date: daysAgo(7), category: 'Equipment', amount: 18000, description: 'Reference monitor rental — Flanders DM240', receipt_url: '' },
    { id: 'demo-e3', date: daysAgo(12), category: 'Travel', amount: 8500, description: 'Mumbai → Bengaluru — client review', receipt_url: '' },
    { id: 'demo-e4', date: daysAgo(20), category: 'Office Supplies', amount: 2400, description: 'Calibrated viewing environment — paint & fabric', receipt_url: '' },
  ]

  const invoices = [
    {
      id: 'demo-inv0',
      invoice_number: 'INV-1043',
      client_id: 'demo-c1',
      client_name: 'FrameFlow Post',
      issue_date: daysAgo(1),
      due_date: daysAhead(10),
      status: 'Draft',
      line_items: [{ description: 'Feature — Trailer grade (teaser)', quantity: 1, rate: 38000, total: 38000 }],
      subtotal: 38000,
      tax_rate: 0,
      tax_type: 'none',
      tax_amount: 0,
      total_amount: 38000,
      payments: [],
      sent_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      revisions_included: 3,
      revisions_used: 1,
    },
    {
      id: 'demo-inv1',
      invoice_number: 'INV-1042',
      client_id: 'demo-c2',
      client_name: 'Mosaic Pictures',
      issue_date: daysAgo(3),
      due_date: daysAhead(4),
      status: 'Unpaid',
      line_items: [
        { description: 'Commercial — Primary grade (30s hero)', quantity: 1, rate: 48000, total: 48000 },
        { description: 'Film grain & halation pass', quantity: 1, rate: 8000, total: 8000 },
      ],
      subtotal: 56000,
      tax_rate: 18,
      tax_type: 'gst',
      tax_amount: 10080,
      total_amount: 66080,
      payments: [],
      sent_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      revisions_included: 2,
      revisions_used: 0,
    },
    {
      id: 'demo-inv2',
      invoice_number: 'INV-1041',
      client_id: 'demo-c1',
      client_name: 'FrameFlow Post',
      issue_date: daysAgo(9),
      due_date: daysAgo(2),
      status: 'Unpaid',
      line_items: [{ description: 'Episodic — Dailies + first light (Ep 4)', quantity: 6, rate: 9000, total: 54000 }],
      subtotal: 54000,
      tax_rate: 18,
      tax_type: 'gst',
      tax_amount: 9720,
      total_amount: 63720,
      payments: [{ id: 'demo-p1', amount: 20000, date: daysAgo(1), note: 'Advance via UPI' }],
      sent_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
      revisions_included: 2,
      revisions_used: 2,
    },
    {
      id: 'demo-inv3',
      invoice_number: 'INV-1040',
      client_id: 'demo-c3',
      client_name: 'Lumen Collective',
      issue_date: daysAgo(22),
      due_date: daysAgo(8),
      status: 'Paid',
      line_items: [{ description: 'Documentary — HDR trim + deliverables', quantity: 1, rate: 72000, total: 72000 }],
      subtotal: 72000,
      tax_rate: 0,
      tax_type: 'none',
      tax_amount: 0,
      total_amount: 72000,
      payments: [{ id: 'demo-p2', amount: 72000, date: daysAgo(6), note: 'Wire — Chase' }],
      payment_date: daysAgo(6),
      created_at: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString(),
      revisions_included: 3,
      revisions_used: 3,
    },
  ]

  const settings = { name: 'Alex Rivera', business_name: 'Rivera Color', currency, default_tax_rate: 18, default_tax_type: 'gst', default_revisions_included: 2 }

  return { clients, income, expenses, invoices, settings }
}

export function isDemoId(id) {
  return typeof id === 'string' && id.startsWith('demo-')
}
