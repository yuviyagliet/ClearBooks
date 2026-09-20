import { Link, useLocation } from 'react-router-dom'

export default function NotFound(){
  const location = useLocation()
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 grid place-items-center mx-auto mb-4 text-xl">404</div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-gray-500 mt-2">The page <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{location.pathname}</span> doesn’t exist. It may have been moved or never existed.</p>
        <div className="flex gap-2 justify-center mt-6">
          <Link to="/" className="bg-teal-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-teal-800">Go to landing</Link>
          <Link to="/dashboard" className="bg-white border border-gray-200 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-50">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
