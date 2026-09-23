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
    <div className="min-h-screen bg-[#020617] text-[#e2e8f0] relative overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-100">
      {/* Obsidian aurora — midnight slate depth */}
      <div className="pointer-events-none absolute inset-0" style={{
        background:
          'radial-gradient(900px 520px at 14% -6%, rgba(6,182,214,0.16), transparent 62%), radial-gradient(860px 520px at 92% 0%, rgba(16,185,129,0.13), transparent 64%), linear-gradient(180deg, #020617 0%, #0f172a 52%, #020617 100%)'
      }} aria-hidden />
      {/* subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage:'linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)', backgroundSize:'32px 32px' }} aria-hidden />

      <header className="sticky top-0 z-20 max-w-6xl mx-auto px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md" style={{ background:'rgba(2,6,23,0.55)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
        <Link to="/" className="flex items-center leading-none" style={{ gap:'12px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="40" height="40" rx="10" fill="#06b6d4" fillOpacity="0.15" />
            <path d="M20 8L32 20L20 32L8 20L20 8Z" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M20 13L27 20L20 27L13 20L20 13Z" fill="#06b6d4" fillOpacity="0.8" />
            <path d="M20 8V32" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.5" />
          </svg>
          <span className="font-display bg-gradient-to-r from-white to-[#cbd5e1] bg-clip-text text-transparent tracking-tight inline-flex items-center" style={{ fontFamily:'Inter,Geist,system-ui,sans-serif', fontWeight:700, fontSize:'19px', letterSpacing:'-0.02em', opacity:1 }}>ClearBooks</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? <Link to="/dashboard" onClick={handleHeaderCta} className="text-sm font-medium border border-white/10 bg-white/5 backdrop-blur text-[#e2e8f0] rounded-full px-4 py-2 hover:bg-white/10 hover:border-white/15 transition">Go to dashboard</Link>
          : <>
            <Link to="/login" className="text-sm font-medium px-3 py-2 text-[#e2e8f0] hover:text-white transition">Log in</Link>
            <Link to="/signup" onClick={handleHeaderCta} className="text-sm font-semibold bg-[#06b6d4] text-white rounded-full px-5 py-2.5 hover:bg-[#0891b2] hover:shadow-[0_8px_24px_rgba(6,182,214,0.38)] hover:-translate-y-px transition-all shadow-[0_4px_16px_rgba(6,182,214,0.28)] border border-white/10">Create My First Invoice in 30s</Link>
          </>}
        </div>
      </header>

      {/* Hero — Studio Dark */}
      <section className="relative max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-10 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-white/5 text-cyan-200 border border-white/10 rounded-full px-3 py-1 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse shadow-[0_0_8px_#06b6d4]" /> Built for colorists & editors — not accountants
          </div>
          <h1 className="text-[40px] md:text-[48px] font-bold tracking-tight leading-[0.95] mt-4 font-display">
            <span className="block text-[#e2e8f0]">Stop Chasing</span>
            <span className="block text-[#e2e8f0]">Payments.</span>
            <span className="block text-[#06b6d4] drop-shadow-[0_0_12px_rgba(6,182,214,0.35)]">Start Grading.</span>
          </h1>
          <p className="text-[18px] font-semibold text-[#e2e8f0] mt-3 leading-snug opacity-90">The minimalist ledger for post-production freelancers who hate accounting.</p>
          <p className="text-[#e2e8f0]/70 mt-3 text-[15px] leading-relaxed">No bloated software. Just a clean ledger for post-projects, revisions, and client payments — so you can get back to the timeline.</p>
          
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-3">
              <Link to={user?'/dashboard':'/signup'} onClick={handleCtaClick} className="bg-[#06b6d4] text-white rounded-full px-8 py-4 text-[15px] font-semibold hover:bg-[#0891b2] hover:shadow-[0_12px_28px_rgba(6,182,214,0.38)] hover:-translate-y-px active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(6,182,214,0.32)] border border-white/10">Create My First Invoice in 30s →</Link>
              {!user && <span className="text-xs text-[#e2e8f0]/60">No credit card · Free while in beta</span>}
            </div>
            {!user && <p className="text-xs text-[#e2e8f0]/60 mt-2.5">Already have an account? <Link to="/login" className="text-[#06b6d4] font-medium hover:text-cyan-300">Log in</Link> · Takes 30 seconds to first invoice</p>}
          </div>

          <div className="mt-6 flex items-center gap-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg rounded-full px-3 py-2 shadow-sm w-fit">
            <div className="flex -space-x-2">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-600 border-2 border-[#0f172a] grid place-items-center text-[10px] font-bold text-white">AC</span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-[#0f172a] grid place-items-center text-[10px] font-bold text-white">MR</span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 border-2 border-[#0f172a] grid place-items-center text-[10px] font-bold text-white">JL</span>
              <span className="w-8 h-8 rounded-full bg-slate-900 border-2 border-[#0f172a] grid place-items-center text-[10px] font-bold text-white">+2k</span>
            </div>
            <div className="pr-1">
              <div className="text-xs font-semibold text-[#e2e8f0] leading-none flex items-center gap-1">Join 850+ colorists & editors <span className="text-amber-400">★★★★★</span></div>
              <div className="text-[11px] text-[#e2e8f0]/60 leading-none mt-0.5">Trusted by post-production freelancers in 30+ countries</div>
            </div>
          </div>

          <div className="mt-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg rounded-xl p-3 flex gap-3">
            <span className="text-[#06b6d4] mt-0.5">🔒</span>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-[#e2e8f0]">Your financial data stays private</span>
              <span className="text-[#e2e8f0]/65"> — records are separated by account and never visible to others. Export or delete anytime. You own your data.</span>
            </div>
          </div>

          {/* Benefit Cards — glass */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.07)] hover:-translate-y-px transition-all" style={{ boxShadow:'0 8px 24px rgba(2,6,23,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 grid place-items-center text-[#06b6d4]">◈</div>
              <div className="font-semibold text-[13px] mt-3 font-display text-[#e2e8f0]">Tame the Chaos</div>
              <div className="text-[#e2e8f0]/60 text-xs mt-1 leading-relaxed"><span className="font-medium text-[#e2e8f0]">Ledger</span> — projects, revisions & retainers in one calm place.</div>
            </div>
            <div className="rounded-2xl p-4 bg-[rgba(6,182,214,0.08)] border border-[rgba(6,182,214,0.18)] backdrop-blur-lg shadow-[0_8px_24px_rgba(6,182,214,0.14)] hover:-translate-y-px transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#06b6d4] text-white grid place-items-center shadow-[0_4px_12px_rgba(6,182,214,0.32)]">↗</div>
              <div className="font-semibold text-[13px] mt-3 font-display text-[#e2e8f0]">Get Paid Faster</div>
              <div className="text-[#e2e8f0]/60 text-xs mt-1 leading-relaxed"><span className="font-medium text-[#e2e8f0]">Pro-Invoices</span> — premium PDFs, payment nudges & overdue alerts.</div>
            </div>
            <div className="rounded-2xl p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.07)] hover:-translate-y-px transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 grid place-items-center text-amber-300">◍</div>
              <div className="font-semibold text-[13px] mt-3 font-display text-[#e2e8f0]">No More Guesswork</div>
              <div className="text-[#e2e8f0]/60 text-xs mt-1 leading-relaxed"><span className="font-medium text-[#e2e8f0]">Profit Reports</span> — know exactly what’s yours, what’s owed.</div>
            </div>
          </div>
        </div>

        {/* Visual — glowing floating doc */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-emerald-500/10 to-cyan-500/8 rounded-[2rem] blur-[18px] -rotate-1" aria-hidden />
          <div className="relative bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg rounded-[1.75rem] p-5" style={{ boxShadow:'0 16px 48px rgba(2,6,23,0.55), 0 0 32px rgba(6,182,214,0.14), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold tracking-wide uppercase text-[#e2e8f0]/60">Example dashboard — post-production studio</div>
              <div className="text-[11px] bg-[#06b6d4] text-white rounded-full px-2.5 py-1 border border-white/10 shadow">Live preview</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                {k:'Sent', v:'$6,608', c:'bg-white/5 border-white/10 text-cyan-200'},
                {k:'Overdue', v:'$4,372', c:'bg-red-500/10 border-red-500/20 text-red-200'},
                {k:'Paid', v:'$7,200', c:'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'},
              ].map(s=> <div key={s.k} className={`rounded-2xl p-3 border backdrop-blur ${s.c}`}><div className="text-[10px] uppercase tracking-wide opacity-70">{s.k} · pipeline</div><div className="font-bold text-sm mt-0.5 text-[#e2e8f0]">{s.v}</div></div>)}
            </div>
            <div className="h-24 flex items-end gap-1.5">
              {[30,50,35,70,55,90].map((h,i)=> <div key={i} className={`${i%2?'bg-[#06b6d4]':'bg-white/12'} flex-1 rounded-t-lg border border-white/5`} style={{height: h+'%', boxShadow: i%2 ? '0 0 12px rgba(6,182,214,0.35)' : 'none'}}></div>)}
            </div>
            <div className="flex justify-between text-[10px] text-[#e2e8f0]/40 mt-2"><span>Jan</span><span>Jun</span></div>
            
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#e2e8f0]">Invoice · INV-1042 — Sent</span>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-200 border border-cyan-500/20 rounded-full px-2 py-0.5 backdrop-blur">Sent · 4 days left</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs backdrop-blur">
                <div className="flex justify-between"><span className="text-[#e2e8f0]/60">Commercial — Primary grade (30s hero)</span><span className="font-medium text-[#e2e8f0]">$5,600.00</span></div>
                <div className="flex justify-between mt-1 text-[11px] text-[#e2e8f0]/50"><span>GST 18% · Total $6,608.00</span><span>Due in 4 days</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-[10px] bg-[#06b6d4] text-white rounded-full px-2.5 py-1 border border-white/10 shadow-[0_4px_12px_rgba(6,182,214,0.32)]">Pay $6,608</span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-[#e2e8f0] rounded-full px-2.5 py-1 backdrop-blur">Reminder ready</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-2 bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs text-[#e2e8f0]">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" /> 5 days late alert · auto-nudge ready
          </div>
        </div>
      </section>

      {/* Comparison — Studio Dark */}
      <section className="relative max-w-6xl mx-auto px-6 py-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-[#e2e8f0]">Why colorists ditch the bloat</h2>
          <p className="text-sm text-[#e2e8f0]/60 mt-2">You need to grade, not do accounting. We’re the 30-second alternative to software built for factories.</p>
        </div>
        <div className="mt-6 max-w-3xl mx-auto overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-lg" style={{ boxShadow:'0 16px 40px rgba(2,6,23,0.45)' }}>
          <div className="grid grid-cols-3 text-xs font-semibold tracking-wide uppercase">
            <div className="p-3 bg-transparent border-b border-white/10" />
            <div className="p-3 bg-[#06b6d4] text-white text-center border-b border-cyan-600">ClearBooks — Built for Post</div>
            <div className="p-3 bg-white/5 text-[#e2e8f0]/60 text-center border-b border-white/10">Other Tools — Overkill</div>
          </div>
          {[
            { label:'Time to first invoice', us:'30 secs', them:'2 hours setup', usWin:true },
            { label:'Price', us:'Free while in beta', them:'$25–60/mo', usWin:true },
            { label:'Design', us:'Minimalist — white space', them:'Bloated, enterprise', usWin:true },
            { label:'Built for', us:'Colorists & Editors', them:'Factories & SMBs', usWin:true },
            { label:'Learning curve', us:'No tutorial needed', them:'Weeks of configs', usWin:true },
          ].map(r=>(
            <div key={r.label} className="grid grid-cols-3 text-sm border-t border-white/10">
              <div className="p-3 text-xs font-medium text-[#e2e8f0]/80 bg-transparent flex items-center">{r.label}</div>
              <div className="p-3 bg-cyan-500/10 text-center font-semibold text-cyan-100 border-l border-white/10 flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#06b6d4] text-white grid place-items-center text-[10px] shadow">✓</span> {r.us}
              </div>
              <div className="p-3 bg-white/5 text-center text-[#e2e8f0]/55 border-l border-white/10 flex items-center justify-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 grid place-items-center text-[10px]">✕</span> {r.them}
              </div>
            </div>
          ))}
          <div className="p-3 bg-[#0f172a]/80 backdrop-blur text-[#e2e8f0] text-center text-xs flex items-center justify-center gap-2 border-t border-white/10">
            <span>Your craft is grading — ours is getting you paid</span>
            <Link to="/signup" onClick={handleCtaClick} className="bg-[#06b6d4] text-white rounded-full px-3 py-1 text-xs font-semibold hover:bg-[#0891b2] border border-white/10">Create My First Invoice in 30s →</Link>
          </div>
        </div>
      </section>

      <GuestInvoicePlayground />

      <InteractiveInvoicePreviewer />

      <section className="relative max-w-6xl mx-auto px-6 py-8 border-t border-white/5">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[#e2e8f0]/60 text-center">How it works — from chaos to paid</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4 max-w-3xl mx-auto">
          {[
            {n:'1', t:'Tame the Chaos', d:'One ledger for every project, revision & retainer. No spreadsheets, no hunting.'},
            {n:'2', t:'Get Paid Faster', d:'Premium agency PDFs, Sent→Overdue pipeline & one-tap payment nudges.'},
            {n:'3', t:'No More Guesswork', d:'Profit Reports + Expected Income vs Overdue — know what’s yours at a glance.'},
          ].map(s=> <div key={s.n} className="text-center rounded-2xl p-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.07)] hover:-translate-y-px transition-all"><div className="w-7 h-7 rounded-full bg-[#06b6d4] text-white grid place-items-center text-xs font-bold mx-auto shadow-[0_4px_12px_rgba(6,182,214,0.32)]">{s.n}</div><div className="font-semibold text-sm mt-3 font-display text-[#e2e8f0]">{s.t}</div><div className="text-xs text-[#e2e8f0]/60 mt-1">{s.d}</div></div>)}
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 border-t border-white/5">
        {[
          { title:'Built for post-production', desc:'For colorists, editors, and post freelancers — project → revision → milestone → invoice → payment, without a finance team.'},
          { title:'You stay in control', desc:'No bank syncing. No team bloat. Export your CSV or delete your account anytime — one click in Settings.'},
          { title:'Fast & minimal', desc:'White space, one accent color, mobile-ready. Example states guide you, not blank screens.'},
        ].map(c=> <div key={c.title} className="rounded-2xl border border-white/10 p-5 bg-[rgba(255,255,255,0.05)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors"><h3 className="font-semibold text-sm font-display text-[#e2e8f0]">{c.title}</h3><p className="text-sm text-[#e2e8f0]/60 mt-2 leading-relaxed">{c.desc}</p></div>)}
      </section>

      <section className="relative max-w-6xl mx-auto px-6 py-8 border-t border-white/5 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-[rgba(6,182,214,0.08)] backdrop-blur-lg p-6">
          <h3 className="font-semibold font-display text-[#e2e8f0]">Free while in beta — then simple</h3>
          <p className="text-sm text-[#e2e8f0]/70 mt-2">No credit card. Use all features — ledger, pro-invoices, payment command center, reports. When we launch, it stays minimalist and fair — unlike $60/mo bloat.</p>
          <Link to="/signup" onClick={handleCtaClick} className="inline-block mt-4 bg-[#06b6d4] text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-[#0891b2] shadow-[0_8px_20px_rgba(6,182,214,0.32)] border border-white/10">Create My First Invoice in 30s →</Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-lg p-6">
          <h3 className="font-semibold text-sm font-display text-[#e2e8f0]">Built for post-production, by editors</h3>
          <p className="text-sm text-[#e2e8f0]/60 mt-2">Indie maker building tools for freelance work. Questions about your financial records? Reach out — you’ll get a human.</p>
          <a href="mailto:hello@clearbooks.app" className="text-xs text-[#06b6d4] font-medium mt-3 inline-block hover:text-cyan-300">hello@clearbooks.app →</a>
        </div>
      </section>

      <footer className="relative max-w-6xl mx-auto px-6 py-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[#e2e8f0]/45">
          <div>ClearBooks — freelance ledger • <span className="text-[#e2e8f0]/60">Your data is private and stays in your account</span></div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[#e2e8f0] hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:text-[#e2e8f0] hover:underline">Terms</Link>
            <Link to="/security" className="hover:text-[#e2e8f0] hover:underline">Security</Link>
            <a href="mailto:hello@clearbooks.app" className="hover:text-[#e2e8f0] hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
