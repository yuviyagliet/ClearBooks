export function Card({ children, className='' }){
  return <div className={`bg-white border border-gray-200/70 rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] premium-card backdrop-blur-sm ${className}`}>{children}</div>
}
export function Button({ children, variant='primary', className='', ...props }){
  const base='inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-teal-700/20'
  const styles = variant==='primary'
    ? 'bg-teal-700 text-white hover:bg-teal-800 hover:shadow-[0_4px_12px_rgba(13,92,86,0.2)] hover:-translate-y-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
    : variant==='ghost'
    ? 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
    : 'bg-gray-900 text-white hover:bg-black hover:shadow-md'
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>
}
export function Input({ id, ...props}){
  return <input id={id} {...props} className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-teal-700/10 focus:border-teal-700 transition ${props.className||''}`} />
}
export function Select({ id, ...props}){
  return <select id={id} {...props} className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-700/10 focus:border-teal-700 transition ${props.className||''}`} />
}
export function Label({ children, htmlFor }){ return <label htmlFor={htmlFor} className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{children}</label>}

// Premium Empty State — illustration + friendly guided prompt
// Variants: income, expense, invoice, client, generic. Keeps title/desc but elevates to premium.
export function Empty({ title, desc, action, variant='generic', icon }){
  const illustrations = {
    income: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="12" y="22" width="64" height="44" rx="14" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="1.2"/>
        <rect x="22" y="32" width="44" height="8" rx="6" fill="#14b8a6" opacity="0.9"/>
        <rect x="22" y="44" width="30" height="6" rx="3" fill="#0f766e" opacity="0.85"/>
        <circle cx="62" cy="52" r="10" fill="#0f766e" stroke="white" strokeWidth="2.5"/>
        <path d="M58 52 L61 55 L67 49" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="18" cy="18" r="2.5" fill="#f59e0b" opacity="0.9"/><circle cx="74" cy="16" r="1.6" fill="#0f766e" opacity="0.4"/><circle cx="70" cy="72" r="2" fill="#14b8a6" opacity="0.5"/>
      </svg>
    ),
    expense: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="14" y="18" width="60" height="52" rx="16" fill="#fffbeb" stroke="#fde68a" strokeWidth="1.2"/>
        <path d="M28 32 H60" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" opacity="0.9"/>
        <path d="M28 42 H52" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" opacity="0.5"/>
        <path d="M28 52 H44" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" opacity="0.35"/>
        <circle cx="58" cy="58" r="12" fill="#f59e0b" stroke="white" strokeWidth="2.5"/>
        <path d="M58 52 V64 M52 58 H64" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    invoice: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="20" y="14" width="48" height="60" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.2"/>
        <path d="M32 28 H56" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M32 38 H56" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
        <path d="M32 46 H46" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
        <path d="M32 54 H42" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.28"/>
        <circle cx="64" cy="64" r="11" fill="#0f766e" stroke="white" strokeWidth="2.5"/>
        <path d="M60 64 L62.8 66.8 L68 60.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    client: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="16" y="20" width="56" height="48" rx="16" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.2"/>
        <circle cx="34" cy="38" r="9" fill="#6366f1" opacity="0.9"/>
        <circle cx="54" cy="38" r="9" fill="#0f766e" opacity="0.9"/>
        <rect x="26" y="54" width="36" height="6" rx="3" fill="#e2e8f0"/>
        <circle cx="64" cy="64" r="10" fill="white" stroke="#e2e8f0" strokeWidth="1.2"/>
        <path d="M59 64 L61.5 66.2 L69 59" stroke="#6366f1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    generic: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="18" y="22" width="52" height="44" rx="14" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="1.2"/>
        <path d="M32 34 H56" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        <path d="M32 43 H48" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
        <circle cx="58" cy="52" r="9" fill="#0f766e" stroke="white" strokeWidth="2.2"/>
        <path d="M54 52 L57 55 L63 48" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  const art = illustrations[variant] || illustrations.generic
  return (
    <Card className="p-8 md:p-10 text-center overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-teal-50/40 via-transparent to-transparent pointer-events-none" aria-hidden />
      <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>{art}</div>
      {icon && <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center mx-auto -mt-2 mb-3 text-lg">{icon}</div>}
      <h3 className="font-semibold font-display text-[17px] tracking-tight text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">{desc}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
      <p className="text-[11px] text-slate-400 mt-3 tracking-wide">Takes ~15 seconds — your data stays private and local.</p>
    </Card>
  )
}
