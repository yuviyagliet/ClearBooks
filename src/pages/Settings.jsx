import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Input, Label, Select } from '../components/UI'
import { getInvoiceThemeOptions } from '../utils/invoicePdf'

const themes = getInvoiceThemeOptions()

export default function Settings(){
  const { data, updateSettings } = useData()
  const { user, deleteAccount, signOut } = useAuth()
  const navigate = useNavigate()
  const [form,setForm]=useState(data.settings)
  const [saved,setSaved]=useState(false)
  const [err,setErr]=useState('')
  const [info,setInfo]=useState('')
  const [deleting,setDeleting]=useState(false)
  const [logoUploading,setLogoUploading]=useState(false)

  useEffect(()=> setForm(data.settings), [data.settings])

  const submit=async(e)=>{
    e.preventDefault()
    setErr(''); setInfo('')
    const validTypes = ['none','gst','vat','custom','exempt']
    const tax_type = validTypes.includes(form.default_tax_type) ? form.default_tax_type : 'none'
    let rate = Number(form.default_tax_rate)
    if (tax_type === 'none' || tax_type === 'exempt') rate = 0
    else if (form.default_tax_rate !== '' && (isNaN(rate) || rate <0 || rate >100)) { setErr('Default tax rate must be 0–100'); return }
    else if (form.default_tax_rate === '') rate = 0
    let revDefault = Number(form.default_revisions_included)
    if (form.default_revisions_included !== '' && (isNaN(revDefault) || !Number.isInteger(revDefault) || revDefault <0 || revDefault>100)) { setErr('Default revisions must be integer 0–100'); return }
    if (form.default_revisions_included === '') revDefault = 2
    // Validate color
    const hexOk = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.primaryColor || '')
    if (!hexOk) { setErr('Primary color must be a valid hex (e.g. #0f766e)'); return }
    if (!themes.some(t=> t.value === form.invoiceTheme)) { setErr('Pick a valid invoice theme'); return }
    try{
      const toSave = {
        ...form,
        default_tax_type: tax_type,
        default_tax_rate: rate,
        default_revisions_included: Math.floor(revDefault),
        primaryColor: form.primaryColor || '#0f766e',
        invoiceTheme: form.invoiceTheme || 'modern-minimal',
        logoUrl: form.logoUrl || null,
        logoName: form.logoName || null,
        paymentInstructions: {
          bankName: (form.paymentInstructions?.bankName || '').trim(),
          accountNumber: (form.paymentInstructions?.accountNumber || '').trim(),
          ifsc: (form.paymentInstructions?.ifsc || '').trim(),
          accountHolder: (form.paymentInstructions?.accountHolder || '').trim(),
          paypalLink: (form.paymentInstructions?.paypalLink || '').trim(),
          upiId: (form.paymentInstructions?.upiId || '').trim(),
          custom: (form.paymentInstructions?.custom || '').trim(),
        },
        termsEnabled: !!form.termsEnabled,
        termsText: (form.termsText || '').trim() || 'Payment due within 14 days. Late payments may incur fees. Thank you for your business!',
      }
      await updateSettings(toSave)
      setSaved(true); setInfo('Settings saved — your invoices will use the new look on next PDF')
      setTimeout(()=>{setSaved(false); setInfo('')},2800)
    }catch(ex){ setErr(ex.message) }
  }

  const handleLogo = async(e)=>{
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    if (!file.type.startsWith('image/')) { setErr('Logo must be an image (PNG/JPG/WebP)'); return }
    if (file.size > 2*1024*1024) { setErr('Logo too large — max 2MB. Use a square PNG for best results.'); return }
    setLogoUploading(true)
    try{
      const dataUrl = await new Promise((res, rej)=>{
        const r = new FileReader()
        r.onload = ()=> res(r.result)
        r.onerror = rej
        r.readAsDataURL(file)
      })
      setForm(f=> ({ ...f, logoUrl: dataUrl, logoName: file.name }))
    }catch{ setErr('Could not read logo file') }
    setLogoUploading(false)
    e.target.value = ''
  }
  const removeLogo = ()=> setForm(f=> ({ ...f, logoUrl: null, logoName: null }))

  const handleDelete = async()=>{
    if(!confirm('Delete your account and ALL data? This cannot be undone.')) return
    if(!confirm('Second confirmation — permanently delete everything?')) return
    setDeleting(true); setErr(''); setInfo('')
    const { error, warning } = await deleteAccount()
    setDeleting(false)
    if(error){ setErr(error.message); return }
    if(warning) alert(warning)
    navigate('/')
  }

  const handleLogout = async()=>{
    await signOut()
    navigate('/login')
  }

  const updatePay = (key, val)=> setForm(f=> ({ ...f, paymentInstructions: { ...f.paymentInstructions, [key]: val } }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-bold font-display tracking-tight">Settings</h1><p className="text-sm text-slate-500">Profile, invoice defaults & premium branding — your PDF matches your studio.</p></div>

      <Card className="p-5 md:p-6">
        <form onSubmit={submit} className="space-y-6">
          {/* Profile */}
          <div>
            <h3 className="font-display font-semibold text-sm">Profile</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div><Label htmlFor="settings-name">Your name</Label><Input id="settings-name" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Alex Freelancer" /></div>
              <div><Label htmlFor="settings-business">Business name (shown on invoices)</Label><Input id="settings-business" value={form.business_name||''} onChange={e=>setForm({...form,business_name:e.target.value})} placeholder="Alex Studio LLC" /></div>
            </div>
            <div className="mt-4"><Label htmlFor="settings-currency">Currency symbol</Label>
              <Select id="settings-currency" value={form.currency||'$'} onChange={e=>setForm({...form,currency:e.target.value})}>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
                <option value="₹">₹ INR</option>
                <option value="¥">¥ JPY</option>
                <option value="A$">A$ AUD</option>
                <option value="C$">C$ CAD</option>
              </Select>
              <p className="text-xs text-slate-400 mt-1">Single symbol for now — no conversions.</p>
            </div>
          </div>

          {/* Premium Branding */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-display font-semibold text-sm">Branding — logo & color</h3>
            <p className="text-xs text-slate-500 mt-1">Your logo and primary color flow into every PDF. Recommended: square PNG, transparent, 800×800px.</p>
            <div className="grid md:grid-cols-2 gap-5 mt-4">
              <div>
                <Label>Logo upload</Label>
                <div className="mt-1.5 border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {form.logoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={form.logoUrl} alt="logo preview" className="w-14 h-14 rounded-xl object-contain bg-white border border-gray-200 p-1.5 shadow-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{form.logoName || 'Logo.png'}</div>
                        <div className="text-[11px] text-slate-500">Appears top-left of invoice</div>
                      </div>
                      <button type="button" onClick={removeLogo} className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-white">Remove</button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 grid place-items-center mx-auto text-slate-400">◈</div>
                      <p className="text-xs text-slate-500 mt-2">No logo yet — PDF will show your business name</p>
                    </div>
                  )}
                  <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition">
                    <input type="file" accept="image/*" onChange={handleLogo} className="hidden" disabled={logoUploading} />
                    {logoUploading ? 'Uploading…' : form.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </label>
                  <span className="text-[11px] text-slate-400 ml-2">PNG/JPG/WebP · max 2MB</span>
                </div>
              </div>
              <div>
                <Label htmlFor="settings-color">Primary color</Label>
                <div className="mt-1.5 flex gap-2">
                  <input id="settings-color" type="color" value={form.primaryColor || '#0f766e'} onChange={e=>setForm({...form, primaryColor: e.target.value})} className="w-14 h-[42px] rounded-xl border border-gray-200 p-1 bg-white cursor-pointer" />
                  <Input value={form.primaryColor || '#0f766e'} onChange={e=>setForm({...form, primaryColor: e.target.value})} placeholder="#0f766e" className="flex-1 font-mono text-sm" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Used for header, table accents & Total Due. Try your studio’s brand.</p>
                <div className="mt-2 flex gap-1.5">
                  {['#0f766e','#1e293b','#7c3aed','#be123c','#0ea5e9','#ea580c'].map(c=>(
                    <button key={c} type="button" onClick={()=> setForm({...form, primaryColor: c})} className={`w-7 h-7 rounded-full border-2 transition ${form.primaryColor===c?'border-slate-900 scale-110 shadow':'border-white shadow-sm'}`} style={{background:c}} title={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Theme picker */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-display font-semibold text-sm">Invoice theme</h3>
            <p className="text-xs text-slate-500 mt-1">Pick how your PDF feels — minimal, corporate, or studio. Changes apply to the next PDF you download.</p>
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              {themes.map(t=>{
                const active = form.invoiceTheme === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={()=> setForm({...form, invoiceTheme: t.value})}
                    className={`text-left rounded-2xl border p-3 bg-white transition hover:shadow-md ${active ? 'border-teal-700 ring-2 ring-teal-700/15 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="h-20 rounded-xl overflow-hidden border border-gray-100 bg-white relative">
                      {t.value==='modern-minimal' && (
                        <div className="p-2">
                          <div className="h-1.5 w-16 bg-teal-700 rounded-full" style={{background: form.primaryColor}} />
                          <div className="h-2 w-20 bg-slate-900 rounded mt-2" />
                          <div className="h-1 w-24 bg-slate-200 rounded mt-1" />
                          <div className="mt-3 h-6 bg-slate-50 border border-slate-100 rounded-lg" />
                          <div className="mt-1 h-3 bg-slate-900 rounded-full w-16 ml-auto" />
                        </div>
                      )}
                      {t.value==='bold-corporate' && (
                        <div>
                          <div className="h-7 flex items-center px-2" style={{background: form.primaryColor}}><div className="h-1.5 w-12 bg-white/90 rounded-full" /><div className="ml-auto h-3 w-10 bg-white rounded" /></div>
                          <div className="p-2 space-y-1">
                            <div className="h-2 w-16 bg-slate-900 rounded" />
                            <div className="h-4 bg-slate-900 rounded-lg flex items-center px-1" style={{background: form.primaryColor}}><div className="h-1 w-full bg-white/70 rounded" /></div>
                          </div>
                        </div>
                      )}
                      {t.value==='creative-studio' && (
                        <div className="p-2">
                          <div className="flex gap-1">
                            <div className="w-1 h-8 rounded-full" style={{background: form.primaryColor}} />
                            <div className="flex-1">
                              <div className="h-2 w-14 rounded" style={{background: form.primaryColor}} />
                              <div className="h-1 w-10 bg-slate-200 rounded mt-1" />
                            </div>
                            <div className="h-6 w-10 rounded-lg border" style={{borderColor: form.primaryColor, background: form.primaryColor+'18'}} />
                          </div>
                          <div className="mt-2 h-5 bg-slate-50 rounded-lg border flex"><div className="flex-1 m-0.5 rounded" style={{background: form.primaryColor+'22'}} /></div>
                        </div>
                      )}
                      {active && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-teal-700 text-white grid place-items-center text-[10px]">✓</div>}
                    </div>
                    <div className="font-semibold text-xs mt-2">{t.label}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-display font-semibold text-sm">Payment instructions</h3>
            <p className="text-xs text-slate-500 mt-1">Shown at the bottom of every invoice PDF so clients know exactly how to pay. Leave blank to hide.</p>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div><Label htmlFor="pay-holder">Account holder</Label><Input id="pay-holder" value={form.paymentInstructions?.accountHolder||''} onChange={e=> updatePay('accountHolder', e.target.value)} placeholder="Alex Rivera" /></div>
              <div><Label htmlFor="pay-bank">Bank name</Label><Input id="pay-bank" value={form.paymentInstructions?.bankName||''} onChange={e=> updatePay('bankName', e.target.value)} placeholder="HDFC Bank" /></div>
              <div><Label htmlFor="pay-ac">Account number</Label><Input id="pay-ac" value={form.paymentInstructions?.accountNumber||''} onChange={e=> updatePay('accountNumber', e.target.value)} placeholder="50200012345678" /></div>
              <div><Label htmlFor="pay-ifsc">IFSC / SWIFT</Label><Input id="pay-ifsc" value={form.paymentInstructions?.ifsc||''} onChange={e=> updatePay('ifsc', e.target.value)} placeholder="HDFC0001234" /></div>
              <div><Label htmlFor="pay-upi">UPI ID</Label><Input id="pay-upi" value={form.paymentInstructions?.upiId||''} onChange={e=> updatePay('upiId', e.target.value)} placeholder="alex@okhdfcbank" /></div>
              <div><Label htmlFor="pay-paypal">PayPal link</Label><Input id="pay-paypal" value={form.paymentInstructions?.paypalLink||''} onChange={e=> updatePay('paypalLink', e.target.value)} placeholder="https://paypal.me/alexstudio" /></div>
              <div className="md:col-span-2"><Label htmlFor="pay-custom">Custom instructions (optional)</Label><Input id="pay-custom" value={form.paymentInstructions?.custom||''} onChange={e=> updatePay('custom', e.target.value)} placeholder="Net 14 · UPI preferred · Mention invoice number in note" /></div>
            </div>
          </div>

          {/* Terms */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-sm">Terms & Conditions</h3>
                <p className="text-xs text-slate-500">Toggle to include at the bottom of the PDF.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!!form.termsEnabled} onChange={e=> setForm({...form, termsEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
              </label>
            </div>
            {form.termsEnabled && (
              <div className="mt-3">
                <Label htmlFor="terms-text">Terms text</Label>
                <textarea id="terms-text" value={form.termsText||''} onChange={e=> setForm({...form, termsText: e.target.value})} rows={3} placeholder="Payment due within 14 days. Late payments may incur 1.5% monthly fee. ..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-teal-700/10 focus:border-teal-700 bg-white" />
                <p className="text-[11px] text-slate-400 mt-1">Keep it short — 2–3 lines is ideal for a premium layout.</p>
              </div>
            )}
          </div>

          {/* Invoice defaults (kept) */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-display font-semibold text-sm">Invoice defaults</h3>
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <div><Label htmlFor="settings-tax-type">Default tax type</Label>
                <Select id="settings-tax-type" value={form.default_tax_type || 'none'} onChange={e=>setForm({...form, default_tax_type: e.target.value})}>
                  <option value="none">No tax</option>
                  <option value="gst">GST</option>
                  <option value="vat">VAT</option>
                  <option value="custom">Custom</option>
                  <option value="exempt">Tax exempt</option>
                </Select>
              </div>
              <div><Label htmlFor="settings-tax">Default rate (%)</Label><Input id="settings-tax" type="number" min="0" max="100" step="0.01" value={form.default_tax_rate ?? 0} onChange={e=>setForm({...form, default_tax_rate: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="0" disabled={form.default_tax_type==='none'||form.default_tax_type==='exempt'} /></div>
              <div><Label htmlFor="settings-rev">Default revisions included</Label><Input id="settings-rev" type="number" min="0" max="100" step="1" value={form.default_revisions_included ?? 2} onChange={e=> setForm({...form, default_revisions_included: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="2" /></div>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Revisions & tax are snapshotted per invoice — changing defaults never affects old invoices or reports.</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
            <div className="font-semibold mb-1">Account</div>
            <div className="text-slate-600">Email: <span className="font-medium text-slate-900">{user?.email || '—'}</span></div>
            <div className="text-emerald-700 mt-1">✓ Data is private and secured to your account.</div>
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{err}</div>}
          {info && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</div>}
          <div className="flex gap-2">
            <Button type="submit">{saved?'✓ Saved':'Save settings'}</Button>
            <Button type="button" variant="ghost" onClick={handleLogout}>Logout</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5 border-red-200">
        <h3 className="font-semibold text-red-700">Danger zone</h3>
        <p className="text-sm text-slate-600 mt-1">Delete your account and all associated data (clients, income, expenses, invoices, receipts). This is permanent.</p>
        <Button onClick={handleDelete} disabled={deleting} className="mt-3 bg-red-600 hover:bg-red-700 text-white">{deleting?'Deleting…':'Delete my account and all my data'}</Button>
      </Card>
    </div>
  )
}
