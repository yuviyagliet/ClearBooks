import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'

export default function Landing(){
  const { user } = useAuth()
  const handleCtaClick = () => {
    track('cta_click', { location: 'landing_hero', text: 'Start tracking for free' })
  }
  const handleHeaderCta = () => {
    track('cta_click', { location: 'landing_header', text: user ? 'Go to dashboard' : 'Start tracking for free' })
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg"><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center">◈</span> ClearBooks</div>
        <div className="flex items-center gap-3">
          {user ? <Link to="/dashboard" onClick={handleHeaderCta} className="text-sm font-medium border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50">Go to dashboard</Link>
          : <>
            <Link to="/login" className="text-sm font-medium px-3 py-2">Log in</Link>
            <Link to="/signup" onClick={handleHeaderCta} className="text-sm font-semibold bg-teal-700 text-white rounded-full px-5 py-2.5 hover:bg-teal-800">Start tracking for free</Link>
          </>}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-10 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-3 py-1">No bloat. Just money in & out.</div>
          <h1 className="text-4xl md:text-[42px] font-bold tracking-tight leading-[1.08] mt-4">A simple money dashboard for freelancers who don’t want accounting software.</h1>
          <p className="text-gray-600 mt-4 text-[17px] leading-relaxed">Income, expenses, and invoices in one place — track profit without spreadsheets or a full accounting setup.</p>
          
          {/* CTA */}
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-3">
              <Link to={user?'/dashboard':'/signup'} onClick={handleCtaClick} className="bg-teal-700 text-white rounded-full px-7 py-3.5 text-sm font-semibold hover:bg-teal-800">Start tracking for free →</Link>
              {!user && <span className="text-xs text-gray-500">No credit card required · Set up in 2 minutes</span>}
            </div>
            {!user && <p className="text-xs text-gray-500 mt-2">Already have an account? <Link to="/login" className="text-teal-700 font-medium hover:underline">Log in</Link></p>}
          </div>

          {/* Trust - outcome focused, no dev jargon */}
          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-3 flex gap-3">
            <span className="text-teal-700 mt-0.5">🔒</span>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-gray-900">Your financial data stays private</span>
              <span className="text-gray-600"> — records are separated by account and aren’t visible to other users. Export or delete anytime. You own your data.</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Free while in beta · No subscription required</p>

          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              {t:'Income & Expenses', d:'Add in seconds, attach receipts'},
              {t:'Invoices that pay', d:'PDFs + status tracking'},
              {t:'Tax-ready reports', d:'CSV export when you need it'},
            ].map(f=> <li key={f.t} className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/50"><div className="font-semibold text-[13px]">{f.t}</div><div className="text-gray-500 text-xs mt-1">{f.d}</div></li>)}
          </ul>
        </div>

        {/* Visual - Example dashboard + Invoice */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-[2rem] -rotate-1"></div>
          <div className="relative bg-white border border-gray-200 rounded-[1.75rem] shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">Example dashboard</div>
              <div className="text-[11px] bg-gray-900 text-white rounded-full px-2.5 py-1">Demo data</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                {k:'Income', v:'$4,820', c:'text-teal-700 bg-teal-50'},
                {k:'Expenses', v:'$612', c:'text-amber-700 bg-amber-50'},
                {k:'Profit', v:'$4,208', c:'text-gray-900 bg-gray-50'},
              ].map(s=> <div key={s.k} className={`rounded-2xl p-3 border border-gray-100 ${s.c}`}><div className="text-[10px] uppercase tracking-wide opacity-70">{s.k} · last 6 mo</div><div className="font-bold text-sm mt-0.5">{s.v}</div></div>)}
            </div>
            <div className="h-24 flex items-end gap-1.5">
              {[30,50,35,70,55,90].map((h,i)=> <div key={i} className={`flex-1 rounded-t-lg ${i%2?'bg-teal-700':'bg-teal-200'}`} style={{height: h+'%'}}></div>)}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2"><span>Jan</span><span>Jun</span></div>
            
            {/* Invoice preview inside visual */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Invoice · INV-1007</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Paid</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Client: Acme Co</span><span className="font-medium">$2,500.00</span></div>
                <div className="flex justify-between mt-1 text-[11px] text-gray-400"><span>Create → Send → Track → Paid</span><span>Due Apr 04</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-100">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-500 text-center">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4 max-w-3xl mx-auto">
          {[
            {n:'1', t:'Add income & expenses', d:'Log payments and spend in seconds. Attach receipts.'},
            {n:'2', t:'Create invoices', d:'Professional PDF, tax rate saved per invoice.'},
            {n:'3', t:'Track profit', d:'Dashboard + reports. Export CSV for taxes.'},
          ].map(s=> <div key={s.n} className="text-center border border-gray-100 rounded-2xl p-5 bg-white"><div className="w-7 h-7 rounded-full bg-teal-700 text-white grid place-items-center text-xs font-bold mx-auto">{s.n}</div><div className="font-semibold text-sm mt-3">{s.t}</div><div className="text-xs text-gray-500 mt-1">{s.d}</div></div>)}
        </div>
      </section>

      {/* Positioning + trust */}
      <section className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 border-t border-gray-100">
        {[
          { title:'Built for freelancers', desc:'For independent work without a finance team — not a full accounting system you need to learn.'},
          { title:'You stay in control', desc:'No bank syncing. No team bloat. Export your CSV or delete your account anytime — one click in Settings.'},
          { title:'Fast & minimal', desc:'White space, one accent color, mobile-ready. Example states guide you, not blank screens.'},
        ].map(c=> <div key={c.title} className="rounded-2xl border border-gray-200 p-5 bg-white"><h3 className="font-semibold text-sm">{c.title}</h3><p className="text-sm text-gray-500 mt-2 leading-relaxed">{c.desc}</p></div>)}
      </section>

      {/* Pricing + founder */}
      <section className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-100 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6">
          <h3 className="font-semibold">Free while in beta</h3>
          <p className="text-sm text-gray-600 mt-2">No credit card required. Use all features — income, expenses, invoices, reports. Pricing will be simple and transparent when we launch.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-sm">Built for independent freelancers, by yuviyagliet</h3>
          <p className="text-sm text-gray-500 mt-2">Indie maker building tools for freelance work. Questions about your financial records? Reach out — you’ll get a human.</p>
          <a href="mailto:hello@clearbooks.app" className="text-xs text-teal-700 font-medium mt-3 inline-block hover:underline">hello@clearbooks.app →</a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-gray-400">
          <div>ClearBooks — freelance ledger • <span className="text-gray-500">Your data is private and stays in your account</span></div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-gray-600 hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-600 hover:underline">Terms</Link>
            <Link to="/security" className="hover:text-gray-600 hover:underline">Security</Link>
            <a href="mailto:hello@clearbooks.app" className="hover:text-gray-600 hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
