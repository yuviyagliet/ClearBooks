import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, useLocalMode } from '../lib/supabase'
import { Card, Button, Input, Label } from '../components/UI'

function GoogleButton({ onClick, disabled, label }){
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      {label}
    </button>
  )
}

export function Signup(){
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [loading,setLoading]=useState(false)
  const [googleLoading,setGoogleLoading]=useState(false)
  const hasTrackedStarted = useState(false)
  useEffect(()=>{
    // track when signup form is first viewed / interacted
    import('../lib/analytics').then(({ track })=> track('signup_started', { method: 'email' }))
  },[])
  const onSubmit = async(e)=>{
    e.preventDefault(); setErr(''); setInfo(''); 
    if(password.length < 6){ setErr('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { data, error } = await signUp(email,password)
    setLoading(false)
    if(error) setErr(error.message)
    else {
      // track completion
      import('../lib/analytics').then(({ track })=> track('signup_completed', { method: 'email' }))
      if (data?.session) {
        // mark onboarding as seen so Dashboard won't auto-launch again; we go directly to Add income
        try {
          if (data.session.user?.id) {
            localStorage.setItem('clearbooks_has_onboarded_' + data.session.user.id, 'true')
            localStorage.removeItem('clearbooks_just_signed_up')
            localStorage.removeItem('clearbooks_onboarding_pending_' + data.session.user.id)
          }
        } catch {}
        navigate('/income?onboarding=first_signup')
      } else {
        setInfo('Account created! Check your email to confirm, then log in.')
        setTimeout(()=> navigate('/login'), 1200)
      }
    }
  }
  const handleGoogle = async()=>{
    setErr(''); setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    setGoogleLoading(false)
    if(error) setErr(error.message)
    // on success Supabase redirects to /dashboard automatically
  }
  return <AuthShell title="Create your account" subtitle="Start tracking in 30 seconds — free." onSubmit={onSubmit} email={email} setEmail={setEmail} password={password} setPassword={setPassword} err={err} info={info} loading={loading} cta="Sign Up Free" alt={<>Have an account? <Link to="/login" className="text-teal-700 font-semibold">Log in</Link></>} googleAction={handleGoogle} googleLoading={googleLoading} />
}
export function Login(){
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)
  const [googleLoading,setGoogleLoading]=useState(false)
  const onSubmit = async(e)=>{
    e.preventDefault(); setErr(''); setLoading(true)
    const { error } = await signIn(email,password)
    setLoading(false)
    if(error) setErr(error.message)
    else navigate('/dashboard')
  }
  const handleGoogle = async()=>{
    setErr(''); setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    setGoogleLoading(false)
    if(error) setErr(error.message)
  }
  return <AuthShell title="Welcome back" subtitle="Log in to ClearBooks" onSubmit={onSubmit} email={email} setEmail={setEmail} password={password} setPassword={setPassword} err={err} loading={loading} cta="Log in" alt={<><Link to="/forgot-password" className="text-teal-700 font-semibold">Forgot password?</Link> <span className="text-gray-300 mx-2">·</span> No account? <Link to="/signup" className="text-teal-700 font-semibold">Sign up free</Link></>} googleAction={handleGoogle} googleLoading={googleLoading} />
}

export function ForgotPassword(){
  const { resetPassword } = useAuth()
  const [email,setEmail]=useState('')
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [loading,setLoading]=useState(false)
  const onSubmit = async(e)=>{
    e.preventDefault(); setErr(''); setInfo(''); setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if(error) setErr(error.message)
    else setInfo('Reset email sent! Check your inbox (and spam) for a link to set a new password.')
  }
  return (
    <div className="min-h-screen bg-[#f9fafb] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 font-bold text-lg text-[#0f172a] opacity-100 tracking-[0.025em] leading-none" style={{ color:'#0f172a', opacity:1, fontWeight:700, letterSpacing:'0.025em' }}><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center shrink-0">◈</span><span className="inline-flex items-center">ClearBooks</span></Link>
        <Card className="p-6 md:p-8">
          <h1 className="text-xl font-bold">Forgot password</h1>
          <p className="text-sm text-gray-500 mt-1">We’ll email you a reset link.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" type="email" required /></div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
            {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading?'Sending…':'Send reset link'}</Button>
          </form>
          <div className="text-sm text-center text-gray-500 mt-5"><Link to="/login" className="text-teal-700 font-semibold">Back to log in</Link></div>
        </Card>
      </div>
    </div>
  )
}

export function UpdatePassword(){
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [loading,setLoading]=useState(false)

  useEffect(()=>{
    if(useLocalMode) return
    supabase.auth.getSession().then(({data})=>{ if(!data.session){ } })
  },[])

  const onSubmit = async(e)=>{
    e.preventDefault(); setErr(''); setInfo('')
    if(password.length < 6){ setErr('Password must be at least 6 characters.'); return }
    if(password !== confirm){ setErr('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if(error) setErr(error.message)
    else { setInfo('Password updated! Redirecting to dashboard…'); setTimeout(()=> navigate('/dashboard'), 800) }
  }
  return (
    <div className="min-h-screen bg-[#f9fafb] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 font-bold text-lg text-[#0f172a] opacity-100 tracking-[0.025em] leading-none" style={{ color:'#0f172a', opacity:1, fontWeight:700, letterSpacing:'0.025em' }}><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center shrink-0">◈</span><span className="inline-flex items-center">ClearBooks</span></Link>
        <Card className="p-6 md:p-8">
          <h1 className="text-xl font-bold">Set new password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your new password below.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div><Label>New password</Label><Input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" required minLength={6} /></div>
            <div><Label>Confirm password</Label><Input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" type="password" required minLength={6} /></div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
            {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading?'Updating…':'Update password'}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function AuthShell({ title, subtitle, onSubmit, email, setEmail, password, setPassword, err, info, loading, cta, alt, googleAction, googleLoading }){
  return (
    <div className="min-h-screen bg-[#f9fafb] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 font-bold text-lg text-[#0f172a] opacity-100 tracking-[0.025em] leading-none" style={{ color:'#0f172a', opacity:1, fontWeight:700, letterSpacing:'0.025em' }}><span className="w-8 h-8 rounded-lg bg-teal-700 text-white grid place-items-center shrink-0">◈</span><span className="inline-flex items-center">ClearBooks</span></Link>
        <Card className="p-6 md:p-8">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          {useLocalMode && <div className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Supabase not configured. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env (and in Vercel) to enable real auth.</div>}
          
          {googleAction && (
            <>
              <div className="mt-6">
                <GoogleButton onClick={googleAction} disabled={googleLoading} label={googleLoading ? 'Redirecting…' : 'Continue with Google'} />
              </div>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or</span></div>
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" type="email" required /></div>
            <div><Label>Password</Label><Input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" required minLength={6} /></div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
            {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading?'Please wait…':cta}</Button>
          </form>
          <div className="text-sm text-center text-gray-500 mt-5">{alt}</div>
          <div className="text-xs text-center text-gray-400 mt-3"><Link to="/" className="hover:underline">← Back to landing</Link></div>
          <p className="text-[11px] text-center text-gray-400 mt-3">By continuing you agree to our Terms and Privacy.</p>
        </Card>
      </div>
    </div>
  )
}
