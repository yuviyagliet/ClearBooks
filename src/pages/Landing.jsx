import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'

export default function Landing(){
  const { user } = useAuth()
  const handleCtaClick = () => {
    track('cta_click', { location: 'landing_hero', text: 'Create your free ledger' })
  }
  const handleHeaderCta = () => {
    track('cta_click', { location: 'landing_header', text: user ? 'Go to dashboard' : 'Create your free ledger' })
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg"><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center">◈</span> ClearBooks</div>
        <div className="flex items-center gap-3">
          {user ? <Link to="/dashboard" onClick={handleHeaderCta} className="text-sm font-medium border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50">Go to dashboard</Link>
          : <>
            <Link to="/login" className="text-sm font-medium px-3 py-2">Log in</Link>
            <Link to="/signup" onClick={handleHeaderCta} className="text-sm font-semibold bg-teal-700 text-white rounded-full px-5 py-2.5 hover:bg-teal-800">Create your free ledger</Link>
          </>}
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 md:pt-20 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-3 py-1">No bloat. Just money in & out.</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mt-4">Income, expenses, and invoices in one place for freelancers.</h1>
          <p className="text-gray-500 mt-4 text-lg leading-relaxed">ClearBooks is the minimal ledger for freelancers — track income, manage expenses, and create invoices without the accounting-software bloat.</p>
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mt-4">🔒 Your data is private and secured to your account.</p>
          <div className="flex flex-wrap gap-3 mt-6 items-center">
            <Link to={user?'/dashboard':'/signup'} onClick={handleCtaClick} className="bg-teal-700 text-white rounded-full px-7 py-3.5 text-sm font-semibold hover:bg-teal-800">{user?'Go to Dashboard':'Create your free ledger'}</Link>
            {!user && <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Log in</Link>}
            <span className="text-xs text-gray-400 self-center">Email + password • Secured by Supabase Auth + RLS</span>
          </div>
          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              {t:'Income & Expenses', d:'Add in seconds, attach receipts'},
              {t:'Invoices that pay', d:'PDFs + status tracking'},
              {t:'Tax-ready reports', d:'CSV export by date range'},
            ].map(f=> <li key={f.t} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50"><div className="font-semibold">{f.t}</div><div className="text-gray-500 text-xs mt-1">{f.d}</div></li>)}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-[2rem] -rotate-1"></div>
          <div className="relative bg-white border border-gray-200 rounded-[1.75rem] shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-semibold">Dashboard preview</div>
              <div className="text-xs bg-gray-900 text-white rounded-full px-2.5 py-1">This month</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {k:'Income', v:'$4,820', c:'text-teal-700 bg-teal-50'},
                {k:'Expenses', v:'$612', c:'text-amber-700 bg-amber-50'},
                {k:'Profit', v:'$4,208', c:'text-gray-900 bg-gray-50'},
              ].map(s=> <div key={s.k} className={`rounded-2xl p-3 border border-gray-100 ${s.c}`}><div className="text-[10px] uppercase tracking-wide opacity-70">{s.k}</div><div className="font-bold">{s.v}</div></div>)}
            </div>
            <div className="h-28 flex items-end gap-1.5">
              {[30,50,35,70,55,90].map((h,i)=> <div key={i} className={`flex-1 rounded-t-lg ${i%2?'bg-teal-700':'bg-teal-200'}`} style={{height: h+'%'}}></div>)}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2"><span>Jan</span><span>Jun</span></div>
            <div className="mt-6 flex gap-2">
              <div className="flex-1 border border-dashed border-gray-200 rounded-xl p-3 text-xs text-center text-gray-500">＋ Add Income</div>
              <div className="flex-1 border border-dashed border-gray-200 rounded-xl p-3 text-xs text-center text-gray-500">＋ Add Expense</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-6 border-t border-gray-100 mt-4">
        {[
          { title:'Built for freelancers', desc:'Clients, invoices, and profit — no bank syncing, no multi-currency, no team bloat in v1.'},
          { title:'Supabase-native & secure', desc:'Auth + Postgres + Storage with Row Level Security — every row is tied to user_id = auth.uid(). No one sees another’s data.'},
          { title:'Fast & minimal', desc:'White space, one accent color, mobile-ready. Empty states guide you, not blank screens.'},
        ].map(c=> <div key={c.title} className="rounded-2xl border border-gray-200 p-6 bg-white"><h3 className="font-semibold">{c.title}</h3><p className="text-sm text-gray-500 mt-2 leading-relaxed">{c.desc}</p></div>)}
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-gray-400 border-t border-gray-100 mt-2">
        ClearBooks — freelance ledger • Your data is private and secured to your account • Invoices via jsPDF
      </footer>
    </div>
  )
}
