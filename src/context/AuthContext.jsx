import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, useLocalMode } from '../lib/supabase'

const AuthContext = createContext(null)

function friendlyAuthError(err) {
  if (!err) return null
  const msg = err.message || ''
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) return 'An account with this email already exists. Try logging in instead.'
  if (msg.includes('Invalid login credentials') || msg.includes('Invalid login')) return 'Wrong email or password. Please try again.'
  if (msg.includes('Password should be at least') || msg.includes('weak') ) return 'Password is too weak — use at least 6 characters.'
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first. Check your inbox.'
  if (msg.includes('rate limit') ) return 'Too many attempts. Please wait a minute and try again.'
  return msg
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (useLocalMode) {
      const saved = localStorage.getItem('clearbooks_user')
      if (saved) setUser(JSON.parse(saved))
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    if (useLocalMode) {
      const u = { id: 'local-user', email }
      localStorage.setItem('clearbooks_user', JSON.stringify(u))
      setUser(u)
      return { error: null }
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: { message: friendlyAuthError(error) } }
    // Supabase may require email confirmation — if session exists we're logged in
    if (data.session) setUser(data.session.user)
    return { data, error: null }
  }
  const signIn = async (email, password) => {
    if (useLocalMode) {
      const u = { id: 'local-user', email }
      localStorage.setItem('clearbooks_user', JSON.stringify(u))
      setUser(u)
      return { error: null }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: { message: friendlyAuthError(error) } }
    setUser(data.user ?? data.session?.user ?? null)
    return { data, error: null }
  }
  const signOut = async () => {
    if (useLocalMode) {
      localStorage.removeItem('clearbooks_user')
      setUser(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  const resetPassword = async (email) => {
    if (useLocalMode) return { error: { message: 'Password reset not available in demo mode. Configure Supabase.' } }
    const redirectTo = `${window.location.origin}/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: { message: friendlyAuthError(error) } }
    return { error: null }
  }

  const updatePassword = async (newPassword) => {
    if (useLocalMode) return { error: null }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: { message: friendlyAuthError(error) } }
    return { error: null }
  }

  const signInWithGoogle = async () => {
    if (useLocalMode) return { error: { message: 'Google login requires Supabase configuration.' } }
    const redirectTo = `${window.location.origin}/dashboard`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) return { error: { message: friendlyAuthError(error) } }
    return { error: null }
  }

  const deleteAccount = async () => {
    if (useLocalMode) {
      localStorage.clear()
      setUser(null)
      return { error: null }
    }
    if (!user) return { error: { message: 'No user logged in' } }
    // Delete all user data first
    try {
      const userId = user.id
      // Delete in parallel - ignore errors but try
      await Promise.all([
        supabase.from('invoices').delete().eq('user_id', userId),
        supabase.from('expenses').delete().eq('user_id', userId),
        supabase.from('income').delete().eq('user_id', userId),
        supabase.from('clients').delete().eq('user_id', userId),
      ])
      // Try to delete storage files under user folder
      try {
        const { data: files } = await supabase.storage.from('receipts').list(userId, { limit: 1000 })
        if (files?.length) {
          const paths = files.map(f => `${userId}/${f.name}`)
          await supabase.storage.from('receipts').remove(paths)
        }
      } catch {}
      // Try to delete auth user via RPC (requires function delete_current_user)
      const { error: rpcError } = await supabase.rpc('delete_current_user')
      if (rpcError) {
        // Fallback: sign out (client cannot delete auth.users without service role)
        console.warn('RPC delete_current_user failed:', rpcError.message, '— signing out and clearing local data instead. Ensure supabase/schema.sql function exists.')
        await supabase.auth.signOut()
        setUser(null)
        return { error: null, warning: 'Data deleted and logged out. Auth account deletion requires the delete_current_user function (see schema.sql). Ask admin to enable it or delete user in Supabase dashboard.' }
      }
      await supabase.auth.signOut()
      setUser(null)
      return { error: null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  return <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, signInWithGoogle, resetPassword, updatePassword, deleteAccount }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
