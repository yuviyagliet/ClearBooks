import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

// Helper to check if we should use local mode
export const useLocalMode = !isSupabaseConfigured

if (useLocalMode) {
  console.info('Supabase not configured – running in local demo mode (localStorage). Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real backend.')
}
