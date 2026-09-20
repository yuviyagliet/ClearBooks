import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to:'/dashboard', label:'Dashboard', icon:'▦' },
  { to:'/income', label:'Income', icon:'↗' },
  { to:'/expenses', label:'Expenses', icon:'↘' },
  { to:'/clients', label:'Clients', icon:'👥' },
  { to:'/invoices', label:'Invoices', icon:'📄' },
  { to:'/reports', label:'Reports', icon:'📊' },
  { to:'/settings', label:'Settings', icon:'⚙' },
]

export default function Layout({ children }){
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleOut = async()=>{ await signOut(); navigate('/login') }
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f9fafb]">
      {/* sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center text-sm">◈</span>
            ClearBooks
          </Link>
          <p className="text-xs text-gray-500 mt-1">Freelance ledger</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {nav.map(n=>(
            <NavLink key={n.to} to={n.to} className={({isActive})=> `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive?'bg-teal-700 text-white':'text-gray-600 hover:bg-gray-100'}`}>
              <span className="w-6 text-center">{n.icon}</span>{n.label}
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
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-bold flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-teal-700 text-white grid place-items-center text-xs">◈</span> ClearBooks</Link>
          <button onClick={handleOut} className="text-xs bg-gray-900 text-white rounded-full px-3 py-1">Logout</button>
        </div>
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {nav.map(n=> <NavLink key={n.to} to={n.to} className={({isActive})=> `whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border ${isActive?'bg-teal-700 text-white border-teal-700':'bg-white text-gray-600 border-gray-200'}`}>{n.label}</NavLink>)}
        </div>
      </div>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
