import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Minimal geometric SVG icons (no emoji) — consistent stroke style
function NavIcon({ name, className = 'w-5 h-5' }){
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
  switch(name){
    case 'dashboard': return <svg {...common}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>
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
  // Less is more: primary nav for core freelance flow, secondary in "More"
  const primaryNav = nav.slice(0,4) // Dashboard, Income, Expenses, Invoices
  const secondaryNav = nav.slice(4) // Clients, Reports, Settings
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f9fafb]">
      {/* sidebar - desktop */}
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center text-sm">◈</span>
            ClearBooks
          </Link>
          <p className="text-xs text-gray-500 mt-1">For colorists & post-production</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {nav.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=> `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive?'bg-teal-700 text-white':'text-gray-600 hover:bg-gray-100'}`}>
              <NavIcon name={n.icon} className="w-5 h-5 shrink-0" />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 truncate" title={user?.email}>{user?.email || '—'}</div>
          <button onClick={handleOut} className="mt-2 w-full text-sm bg-gray-900 text-white rounded-xl py-2 hover:bg-black">Logout</button>
          <Link to="/settings" className="mt-2 block text-center w-full text-xs border border-gray-200 rounded-xl py-2 hover:bg-gray-50">Settings</Link>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-bold flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-teal-700 text-white grid place-items-center text-xs">◈</span> ClearBooks</Link>
          <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-2 py-1">Post-production</span>
        </div>
      </div>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* mobile bottom nav - thumb-friendly, less friction */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="flex justify-around items-center py-1">
          {primaryNav.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=> `flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium ${isActive?'text-teal-700':'text-gray-500'}`}>
              <NavIcon name={n.icon} className="w-5 h-5" />{n.label}
            </NavLink>
          ))}
          <div className="relative">
            <button onClick={()=>setShowMore(!showMore)} className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium ${showMore?'text-teal-700':'text-gray-500'}`}>
              <span className="text-base leading-none">⋯</span>More
            </button>
            {showMore && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                {secondaryNav.map(n=>(
                  <NavLink key={n.to} to={n.to} onClick={()=>setShowMore(false)} className={({isActive})=> `flex items-center gap-2 px-4 py-2.5 text-sm ${isActive?'bg-teal-50 text-teal-700':'text-gray-700 hover:bg-gray-50'}`}>
                    <NavIcon name={n.icon} className="w-4 h-4" />{n.label}
                  </NavLink>
                ))}
                <button onClick={handleOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
