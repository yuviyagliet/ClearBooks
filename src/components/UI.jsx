export function Card({ children, className='' }){
  return <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}>{children}</div>
}
export function Button({ children, variant='primary', className='', ...props }){
  const base='inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50'
  const styles = variant==='primary' ? 'bg-teal-700 text-white hover:bg-teal-800' : variant==='ghost' ? 'bg-white border border-gray-200 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-black'
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>
}
export function Input(props){
  return <input {...props} className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white ${props.className||''}`} />
}
export function Select(props){
  return <select {...props} className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 ${props.className||''}`} />
}
export function Label({children}){ return <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{children}</label>}
export function Empty({ title, desc, action }){
  return <Card className="p-10 text-center">
    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 grid place-items-center mx-auto mb-3 text-xl">＋</div>
    <h3 className="font-semibold">{title}</h3>
    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{desc}</p>
    {action && <div className="mt-4">{action}</div>}
  </Card>
}
