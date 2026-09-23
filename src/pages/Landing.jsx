import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'
import InteractiveInvoicePreviewer from '../components/InteractiveInvoicePreviewer'
import GuestInvoicePlayground from '../components/GuestInvoicePlayground'

export default function Landing(){
  const { user } = useAuth()
  const handleCtaClick = () => {
    track('cta_click', { location: 'landing_hero', text: 'Create My First Invoice in 30s' })
  }
  const handleHeaderCta = () => {
    track('cta_click', { location: 'landing_header', text: user ? 'Go to dashboard' : 'Create My First Invoice in 30s' })
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight"><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center shadow-sm">◈</span> ClearBooks</div>
        <div className="flex items-center gap-3">
          {user ? <Link to="/dashboard" onClick={handleHeaderCta} className="text-sm font-medium border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50">Go to dashboard</Link>
          : <>
            <Link to="/login" className="text-sm font-medium px-3 py-2 hover:text-teal-700">Log in</Link>
            <Link to="/signup" onClick={handleHeaderCta} className="text-sm font-semibold bg-teal-700 text-white rounded-full px-5 py-2.5 hover:bg-teal-800 hover:shadow-md hover:-translate-y-px transition-all">Create My First Invoice in 30s</Link>
          </>}
        </div>
      </header>

      {/* Hero — Anti-Hero headline */}
      <section className="max-w-6xl mx-auto px-6 pt-8 md:pt-14 pb-10 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Built for colorists & editors — not accountants
          </div>
          <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight leading-[0.95] mt-4 font-display">
            <span className="block text-slate-900">Stop Chasing</span>
            <span className="block text-slate-900">Payments.</span>
            <span className="block text-teal-700">Start Grading.</span>
          </h1>
          <p className="text-[18px] font-semibold text-slate-700 mt-3 leading-snug">The minimalist ledger for post-production freelancers who hate accounting.</p>
          <p className="text-slate-600 mt-3 text-[15px] leading-relaxed">No bloated software. Just a clean ledger for post-projects, revisions, and client payments — so you can get back to the timeline.</p>
          
          {/* Friction-Free CTA */}
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-3">
              <Link to={user?'/dashboard':'/signup'} onClick={handleCtaClick} className="bg-teal-700 text-white rounded-full px-8 py-4 text-[15px] font-semibold hover:bg-teal-800 hover:shadow-lg hover:-translate-y-px active:scale-[0.98] transition-all shadow-sm">Create My First Invoice in 30s →</Link>
              {!user && <span className="text-xs text-slate-500">No credit card · Free while in beta</span>}
            </div>
            {!user && <p className="text-xs text-slate-500 mt-2.5">Already have an account? <Link to="/login" className="text-teal-700 font-medium hover:underline">Log in</Link> · Takes 30 seconds to first invoice</p>}
          </div>

          {/* Visual Social Proof */}
          <div className="mt-6 flex items-center gap-3 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm w-fit">
            <div className="flex -space-x-2">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 border-2 border-white grid place-items-center text-[10px] font-bold text-white">AC</span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white grid place-items-center text-[10px] font-bold text-white">MR</span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 border-2 border-white grid place-items-center text-[10px] font-bold text-white">JL</span>
              <span className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white grid place-items-center text-[10px] font-bold text-white">+2k</span>
            </div>
            <div className="pr-1">
              <div className="text-xs font-semibold text-slate-900 leading-none flex items-center gap-1">Join 850+ colorists & editors <span className="text-amber-500">★★★★★</span></div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5">Trusted by post-production freelancers in 30+ countries</div>
            </div>
          </div>

          {/* Trust micro-copy */}
          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-3">
            <span className="text-teal-700 mt-0.5">🔒</span>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-slate-900">Your financial data stays private</span>
              <span className="text-slate-600"> — records are separated by account and never visible to others. Export or delete anytime. You own your data.</span>
            </div>
          </div>

          {/* Benefit-Driven Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="border border-gray-100 rounded-2xl p-4 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-md hover:-translate-y-px transition-all">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 grid place-items-center text-teal-700">◈</div>
              <div className="font-semibold text-[13px] mt-3 font-display">Tame the Chaos</div>
              <div className="text-slate-500 text-xs mt-1 leading-relaxed"><span className="font-medium text-slate-700">Ledger</span> — projects, revisions & retainers in one calm place.</div>
            </div>
            <div className="border border-teal-100 rounded-2xl p-4 bg-gradient-to-b from-teal-50/60 to-white shadow-sm hover:shadow-md hover:-translate-y-px transition-all">
              <div className="w-9 h-9 rounded-xl bg-teal-700 text-white grid place-items-center">↗</div>
              <div className="font-semibold text-[13px] mt-3 font-display">Get Paid Faster</div>
              <div className="text-slate-500 text-xs mt-1 leading-relaxed"><span className="font-medium text-slate-700">Pro-Invoices</span> — premium PDFs, payment nudges & overdue alerts.</div>
            </div>
            <div className="border border-gray-100 rounded-2xl p-4 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-md hover:-translate-y-px transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 grid place-items-center text-amber-700">◍</div>
              <div className="font-semibold text-[13px] mt-3 font-display">No More Guesswork</div>
              <div className="text-slate-500 text-xs mt-1 leading-relaxed"><span className="font-medium text-slate-700">Profit Reports</span> — know exactly what’s yours, what’s owed.</div>
            </div>
          </div>
        </div>

        {/* Visual - Example dashboard + Invoice */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-[2rem] -rotate-1"></div>
          <div className="relative bg-white border border-gray-200 rounded-[1.75rem] shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold tracking-wide uppercase text-slate-500">Example dashboard — post-production studio</div>
              <div className="text-[11px] bg-slate-900 text-white rounded-full px-2.5 py-1">Live preview</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                {k:'Sent', v:'$6,608', c:'text-indigo-700 bg-indigo-50 border-indigo-100'},
                {k:'Overdue', v:'$4,372', c:'text-red-700 bg-red-50 border-red-200'},
                {k:'Paid', v:'$7,200', c:'text-emerald-700 bg-emerald-50 border-emerald-200'},
              ].map(s=> <div key={s.k} className={`rounded-2xl p-3 border ${s.c}`}><div className="text-[10px] uppercase tracking-wide opacity-70">{s.k} · pipeline</div><div className="font-bold text-sm mt-0.5">{s.v}</div></div>)}
            </div>
            <div className="h-24 flex items-end gap-1.5">
              {[30,50,35,70,55,90].map((h,i)=> <div key={i} className={`flex-1 rounded-t-lg ${i%2?'bg-teal-700':'bg-teal-200'}`} style={{height: h+'%'}}></div>)}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-2"><span>Jan</span><span>Jun</span></div>
            
            {/* Invoice preview inside visual */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Invoice · INV-1042 — Sent</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">Sent · 4 days left</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Commercial — Primary grade (30s hero)</span><span className="font-medium">$5,600.00</span></div>
                <div className="flex justify-between mt-1 text-[11px] text-slate-400"><span>GST 18% · Total $6,608.00</span><span>Due in 4 days</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-[10px] bg-slate-900 text-white rounded-full px-2.5 py-1">Pay $6,608</span>
                <span className="text-[10px] bg-white border border-gray-200 rounded-full px-2.5 py-1">Reminder ready</span>
              </div>
            </div>
          </div>
          {/* Floating social proof on visual */}
          <div className="absolute -bottom-3 -left-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> 5 days late alert · auto-nudge ready
          </div>
        </div>
      </section>

      {/* Comparison Table — Us vs Them */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Why colorists ditch the bloat</h2>
          <p className="text-sm text-slate-500 mt-2">You need to grade, not do accounting. We’re the 30-second alternative to software built for factories.</p>
        </div>
        <div className="mt-6 max-w-3xl mx-auto overflow-hidden rounded-[20px] border border-gray-200 shadow-sm bg-white">
          <div className="grid grid-cols-3 text-xs font-semibold tracking-wide uppercase">
            <div className="p-3 bg-white border-b border-gray-100" />
            <div className="p-3 bg-teal-700 text-white text-center border-b border-teal-800">ClearBooks — Built for Post</div>
            <div className="p-3 bg-slate-50 text-slate-500 text-center border-b border-gray-100">Other Tools — Overkill</div>
          </div>
          {[
            { label:'Time to first invoice', us:'30 secs', them:'2 hours setup', usWin:true },
            { label:'Price', us:'Free while in beta', them:'$25–60/mo', usWin:true },
            { label:'Design', us:'Minimalist — white space', them:'Bloated, enterprise', usWin:true },
            { label:'Built for', us:'Colorists & Editors', them:'Factories & SMBs', usWin:true },
            { label:'Learning curve', us:'No tutorial needed', them:'Weeks of configs', usWin:true },
          ].map(r=>(
            <div key={r.label} className="grid grid-cols-3 text-sm border-t border-gray-100">
              <div className="p-3 text-xs font-medium text-slate-600 bg-white flex items-center">{r.label}</div>
              <div className="p-3 bg-teal-50/60 text-center font-semibold text-teal-900 border-l border-gray-100 flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-700 text-white grid place-items-center text-[10px]">✓</span> {r.us}
              </div>
              <div className="p-3 bg-slate-50 text-center text-slate-500 border-l border-gray-100 flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white border border-gray-300 grid place-items-center text-[10px]">✕</span> {r.them}
              </div>
            </div>
          ))}
          <div className="p-3 bg-slate-900 text-white text-center text-xs flex items-center justify-center gap-2">
            <span>Your craft is grading — ours is getting you paid</span>
            <Link to="/signup" onClick={handleCtaClick} className="bg-white text-slate-900 rounded-full px-3 py-1 text-xs font-semibold hover:bg-slate-100">Create My First Invoice in 30s →</Link>
          </div>
        </div>
      </section>

      {/* Guest Invoice Playground — Try it in 10 seconds (minimal, premium) */}
      <GuestInvoicePlayground />

      {/* Interactive Invoice Previewer — extended guest mode (kept for advanced try) */}
      <InteractiveInvoicePreviewer />

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-100">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500 text-center">How it works — from chaos to paid</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4 max-w-3xl mx-auto">
          {[
            {n:'1', t:'Tame the Chaos', d:'One ledger for every project, revision & retainer. No spreadsheets, no hunting.'},
            {n:'2', t:'Get Paid Faster', d:'Premium agency PDFs, Sent→Overdue pipeline & one-tap payment nudges.'},
            {n:'3', t:'No More Guesswork', d:'Profit Reports + Expected Income vs Overdue — know what’s yours at a glance.'},
          ].map(s=> <div key={s.n} className="text-center border border-gray-100 rounded-2xl p-5 bg-white hover:shadow-md hover:-translate-y-px transition-all"><div className="w-7 h-7 rounded-full bg-teal-700 text-white grid place-items-center text-xs font-bold mx-auto">{s.n}</div><div className="font-semibold text-sm mt-3 font-display">{s.t}</div><div className="text-xs text-slate-500 mt-1">{s.d}</div></div>)}
        </div>
      </section>

      {/* Positioning + trust */}
      <section className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 border-t border-gray-100">
        {[
          { title:'Built for post-production', desc:'For colorists, editors, and post freelancers — project → revision → milestone → invoice → payment, without a finance team.'},
          { title:'You stay in control', desc:'No bank syncing. No team bloat. Export your CSV or delete your account anytime — one click in Settings.'},
          { title:'Fast & minimal', desc:'White space, one accent color, mobile-ready. Example states guide you, not blank screens.'},
        ].map(c=> <div key={c.title} className="rounded-2xl border border-gray-200 p-5 bg-white hover:shadow-sm transition-shadow"><h3 className="font-semibold text-sm font-display">{c.title}</h3><p className="text-sm text-slate-500 mt-2 leading-relaxed">{c.desc}</p></div>)}
      </section>

      {/* Pricing + founder */}
      <section className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-100 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6">
          <h3 className="font-semibold font-display">Free while in beta — then simple</h3>
          <p className="text-sm text-slate-600 mt-2">No credit card. Use all features — ledger, pro-invoices, payment command center, reports. When we launch, it stays minimalist and fair — unlike $60/mo bloat.</p>
          <Link to="/signup" onClick={handleCtaClick} className="inline-block mt-4 bg-teal-700 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-teal-800">Create My First Invoice in 30s →</Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-sm font-display">Built for post-production, by editors</h3>
          <p className="text-sm text-slate-500 mt-2">Indie maker building tools for freelance work. Questions about your financial records? Reach out — you’ll get a human.</p>
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
