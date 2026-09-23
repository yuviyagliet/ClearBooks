import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, Input, Label } from './UI'
import { formatCurrency } from '../utils/helpers'
import { track } from '../lib/analytics'

// Guest Invoice Playground — "Try it in 10 seconds"
// Minimal form (Client Name, Project Name, Amount) + real-time premium preview
// No login required. Hook CTA "Save this Invoice & Download PDF" gates to Sign Up/Login.
export default function GuestInvoicePlayground(){
  const { user } = useAuth()
  const [clientName, setClientName] = useState('Mosaic Pictures')
  const [projectName, setProjectName] = useState('Color grading — Project X')
  const [amount, setAmount] = useState('2500')
  const [showGate, setShowGate] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [currency] = useState('$')

  const markInteract = ()=>{
    if (!hasInteracted){
      setHasInteracted(true)
      try{ track('guest_playground_interacted', { clientName: clientName.slice(0,20), amount }) }catch{}
    }
  }

  const subtotal = useMemo(()=> {
    const n = Number(amount)
    return Number.isFinite(n) && n>0 ? Number(n.toFixed(2)) : 0
  }, [amount])
  const taxAmount = 0
  const total = subtotal // keep guest minimal: No tax preview. Premium tax appears after sign-up.

  const issueDate = useMemo(()=> new Date().toISOString().slice(0,10), [])
  const dueDate = useMemo(()=> new Date(Date.now()+14*24*3600*1000).toISOString().slice(0,10), [])
  const invoiceNumber = 'INV-1042'
  const businessName = 'Your Studio'

  const canSave = clientName.trim().length >= 2 && projectName.trim().length >= 2 && total > 0

  const persistDraft = ()=>{
    try{
      localStorage.setItem('clearbooks_preview_draft', JSON.stringify({
        clientName: clientName.trim(),
        description: projectName.trim(),
        amount,
        quantity: 1,
        rate: subtotal,
        currency,
        total,
        invoiceNumber,
        issueDate,
        dueDate,
      }))
    }catch{}
  }

  const handleHookCta = ()=>{
    if (!canSave) return
    persistDraft()
    if (!user){
      setShowGate(true)
      try{ track('guest_playground_gate_viewed', { amount: total, clientName }) }catch{}
      return
    }
    // Authed: go straight to invoices — draft will hydrate there
    // We don't auto-create; let user review in Invoices form (premium flow)
    window.location.hash = '#invoices'
    // Soft navigate via Link would be better, but for CTA we use hard redirect to preserve draft
    // Using window.location to avoid hook dep; modal not needed
    window.location.href = '/invoices'
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      {/* Header — high conversion */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase bg-teal-700 text-white rounded-full px-3 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Try it in 10 seconds — no login required
        </div>
        <h2 className="font-display text-[28px] md:text-[34px] font-bold tracking-tight text-slate-900 mt-3 leading-[1.05]">See the invoice your client will love</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">Type a client, project & amount — watch a premium, agency-grade invoice appear instantly. Love it? Save it to your free account with one click.</p>
      </div>

      <div className="mt-8 grid lg:grid-cols-5 gap-6 items-start">
        {/* Minimal form */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-[15px]">Your details — 10 seconds</h3>
          <p className="text-xs text-slate-500 mt-1">No email needed. Just type and watch the preview →</p>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="playground-client">Client Name *</Label>
              <Input
                id="playground-client"
                value={clientName}
                onChange={e=>{ setClientName(e.target.value); markInteract() }}
                placeholder="Acme Studio"
                autoComplete="off"
              />
              <p className="text-[11px] text-slate-400 mt-1">Who you’re billing — “Bill to”.</p>
            </div>

            <div>
              <Label htmlFor="playground-project">Project Name *</Label>
              <Input
                id="playground-project"
                value={projectName}
                onChange={e=>{ setProjectName(e.target.value); markInteract() }}
                placeholder="Color grading — Project X"
              />
              <p className="text-[11px] text-slate-400 mt-1">Appears as the line item description.</p>
            </div>

            <div>
              <Label htmlFor="playground-amount">Amount ({currency}) *</Label>
              <Input
                id="playground-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e=>{ setAmount(e.target.value); markInteract() }}
                placeholder="2500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Total before tax — exact PDF preview on the right.</p>
            </div>

            <button
              onClick={handleHookCta}
              disabled={!canSave}
              className="w-full bg-slate-900 text-white rounded-xl px-5 py-3.5 text-sm font-semibold hover:bg-black hover:shadow-lg hover:-translate-y-px active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Save this Invoice & Download PDF →
            </button>
            <p className="text-[11px] text-center text-slate-400">Free while in beta · No credit card · Draft saved to your account after sign-up</p>
            <p className="text-[11px] text-center text-slate-500">Preview is unlimited — save requires a free account</p>
          </div>
        </Card>

        {/* Real-time premium preview */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Real-time premium preview</span>
            <span className="text-[11px] text-slate-400 hidden md:block">Updates as you type · Agency-grade</span>
          </div>

          {/* Premium agency invoice — mirrors src/utils/invoicePdf.js Modern Minimal with color */}
          <Card className="overflow-hidden p-0 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div className="bg-white p-6 md:p-7">
              {/* Header — generous whitespace, hierarchy */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-teal-600 text-white grid place-items-center text-xs shadow-md shrink-0">◈</div>
                  <div>
                    <div className="font-display font-bold text-[14px] tracking-tight leading-none">{businessName}</div>
                    <div className="text-[11px] text-slate-500 mt-1">hello@yourstudio.co</div>
                    <div className="text-[11px] text-slate-500">+1 555 0100 · GSTIN on file</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] tracking-[0.14em] uppercase font-bold text-slate-400">Invoice</div>
                  <div className="font-mono font-bold text-[20px] tracking-tight leading-none mt-0.5">{invoiceNumber}</div>
                  <div className="text-[11px] text-slate-500 mt-1.5">Issue {issueDate} · Due {dueDate}</div>
                  <span className="inline-flex mt-2 text-[10px] font-bold border rounded-full px-2.5 py-1 bg-slate-900 text-white border-slate-900">Preview</span>
                </div>
              </div>

              {/* Bill to */}
              <div className="mt-7 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] tracking-widest uppercase font-bold text-slate-400">Bill to</div>
                  <div className="font-semibold text-[14px] text-slate-900 mt-1.5 leading-tight">{clientName.trim() || 'Client name'}</div>
                  <div className="text-xs text-slate-500 mt-1">Client sees this exactly as typed</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-[10px] tracking-widest uppercase font-bold text-slate-400">From</div>
                  <div className="text-xs text-slate-600 mt-1.5">{businessName} · Your Studio LLC</div>
                  <div className="text-[11px] text-slate-400">Post-production · Color & Edit</div>
                </div>
              </div>

              {/* Table — clean, airy */}
              <div className="mt-7 border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-bold tracking-widest uppercase text-slate-500 px-4 py-2.5 border-b border-slate-200">
                  <span className="col-span-7">Description</span>
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="grid grid-cols-12 px-4 py-3.5 text-sm items-center">
                  <span className="col-span-7 truncate pr-2 font-medium text-slate-900">{projectName.trim() || 'Project name'}</span>
                  <span className="col-span-1 text-center font-mono text-xs text-slate-600">1</span>
                  <span className="col-span-2 text-right font-mono text-xs text-slate-600">{formatCurrency(subtotal, currency)}</span>
                  <span className="col-span-2 text-right font-semibold font-mono">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="px-4 py-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No tax preview — add GST/VAT after sign-up if needed
                </div>
              </div>

              {/* Totals — hierarchy: Total Amount is hero */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-[280px] space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span><span className="font-mono font-medium">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>No tax</span><span className="font-mono">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                  <div className="border-t border-slate-900 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Total Amount</span>
                    <span className="font-display font-bold text-[22px] tracking-tight leading-none">{formatCurrency(total, currency)}</span>
                  </div>
                  <p className="text-[11px] text-right text-slate-400">What your client pays at a glance</p>
                </div>
              </div>

              {/* Payment hint */}
              {!user && (
                <div className="mt-7 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <span className="text-amber-600 mt-0.5">✦</span>
                  <div className="text-xs leading-relaxed">
                    <span className="font-semibold text-amber-900">Exactly what your client receives</span>
                    <span className="text-amber-800"> — premium typography, generous whitespace & clear total. Payment instructions and terms are auto-added after you save.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer bar inside preview */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 hidden md:block">Save to keep this layout · Your logo & brand color apply after sign-up</span>
              <button onClick={handleHookCta} className="ml-auto bg-teal-700 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-teal-800 hover:shadow transition">Save this Invoice & Download PDF →</button>
            </div>
          </Card>

          <p className="text-[11px] text-center text-slate-400 mt-3">Loved by 850+ colorists & editors · <Link to="/signup" className="text-teal-700 font-medium hover:underline">Create free account to keep this draft →</Link></p>
        </div>
      </div>

      {/* Gate modal — Sign Up / Login */}
      {showGate && !user && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button aria-label="Close" onClick={()=> setShowGate(false)} className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" />
          <Card className="relative w-full max-w-md p-6 md:p-7 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white grid place-items-center mx-auto shadow">◈</div>
            <h3 className="font-display font-bold text-lg text-center mt-3 tracking-tight">Save this invoice to your account</h3>
            <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed">
              Your preview for <span className="font-semibold text-slate-900">{clientName || 'your client'}</span> — <span className="font-mono font-semibold">{formatCurrency(total, currency)}</span> · {projectName || 'Project'} is ready.
              <br />Sign up (or log in) to save it, download the premium PDF, and track payment.
            </p>

            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between gap-3">
              <span className="truncate"><span className="font-mono font-semibold">{invoiceNumber}</span> · {clientName || 'Client'} · {formatCurrency(total, currency)}</span>
              <span className="text-[10px] font-bold bg-white border border-slate-200 rounded-full px-2 py-1">Draft</span>
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                to="/signup"
                onClick={()=> { try{ track('guest_playground_gate_signup', { amount: total }) }catch{} }}
                className="bg-teal-700 text-white rounded-xl px-5 py-3 text-sm font-semibold text-center hover:bg-teal-800 hover:shadow-md transition"
              >
                Create Free Account — Save & Download →
              </Link>
              <Link
                to="/login"
                onClick={()=> { try{ track('guest_playground_gate_login') }catch{} }}
                className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-center hover:bg-slate-50 transition"
              >
                Log in to save
              </Link>
              <button onClick={()=> setShowGate(false)} className="text-xs text-slate-500 hover:text-slate-700 hover:underline mt-1">Continue editing — keep preview</button>
            </div>
            <p className="text-[11px] text-center text-slate-400 mt-4">Free while in beta · Draft stays on this device until you save</p>
          </Card>
        </div>
      )}
    </section>
  )
}
