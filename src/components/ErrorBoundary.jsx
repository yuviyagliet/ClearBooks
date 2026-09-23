import React from 'react'
import { track } from '../lib/analytics'

// Crash-only Error Boundary: catches render/lifecycle errors only.
// It does NOT catch async API/promise rejections — those are handled
// via explicit try/catch in DataContext/pages with friendly messages.
// See src/utils/errors.js for API error mapping.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log for developers — user sees generic fallback only
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo)
    try {
      track('app_crash', { message: String(error?.message || error).slice(0, 300), stack: String(error?.stack || '').slice(0, 500) })
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    // if caller provided reset, let it run; otherwise soft-reload the section
    if (typeof this.props.onReset === 'function') {
      try { this.props.onReset() } catch {}
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
      const raw = this.state.error?.message || String(this.state.error || '')
      return (
        <div className="min-h-screen grid place-items-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 grid place-items-center mx-auto mb-3 text-xl">!</div>
            <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500 mt-2">
              We ran into an unexpected issue. Your data is safe. Please try again.
            </p>
            <div className="flex gap-2 justify-center mt-5">
              <button onClick={this.handleRetry} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800">Try again</button>
              <button onClick={this.handleReload} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50">Reload page</button>
            </div>
            {isDev && raw && (
              <details className="mt-5 text-left bg-gray-50 border border-gray-200 rounded-xl p-3">
                <summary className="text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer">Details (dev only)</summary>
                <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">{raw}</pre>
                {this.state.error?.stack && <pre className="text-[11px] text-gray-400 mt-2 whitespace-pre-wrap break-words">{String(this.state.error.stack).slice(0, 800)}</pre>}
              </details>
            )}
            <p className="text-[11px] text-gray-400 mt-4">If this keeps happening, contact support — the error has been logged.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
