import { track as vercelTrack } from '@vercel/analytics'

export function track(event, props = {}) {
  try {
    // Vercel Analytics - visible in Vercel dashboard
    if (typeof vercelTrack === 'function') {
      vercelTrack(event, props)
    }
    // also log for local dev verification
    try {
      // eslint-disable-next-line no-undef
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.log(`[Analytics] ${event}`, props)
      }
    } catch {}
    // store locally for verification in dev/e2e
    try {
      const key = 'clearbooks_analytics_log'
      const log = JSON.parse(localStorage.getItem(key) || '[]')
      log.push({ event, props, ts: new Date().toISOString() })
      // keep last 100
      localStorage.setItem(key, JSON.stringify(log.slice(-100)))
    } catch {}
  } catch (e) {
    console.warn('track failed', e)
  }
}

export function getAnalyticsLog() {
  try {
    return JSON.parse(localStorage.getItem('clearbooks_analytics_log') || '[]')
  } catch { return [] }
}

export function clearAnalyticsLog() {
  localStorage.removeItem('clearbooks_analytics_log')
}
