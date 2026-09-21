import { Link } from 'react-router-dom'

function Wrapper({ title, children }){
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-3xl mx-auto px-6 py-6 border-b border-gray-100 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold"><span className="w-7 h-7 rounded-lg bg-teal-700 text-white grid place-items-center text-xs">◈</span> ClearBooks</Link>
        <Link to="/" className="text-xs border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50">← Back to home</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="prose prose-sm max-w-none text-sm text-gray-600 mt-6 leading-relaxed space-y-4">
          {children}
        </div>
      </main>
    </div>
  )
}

export function Privacy(){
  return <Wrapper title="Privacy Policy">
    <p><strong>Last updated:</strong> September 2025</p>
    <p>ClearBooks is a freelance ledger. We minimize data collection.</p>
    <h3 className="font-semibold text-gray-900">What we collect</h3>
    <p>Your email, and the income, expenses, clients, and invoices you create. Receipt images you upload.</p>
    <h3 className="font-semibold text-gray-900">How we use it</h3>
    <p>To provide your ledger, generate invoices/PDFs, and show your dashboard/reports. We do not sell your data.</p>
    <h3 className="font-semibold text-gray-900">Who can see it</h3>
    <p>No one else. Records are separated by account and are not visible to other users. You can export your CSV or delete your account and all associated data in Settings at any time.</p>
    <h3 className="font-semibold text-gray-900">Contact</h3>
    <p>Questions? <a href="mailto:hello@clearbooks.app" className="text-teal-700 underline">hello@clearbooks.app</a></p>
  </Wrapper>
}

export function Terms(){
  return <Wrapper title="Terms">
    <p>ClearBooks is provided as-is while in beta, free to use.</p>
    <p>You are responsible for the accuracy of your financial records. ClearBooks does not provide accounting or tax advice — consult a professional for tax decisions.</p>
    <p>You can delete your account and data at any time in Settings. We may update these terms with notice on the site.</p>
    <p>Contact: <a href="mailto:hello@clearbooks.app" className="text-teal-700 underline">hello@clearbooks.app</a></p>
  </Wrapper>
}

export function Security(){
  return <Wrapper title="Security">
    <p>Your financial data stays private. Records are separated by account and are not visible to other users.</p>
    <p>Authentication via Supabase Auth, data isolated by Row Level Security (user_id = auth.uid()). You can export or delete all data in Settings.</p>
    <p>Receipts are stored privately per account with user-scoped access. No bank syncing — we never see your bank credentials.</p>
    <p>Report an issue: <a href="mailto:hello@clearbooks.app" className="text-teal-700 underline">hello@clearbooks.app</a></p>
  </Wrapper>
}
