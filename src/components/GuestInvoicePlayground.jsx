import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, Input, Label } from './UI'
import { formatCurrency } from '../utils/helpers'
import { track } from '../lib/analytics'

// Guest Invoice Playground — Studio Dark glassmorphic
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
  const total = subtotal

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
    window.location.href = '/invoices'
  }

  return (
    <section className="relative max-w-6xl mx-auto px-6 py-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase bg-[#06b6d4] text-white rounded-full px-3 py-1 shadow-[0_4px_16px_rgba(6,182,214,0.28)] border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Try it in 10 seconds — no login required
        </div>
        <h2 className="font-display text-[28px] md:text-[34px] font-bold tracking-tight text-[#e2e8f0] mt-3 leading-[1.05]">See the invoice your client will love</h2>
        <p className="text-sm text-[#e2e8f0]/65 mt-2 leading-relaxed">Type a client, project & amount — watch a premium, agency-grade invoice appear instantly. Love it? Save it to your free account with one click.</p>
      </div>

      <div className="mt-8 grid lg:grid-cols-5 gap-6 items-start">
        {/* Glass form */}
        <div className="lg:col-span-2 rounded-[20px] p-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg" style={{ boxShadow:'0 16px 40px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <h3 className="font-display font-semibold text-[15px] text-[#e2e8f0]">Your details — 10 seconds</h3>
          <p className="text-xs text-[#e2e8f0]/55 mt-1">No email needed. Just type and watch the preview →</p>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="playground-client" className="text-[#e2e8f0]/70">Client Name *</Label>
              <Input
                id="playground-client"
                value={clientName}
                onChange={e=>{ setClientName(e.target.value); markInteract() }}
                placeholder="Acme Studio"
                autoComplete="off"
                className="mt-1.5 bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.10)] text-[#e2e8f0] placeholder:text-[#e2e8f0]/35 focus:border-[#06b6d4] focus:ring-[#06b6d4]/25"
              />
              <p className="text-[11px] text-[#e2e8f0]/45 mt-1">Who you’re billing — “Bill to”.</p>
            </div>

            <div>
              <Label htmlFor="playground-project" className="text-[#e2e8f0]/70">Project Name *</Label>
              <Input
                id="playground-project"
                value={projectName}
                onChange={e=>{ setProjectName(e.target.value); markInteract() }}
                placeholder="Color grading — Project X"
                className="mt-1.5 bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.10)] text-[#e2e8f0] placeholder:text-[#e2e8f0]/35 focus:border-[#06b6d4] focus:ring-[#06b6d4]/25"
              />
              <p className="text-[11px] text-[#e2e8f0]/45 mt-1">Appears as the line item description.</p>
            </div>

            <div>
              <Label htmlFor="playground-amount" className="text-[#e2e8f0]/70">Amount ({currency}) *</Label>
              <Input
                id="playground-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e=>{ setAmount(e.target.value); markInteract() }}
                placeholder="2500"
                className="mt-1.5 bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.10)] text-[#e2e8f0] placeholder:text-[#e2e8f0]/35 focus:border-[#06b6d4] focus:ring-[#06b6d4]/25"
              />
              <p className="text-[11px] text-[#e2e8f0]/45 mt-1">Total before tax — exact PDF preview on the right.</p>
            </div>

            <button
              onClick={handleHookCta}
              disabled={!canSave}
              className="w-full bg-[#06b6d4] text-white rounded-xl px-5 py-3.5 text-sm font-semibold hover:bg-[#0891b2] hover:shadow-[0_8px_24px_rgba(6,182,214,0.38)] hover:-translate-y-px active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shadow-[0_8px_20px_rgba(6,182,214,0.28)]"
            >
              Save this Invoice & Download PDF →
            </button>
            <p className="text-[11px] text-center text-[#e2e8f0]/45">Free while in beta · No credit card · Draft saved to your account after sign-up</p>
            <p className="text-[11px] text-center text-[#e2e8f0]/55">Preview is unlimited — save requires a free account</p>
          </div>
        </div>

        {/* Glowing floating preview */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#e2e8f0]/60">Real-time premium preview</span>
            <span className="text-[11px] text-[#e2e8f0]/45 hidden md:block">Updates as you type · Agency-grade</span>
          </div>

          {/* Glassmorphic preview card — floating glow */}
          <div className="rounded-[20px] overflow-hidden bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg relative" style={{ boxShadow:'0 24px 64px rgba(2,6,23,0.55), 0 0 40px rgba(6,182,214,0.14), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            {/* glow halo behind */}
            <div className="pointer-events-none absolute -inset-[1px] rounded-[20px] opacity-60" style={{ background:'radial-gradient(600px 220px at 70% 0%, rgba(6,182,214,0.18), transparent 65%)' }} aria-hidden />
            <div className="relative bg-[rgba(255,255,255,0.02)] p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white grid place-items-center text-xs shadow-[0_4px_16px_rgba(6,182,214,0.32)] border border-white/10 shrink-0">◈</div>
                  <div>
                    <div className="font-display font-bold text-[14px] tracking-tight leading-none text-[#e2e8f0]">{businessName}</div>
                    <div className="text-[11px] text-[#e2e8f0]/60 mt-1">hello@yourstudio.co</div>
                    <div className="text-[11px] text-[#e2e8f0]/50">+1 555 0100 · GSTIN on file</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] tracking-[0.14em] uppercase font-bold text-[#e2e8f0]/50">Invoice</div>
                  <div className="font-mono font-bold text-[20px] tracking-tight leading-none mt-0.5 text-[#e2e8f0]">{invoiceNumber}</div>
                  <div className="text-[11px] text-[#e2e8f0]/60 mt-1.5">Issue {issueDate} · Due {dueDate}</div>
                  <span className="inline-flex mt-2 text-[10px] font-bold border rounded-full px-2.5 py-1 bg-[#06b6d4] text-white border-white/10 shadow">Preview</span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] tracking-widest uppercase font-bold text-[#e2e8f0]/50">Bill to</div>
                  <div className="font-semibold text-[14px] text-[#e2e8f0] mt-1.5 leading-tight">{clientName.trim() || 'Client name'}</div>
                  <div className="text-xs text-[#e2e8f0]/50 mt-1">Client sees this exactly as typed</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-[10px] tracking-widest uppercase font-bold text-[#e2e8f0]/50">From</div>
                  <div className="text-xs text-[#e2e8f0]/70 mt-1.5">{businessName} · Your Studio LLC</div>
                  <div className="text-[11px] text-[#e2e8f0]/45">Post-production · Color & Edit</div>
                </div>
              </div>

              <div className="mt-7 border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur">
                <div className="grid grid-cols-12 bg-white/5 text-[10px] font-bold tracking-widest uppercase text-[#e2e8f0]/60 px-4 py-2.5 border-b border-white/10">
                  <span className="col-span-7">Description</span>
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                <div className="grid grid-cols-12 px-4 py-3.5 text-sm items-center">
                  <span className="col-span-7 truncate pr-2 font-medium text-[#e2e8f0]">{projectName.trim() || 'Project name'}</span>
                  <span className="col-span-1 text-center font-mono text-xs text-[#e2e8f0]/70">1</span>
                  <span className="col-span-2 text-right font-mono text-xs text-[#e2e8f0]/70">{formatCurrency(subtotal, currency)}</span>
                  <span className="col-span-2 text-right font-semibold font-mono text-[#e2e8f0]">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="px-4 py-2 text-[11px] text-[#e2e8f0]/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> No tax preview — add GST/VAT after sign-up if needed
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-[280px] space-y-2">
                  <div className="flex justify-between text-sm text-[#e2e8f0]/70">
                    <span>Subtotal</span><span className="font-mono font-medium text-[#e2e8f0]">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#e2e8f0]/70">
                    <span>No tax</span><span className="font-mono text-[#e2e8f0]">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                  <div className="border-t border-white/15 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#e2e8f0]/60">Total Amount</span>
                    <span className="font-display font-bold text-[22px] tracking-tight leading-none text-[#e2e8f0]">{formatCurrency(total, currency)}</span>
                  </div>
                  <p className="text-[11px] text-right text-[#e2e8f0]/45">What your client pays at a glance</p>
                </div>
              </div>

              {!user && (
                <div className="mt-7 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 backdrop-blur">
                  <span className="text-amber-300 mt-0.5">✦</span>
                  <div className="text-xs leading-relaxed">
                    <span className="font-semibold text-amber-200">Exactly what your client receives</span>
                    <span className="text-amber-200/75"> — premium typography, generous whitespace & clear total. Payment instructions and terms are auto-added after you save.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/[0.04] border-t border-white/10 px-5 py-3 flex items-center justify-between gap-3 backdrop-blur">
              <span className="text-[11px] text-[#e2e8f0]/50 hidden md:block">Save to keep this layout · Your logo & brand color apply after sign-up</span>
              <button onClick={handleHookCta} className="ml-auto bg-[#06b6d4] text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-[#0891b2] border border-white/10 shadow-[0_4px_16px_rgba(6,182,214,0.28)]">Save this Invoice & Download PDF →</button>
            </div>
          </div>

          <p className="text-[11px] text-center text-[#e2e8f0]/45 mt-3">Loved by 850+ colorists & editors · <Link to="/signup" className="text-[#06b6d4] font-medium hover:text-cyan-300">Create free account to keep this draft →</Link></p>
        </div>
      </div>

      {showGate && !user && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button aria-label="Close" onClick={()=> setShowGate(false)} className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-[20px] p-6 md:p-7 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] backdrop-blur-lg shadow-2xl" style={{ boxShadow:'0 24px 64px rgba(2,6,23,0.6), 0 0 32px rgba(6,182,214,0.16)' }}>
            <div className="w-10 h-10 rounded-xl bg-[#06b6d4] text-white grid place-items-center mx-auto shadow-[0_4px_16px_rgba(6,182,214,0.32)]">◈</div>
            <h3 className="font-display font-bold text-lg text-center mt-3 tracking-tight text-[#e2e8f0]">Save this invoice to your account</h3>
            <p className="text-sm text-[#e2e8f0]/65 text-center mt-2 leading-relaxed">
              Your preview for <span className="font-semibold text-[#e2e8f0]">{clientName || 'your client'}</span> — <span className="font-mono font-semibold text-[#e2e8f0]">{formatCurrency(total, currency)}</span> · {projectName || 'Project'} is ready.
              <br />Sign up (or log in) to save it, download the premium PDF, and track payment.
            </p>

            <div className="mt-5 bg-white/5 border border-white/10 rounded-xl p-3 text-xs flex items-center justify-between gap-3 text-[#e2e8f0]">
              <span className="truncate"><span className="font-mono font-semibold">{invoiceNumber}</span> · {clientName || 'Client'} · {formatCurrency(total, currency)}</span>
              <span className="text-[10px] font-bold bg-white/10 border border-white/10 rounded-full px-2 py-1">Draft</span>
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                to="/signup"
                onClick={()=> { try{ track('guest_playground_gate_signup', { amount: total }) }catch{} }}
                className="bg-[#06b6d4] text-white rounded-xl px-5 py-3 text-sm font-semibold text-center hover:bg-[#0891b2] border border-white/10 shadow-[0_8px_20px_rgba(6,182,214,0.28)]"
              >
                Create Free Account — Save & Download →
              </Link>
              <Link
                to="/login"
                onClick={()=> { try{ track('guest_playground_gate_login') }catch{} }}
                className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 text-sm font-semibold text-center text-[#e2e8f0] hover:bg-white/10"
              >
                Log in to save
              </Link>
              <button onClick={()=> setShowGate(false)} className="text-xs text-[#e2e8f0]/50 hover:text-[#e2e8f0] hover:underline mt-1">Continue editing — keep preview</button>
            </div>
            <p className="text-[11px] text-center text-[#e2e8f0]/40 mt-4">Free while in beta · Draft stays on this device until you save</p>
          </div>
        </div>
      )}
    </section>
  )
}
