// — The Studio Theme — UI primitives
// Glassmorphism • Neon accent • Bento rhythm • Shimmer skeletons

export function Card({ children, className='', hover=true, glow=false }) {
  return (
    <div className={`bento-card ${hover ? '' : '!transform-none hover:!translate-y-0'} ${glow ? 'shadow-[0_0_36px_rgba(6,182,214,0.18)] border-cyan-500/20' : ''} ${className}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}

// Backward compat alias — many pages import Card
export const GlassCard = Card
export const BentoCard = Card

export function Button({ children, variant='primary', className='', size='md', glow=false, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-full',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
    xl: 'px-8 py-4 text-[15px] rounded-2xl font-bold tracking-tight',
  }
  const styles = {
    primary: `btn-neon ${glow ? 'shadow-[0_0_36px_rgba(6,182,214,0.5)]' : ''}`,
    neon: 'btn-neon',
    ghost: 'glass text-slate-200 hover:bg-white/10 hover:text-white border-white/10 hover:border-white/15 hover:shadow-[0_8px_20px_rgba(2,6,23,0.3)]',
    secondary: 'bg-white text-slate-900 hover:bg-slate-50 border border-white/0 shadow-[0_8px_16px_rgba(2,6,23,0.2)]',
    outline: 'bg-transparent border border-white/12 text-slate-200 hover:bg-white/5 hover:border-white/20 hover:text-white',
    danger: 'bg-red-500/90 text-white hover:bg-red-500 border border-red-400/20 shadow-[0_8px_16px_rgba(239,68,68,0.25)]',
  }
  const variantStyle = styles[variant] || styles.primary
  const sizeStyle = sizes[size] || sizes.md
  return <button className={`${base} ${sizeStyle} ${variantStyle} ${className}`} {...props}>{children}</button>
}

export function Input({ id, className='', ...props }) {
  return (
    <input
      id={id}
      {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.06] border border-white/10 text-white placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/35 focus:bg-white/[0.08] transition ${className}`}
    />
  )
}

export function Select({ id, className='', children, ...props }) {
  return (
    <select
      id={id}
      {...props}
      className={`w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.06] border border-white/10 text-white backdrop-blur-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/35 [&>option]:bg-[#0f172a] [&>option]:text-white transition ${className}`}
    >
      {children}
    </select>
  )
}

export function Textarea({ id, className='', ...props }) {
  return <textarea id={id} {...props} className={`w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.06] border border-white/10 text-white placeholder:text-slate-400 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/35 transition ${className}`} />
}

export function Label({ children, htmlFor, className='' }) {
  return <label htmlFor={htmlFor} className={`text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] ${className}`}>{children}</label>
}

// — Studio Skeletons — shimmering loaders instead of white blanks
export function Skeleton({ className='' }) {
  return <div className={`skeleton ${className}`} />
}
export function SkeletonText({ lines=3 }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({length: lines}).map((_,i)=>(
        <div key={i} className="skeleton h-3" style={{ width: i===lines-1 ? '68%' : '100%', opacity: 0.9 - i*0.08 }} />
      ))}
    </div>
  )
}
export function SkeletonCard({ className='' }) {
  return (
    <div className={`bento-card p-5 ${className}`}>
      <div className="space-y-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-3 w-full opacity-60" />
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-7 w-20 rounded-full" />
          <div className="skeleton h-7 w-24 rounded-full opacity-60" />
        </div>
      </div>
    </div>
  )
}
export function BentoSkeletonGrid() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8"><SkeletonCard className="h-[280px]" /></div>
      <div className="col-span-6 lg:col-span-4 flex flex-col gap-4">
        <SkeletonCard className="flex-1" />
        <SkeletonCard className="flex-1" />
      </div>
      <div className="col-span-6 lg:col-span-4"><SkeletonCard /></div>
      <div className="col-span-6 lg:col-span-8"><SkeletonCard /></div>
      <div className="col-span-12"><SkeletonCard className="h-[220px]" /></div>
    </div>
  )
}

// Premium Empty State — Studio edition (midnight glass with aurora)
export function Empty({ title, desc, action, variant='generic', icon }) {
  const illustrations = {
    income: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="12" y="22" width="64" height="44" rx="14" fill="rgba(6,182,214,0.10)" stroke="rgba(6,182,214,0.35)" strokeWidth="1.1"/>
        <rect x="22" y="32" width="44" height="8" rx="6" fill="#06b6d4" opacity="0.95"/>
        <rect x="22" y="44" width="30" height="6" rx="3" fill="#22d3ee" opacity="0.95"/>
        <circle cx="62" cy="52" r="10" fill="#06b6d4" stroke="rgba(255,255,255,0.9)" strokeWidth="2.3"/>
        <path d="M58 52 L61 55 L67 49" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    expense: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="14" y="18" width="60" height="52" rx="16" fill="rgba(251,146,60,0.08)" stroke="rgba(251,146,60,0.24)" strokeWidth="1.1"/>
        <path d="M28 32 H60" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" opacity="0.95"/>
        <path d="M28 42 H52" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" opacity="0.5"/>
        <circle cx="58" cy="58" r="12" fill="#fb923c" stroke="rgba(255,255,255,0.9)" strokeWidth="2.3"/>
        <path d="M58 52 V64 M52 58 H64" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    invoice: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="20" y="14" width="48" height="60" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" strokeWidth="1.1"/>
        <path d="M32 28 H56" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M32 38 H56" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.28"/>
        <circle cx="64" cy="64" r="11" fill="#06b6d4" stroke="rgba(255,255,255,0.9)" strokeWidth="2.3"/>
        <path d="M60 64 L62.8 66.8 L68 60.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    client: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="16" y="20" width="56" height="48" rx="16" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.22)" strokeWidth="1.1"/>
        <circle cx="34" cy="38" r="9" fill="#6366f1" opacity="0.95"/>
        <circle cx="54" cy="38" r="9" fill="#06b6d4" opacity="0.95"/>
        <rect x="26" y="54" width="36" height="6" rx="3" fill="rgba(255,255,255,0.14)"/>
      </svg>
    ),
    generic: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" className="mx-auto" aria-hidden>
        <rect x="18" y="22" width="52" height="44" rx="14" fill="rgba(6,182,214,0.09)" stroke="rgba(6,182,214,0.28)" strokeWidth="1.1"/>
        <path d="M32 34 H56" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
        <circle cx="58" cy="52" r="9" fill="#06b6d4" stroke="rgba(255,255,255,0.9)" strokeWidth="2.1"/>
        <path d="M54 52 L57 55 L63 48" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  const art = illustrations[variant] || illustrations.generic
  return (
    <Card className="p-8 md:p-10 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-transparent pointer-events-none rounded-[22px]" aria-hidden />
      <div className="relative" style={{ animation: 'float 3.5s ease-in-out infinite' }}>{art}</div>
      {icon && <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/15 text-cyan-300 grid place-items-center mx-auto -mt-2 mb-3 text-lg backdrop-blur">{icon}</div>}
      <h3 className="font-semibold font-display text-[17px] tracking-tight text-white relative">{title}</h3>
      <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed relative">{desc}</p>
      {action && <div className="mt-5 flex justify-center relative">{action}</div>}
      <p className="text-[11px] text-slate-500 mt-3 tracking-wide relative">Studio-grade • private & local • ~15 seconds</p>
    </Card>
  )
}

// Utility: shimmer row for tables
export function ShimmerRow() {
  return (
    <div className="flex gap-3 py-3 animate-pulse">
      <div className="skeleton h-4 w-24 rounded-full" />
      <div className="skeleton h-4 flex-1 opacity-70" />
      <div className="skeleton h-4 w-20 opacity-60" />
    </div>
  )
}

export function Badge({ children, tone='default', className='' }) {
  const map = {
    default: 'bg-white/8 text-slate-300 border-white/10',
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
    slate: 'bg-white/5 text-slate-400 border-white/8',
  }
  return <span className={`inline-flex items-center text-[10px] font-bold tracking-widest uppercase border rounded-full px-2.5 py-1 backdrop-blur ${map[tone]||map.default} ${className}`}>{children}</span>
}
