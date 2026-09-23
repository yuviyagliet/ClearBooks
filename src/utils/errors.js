// Friendly error mapping — keeps raw technical errors out of the UI
// but preserves them for developers via console.error + analytics.

import { track } from '../lib/analytics'

export function isSchemaCacheError(message) {
  if (!message) return false
  const m = String(message).toLowerCase()
  return m.includes('schema cache') || (m.includes('could not find') && m.includes('column'))
}

export function friendlyDbMessage(rawMessage) {
  if (!rawMessage) return 'Something went wrong. Please try again.'
  const m = String(rawMessage)

  if (isSchemaCacheError(m)) {
    // Canonical raw example: "Could not find the 'tax_rate' column of 'invoices' in the schema cache"
    return 'We couldn’t save your invoice right now due to a temporary database configuration issue. Your data is safe — please try again in a moment. If this keeps happening, run the database migration in supabase/schema.sql or contact support.'
  }
  if (m.toLowerCase().includes('failed to fetch') || m.toLowerCase().includes('networkerror') || m.toLowerCase().includes('fetch failed')) {
    return 'Network error — please check your connection and try again.'
  }
  if (m.toLowerCase().includes('jwt') || m.toLowerCase().includes('permission') || m.toLowerCase().includes('row level security') || m.toLowerCase().includes('not authenticated')) {
    return 'Your session may have expired. Please refresh the page and log in again.'
  }
  if (m.toLowerCase().includes('duplicate') || m.toLowerCase().includes('unique')) {
    return 'This record already exists. Please check for duplicates and try again.'
  }
  // Fallback: return a generic friendly wrapper if message looks technical (contains PGRST, column, cache, etc.)
  if (m.length > 120 && (m.includes('PGRST') || m.includes('column') || m.includes('schema'))) {
    return 'Something went wrong while saving. Please try again. If this persists, contact support.'
  }
  return m
}

export function toFriendlyError(err, context = 'unknown') {
  const raw = err?.message || err?.error_description || String(err || '')
  const friendly = friendlyDbMessage(raw)
  // Only log the raw technical error for developers — never show it to the user directly
  if (friendly !== raw) {
    console.error(`[DataError:${context}] raw:`, raw, err)
    try { track('db_error_mapped', { context, raw: String(raw).slice(0, 300), friendly: String(friendly).slice(0, 200) }) } catch {}
  } else if (isSchemaCacheError(raw)) {
    console.error(`[DataError:${context}]`, err)
  }
  const friendlyErr = new Error(friendly)
  // preserve raw for debugging in error instance without exposing in UI
  friendlyErr.cause = err
  friendlyErr.rawMessage = raw
  return friendlyErr
}
