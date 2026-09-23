import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavIcon({ name, className = 'w-[18px] h-[18px]' }){
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
  switch(name){
    case 'dashboard': return <svg {...common}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>
    case 'income': return <svg {...common}><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>
    case 'expenses': return <svg {...common}><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>
    case 'clients': return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15.2c2.4.3 4.5 1.9 5.5 4.8"/></svg>
    case 'invoices': return <svg {...common}><path d="M6 2.5h8L19 8v13.5a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5z"/><path d="M13.5 2.5V8H19"/><path d="M9 12.5h6M9 16h6"/></svg>
    case 'reports': return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/></svg>
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>
    default: return null
  }
}

const nav = [
  { to:'/dashboard', label:'Dashboard', icon:'dashboard' },
  { to:'/income', label:'Income', icon:'income' },
  { to:'/expenses', label:'Expenses', icon:'expenses' },
  { to:'/clients', label:'Clients', icon:'clients' },
  { to:'/invoices', label:'Invoices', icon:'invoices' },
  { to:'/reports', label:'Reports', icon:'reports' },
  { to:'/settings', label:'Settings', icon:'settings' },
]

export default function Layout({ children }){
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)
  const handleOut = async()=>{ await signOut(); navigate('/login') }
  const primaryNav = nav.slice(0,4)
  const secondaryNav = nav.slice(4)
  return (
    <div className="min-h-screen flex flex-col md:flex-row selection:bg-cyan-500/30">
      {/* — Sidebar — Studio Obsidian Glass */}
      <aside className="hidden md:flex w-[280px] flex-col sticky top-0 h-screen shrink-0 z-30"
        style={{
          background: 'linear-gradient(180deg, rgba(2,6,23,0.86) 0%, rgba(15,23,42,0.72) 100%)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '4px 0 32px rgba(2,6,23,0.45), inset -1px 0 0 rgba(255,255,255,0.05)'
        }}>
        {/* Aurora top */}
        <div className="absolute inset-x-0 top-0 h-[280px] pointer-events-none opacity-[0.12]" style={{ background: 'radial-gradient(600px 220px at 40% 0%, rgba(6,182,214,0.32), transparent 70%), radial-gradient(520px 200px at 90% 12%, rgba(16,185,129,0.22), transparent 70%)' }} aria-hidden />

        <div className="relative px-6 pt-7 pb-6 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <span className="w-9 h-9 rounded-xl grid place-items-center text-[13px] font-bold shrink-0 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 55%, #0e7490 100%)',
                boxShadow: '0 4px 16px rgba(6,182,214,0.35), inset 0 1px 0 rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.14)'
              }}>
              <span className="relative text-white drop-shadow">◈</span>
              <span className="absolute inset-0 bg-gradient-to-tr from-white/12 to-transparent pointer-events-none" />
            </span>
            <span className="font-display font-semibold text-[17px] leading-none inline-flex items-center text-[#0f172a] opacity-100 tracking-[0.025em] transition" style={{ color:'#0f172a', opacity:1, fontWeight:700, letterSpacing:'0.025em' }}>ClearBooks</span>
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          </Link>
          <p className="text-[11px] text-slate-400 mt-2 tracking-[0.08em] font-medium uppercase">For colorists & post-production</p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2.5 py-1 backdrop-blur">
            <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" /> Studio Theme
          </div>
        </div>

        <nav className="relative flex-1 p-3 space-y-1 overflow-auto scrollbar-thin">
          {nav.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=> `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium border transition-all duration-200 ${isActive?'bg-cyan-500/[0.12] text-cyan-100 border-cyan-400/20 shadow-[0_4px_16px_rgba(6,182,214,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] translate-x-[1px]':'text-slate-400 border-transparent hover:bg-white/[0.06] hover:text-slate-100 hover:border-white/[0.06] hover:translate-x-[1px]'}`}>
              <NavIcon name={n.icon} className="w-[18px] h-[18px] shrink-0 opacity-90 group-[.active]:text-cyan-300" />
              <span className="flex-1">{n.label}</span>
              {/* active indicator */}
              <span className="w-1 h-1 rounded-full bg-cyan-400 opacity-0 group-[.active]:opacity-100 shadow-[0_0_6px_#22d3ee] transition" />
            </NavLink>
          ))}
        </nav>

        <div className="relative p-4 border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.02))' }}>
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0 text-white border border-white/10" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>{(user?.email||'?')[0].toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-white truncate leading-none">{user?.email || '—'}</div>
              <div className="text-[11px] text-slate-400 truncate">Studio workspace</div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
          </div>
          <button onClick={handleOut} className="mt-3 w-full text-sm bg-white text-slate-900 rounded-xl py-2.5 font-semibold hover:bg-slate-100 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)] active:scale-[0.98] transition">Logout</button>
          <Link to="/settings" className="mt-2 block text-center w-full text-xs font-medium border border-white/10 text-slate-300 rounded-xl py-2.5 hover:bg-white/5 hover:text-white hover:border-white/15 transition">Settings</Link>
        </div>
      </aside>

      {/* mobile top bar — glass (light for deep-slate wordmark contrast) */}
      <div className="md:hidden sticky top-0 z-20 border-b border-slate-200/70" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-display font-bold flex items-center gap-2.5 text-[#0f172a] opacity-100 tracking-[0.025em] leading-none" style={{ color:'#0f172a', opacity:1, fontWeight:700, letterSpacing:'0.025em' }}><span className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white grid place-items-center text-xs shadow-[0_4px_12px_rgba(6,182,214,0.35)] border border-white/15 shrink-0">◈</span><span className="inline-flex items-center">ClearBooks</span></Link>
          <span className="text-[10px] bg-slate-900 text-white rounded-full px-2.5 py-1 font-bold tracking-wide uppercase">Studio</span>
        </div>
      </div>

      <main className="flex-1 min-w-0 pb-24 md:pb-0 relative">
        {/* subtle grid overlay for command center vibe */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} aria-hidden />
        <div className="relative max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8" style={{ animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          {children}
        </div>
      </main>

      {/* mobile bottom nav — obsidian glass */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-white/10" style={{ background: 'rgba(2,6,23,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 -8px 32px rgba(2,6,23,0.5)' }}>
        <div className="flex justify-around items-center py-1.5 px-1">
          {primaryNav.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=> `flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold tracking-wide rounded-xl border transition ${isActive?'text-cyan-300 bg-cyan-400/10 border-cyan-400/15':'text-slate-400 border-transparent'}`}>
              <NavIcon name={n.icon} className="w-[20px] h-[20px]" />{n.label}
            </NavLink>
          ))}
          <div className="relative">
            <button onClick={()=>setShowMore(!showMore)} className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold tracking-wide rounded-xl border transition ${showMore?'text-cyan-300 bg-cyan-400/10 border-cyan-400/15':'text-slate-400 border-transparent'}`}>
              <span className="text-[16px] leading-none">⋯</span>More
            </button>
            {showMore && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(2,6,23,0.6)]" style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(20px)' }}>
                {secondaryNav.map(n=>(
                  <NavLink key={n.to} to={n.to} onClick={()=>setShowMore(false)} className={({isActive})=> `flex items-center gap-2.5 px-4 py-3 text-sm border-b border-white/5 last:border-0 ${isActive?'bg-cyan-500/12 text-cyan-100':'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                    <NavIcon name={n.icon} className="w-4 h-4" />{n.label}
                  </NavLink>
                ))}
                <button onClick={handleOut} className="w-full text-left px-4 py-3 text-sm text-red-300 hover:bg-white/5">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
