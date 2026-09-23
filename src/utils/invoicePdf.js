import jsPDF from 'jspdf'
import { taxLabel } from './helpers'
import { amountPaid, amountOutstanding, invoiceStatus } from './payments'

// Premium Agency Invoice PDF — themes, branding, payment instructions, terms
// Themes: modern-minimal | bold-corporate | creative-studio

const THEMES = {
  'modern-minimal': {
    label: 'Modern Minimal',
    desc: 'Clean, airy, editorial',
    header: 'minimal',
    tableHeadFill: [248, 250, 252],
    tableHeadText: [100, 116, 139],
    accent: 'primary',
    totalStyle: 'minimal',
  },
  'bold-corporate': {
    label: 'Bold Corporate',
    desc: 'Strong header, boardroom-ready',
    header: 'block',
    tableHeadFill: null, // will use primary
    tableHeadText: [255,255,255],
    accent: 'primary',
    totalStyle: 'block',
  },
  'creative-studio': {
    label: 'Creative Studio',
    desc: 'Playful, color-forward for studios',
    header: 'accent-bar',
    tableHeadFill: null, // tinted primary
    tableHeadText: [15,118,110],
    accent: 'primary',
    totalStyle: 'card',
  },
}

export const INVOICE_THEMES = THEMES

function hexToRgb(hex, fallback = [15,118,110]){
  if (!hex || typeof hex !== 'string') return fallback
  let h = hex.trim().replace('#','')
  if (h.length === 3) h = h.split('').map(c=>c+c).join('')
  if (h.length !== 6) return fallback
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  if ([r,g,b].some(n=> Number.isNaN(n))) return fallback
  return [r,g,b]
}

function tint(rgb, factor=0.12){
  // mix with white
  return rgb.map(c=> Math.round(c + (255 - c) * factor))
}



function addLogo(doc, logoUrl, x, y, maxW=28, maxH=16){
  if (!logoUrl) return { w:0, h:0, success:false }
  try{
    // logoUrl is data URL (png/jpeg/svg->png) or https — jsPDF supports base64 png/jpeg
    // Detect type
    let type = 'PNG'
    if (logoUrl.startsWith('data:image/jpeg') || logoUrl.includes('jpeg')) type='JPEG'
    else if (logoUrl.startsWith('data:image/png')) type='PNG'
    // Add image; if fails, skip
    // Auto-size: keep aspect, max 28x16mm
    // We add at x,y
    // Try to infer dimensions — use max
    doc.addImage(logoUrl, type, x, y, maxW, maxH, undefined, 'FAST')
    return { w:maxW, h:maxH, success:true }
  }catch(e){
    console.warn('Logo addImage failed', e)
    return { w:0,h:0, success:false }
  }
}

export function generateInvoicePdf({ invoice, settings = {}, client = null, statusOverride }){
  const doc = new jsPDF({ unit:'mm', format:'a4', compress:true })
  const pageW = 210
  const margin = 14
  const contentW = pageW - margin*2
  const currency = settings.currency || '$'
  const business = settings.business_name || settings.name || 'ClearBooks'
  const themeKey = settings.invoiceTheme || 'modern-minimal'
  const theme = THEMES[themeKey] || THEMES['modern-minimal']
  const primary = hexToRgb(settings.primaryColor || '#0f766e')
  const primaryTint = tint(primary, 0.90) // very light for backgrounds
  const st = statusOverride || invoiceStatus(invoice)
  const paid = amountPaid(invoice)
  const bal = amountOutstanding(invoice)
  const rate = Number(invoice.tax_rate ?? 0)
  const ttype = invoice.tax_type || (rate > 0 ? 'custom' : 'none')
  const grand = Number(invoice.total_amount || 0)
  const sub = Number(invoice.subtotal ?? (rate ? grand / (1 + rate/100) : grand))
  const tax = Number(invoice.tax_amount ?? (sub * rate / 100))
  const logoUrl = settings.logoUrl || null

  // Fonts: Helvetica is built-in, use bold/normal + sizes for hierarchy
  // Generous whitespace: 8-14mm sections, line spacing

  let y = 14

  // === HEADER per theme ===
  if (theme.header === 'block'){
    // Bold Corporate — solid primary block across top
    doc.setFillColor(...primary)
    doc.rect(0,0,pageW,36,'F')
    // Business left white
    doc.setTextColor(255,255,255)
    doc.setFont('helvetica','bold'); doc.setFontSize(13)
    // Logo if exists — white bg for contrast on dark
    let bx = margin
    if (logoUrl){
      doc.setFillColor(255,255,255)
      doc.roundedRect(margin, 10, 28, 16, 2, 2, 'F')
      addLogo(doc, logoUrl, margin+2, 12, 24, 12)
      bx = margin + 32
    }
    doc.text(business, bx, 18)
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
    doc.setTextColor(255,255,255)
    doc.setFontSize(7); doc.text('Invoice', bx, 23)
    // Invoice number right — large
    doc.setFont('helvetica','bold'); doc.setFontSize(18)
    doc.text(String(invoice.invoice_number), pageW - margin, 18, { align:'right' })
    doc.setFont('helvetica','normal'); doc.setFontSize(7)
    doc.text(`Issue  ${invoice.issue_date}  •  Due  ${invoice.due_date}  •  ${st}`, pageW - margin, 23, { align:'right' })
    if (invoice.payment_date) { doc.setFontSize(6.5); doc.text(`Paid ${invoice.payment_date}`, pageW - margin, 27, { align:'right' }) }
    doc.setTextColor(0,0,0)
    y = 44
  } else if (theme.header === 'accent-bar'){
    // Creative Studio — left vertical accent + logo bubble
    doc.setFillColor(...primary)
    doc.rect(0,0,4,42,'F')
    // Logo
    let titleX = margin + 4
    if (logoUrl){
      doc.setFillColor(...primaryTint)
      doc.roundedRect(margin+6, 10, 18, 18, 3, 3, 'F')
      addLogo(doc, logoUrl, margin+7, 11, 16, 16)
      titleX = margin + 28
    }
    doc.setFont('helvetica','bold'); doc.setFontSize(14)
    doc.setTextColor(primary[0], primary[1], primary[2])
    doc.text(business, titleX, 18)
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,116,139)
    doc.text('Freelance ledger • Post-production', titleX, 22.5)
    // Invoice badge right
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(15,23,42)
    doc.text(String(invoice.invoice_number), pageW - margin, 18, { align:'right' })
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,116,139)
    doc.text(`Issue ${invoice.issue_date}  —  Due ${invoice.due_date}`, pageW - margin, 23, { align:'right' })
    doc.setFontSize(7); doc.setTextColor(primary[0], primary[1], primary[2])
    doc.text(st, pageW - margin, 27, { align:'right' })
    // thin line under header
    doc.setDrawColor(...primary); doc.setLineWidth(0.35); doc.line(margin, 32, pageW - margin, 32)
    y = 38
  } else {
    // Modern Minimal — airy, thin rule
    if (logoUrl) addLogo(doc, logoUrl, margin, 11, 28, 14)
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(15,23,42)
    doc.text(business, logoUrl ? margin + 32 : margin, 16)
    doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(100,116,139)
    doc.text('Invoice', logoUrl ? margin + 32 : margin, 20.5)
    doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.setTextColor(15,23,42)
    doc.text(String(invoice.invoice_number), pageW - margin, 16, { align:'right' })
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,116,139)
    doc.text(`Issue: ${invoice.issue_date}`, pageW - margin, 21, { align:'right' })
    doc.text(`Due: ${invoice.due_date}`, pageW - margin, 25, { align:'right' })
    doc.setTextColor(primary[0], primary[1], primary[2]); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    doc.text(st, pageW - margin, 29, { align:'right' })
    if (invoice.payment_date){ doc.setTextColor(100,116,139); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.text(`Paid ${invoice.payment_date}`, pageW - margin, 32, {align:'right'}) }
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.25)
    doc.line(margin, 36, pageW - margin, 36)
    y = 42
  }

  // === Bill to ===
  doc.setTextColor(100,116,139); doc.setFont('helvetica','bold'); doc.setFontSize(6.5)
  doc.text('BILL TO', margin, y)
  y+=4
  doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(10)
  doc.text(String(invoice.client_name || '—'), margin, y)
  y+=4
  if (client){
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(71,85,105)
    let cY = y
    if (client.company) { doc.text(String(client.company), margin, cY); cY+=3.2 }
    if (client.email) { doc.text(String(client.email), margin, cY); cY+=3.2 }
    if (client.phone) { doc.text(String(client.phone), margin, cY); cY+=3.2 }
    if (client.billing_address) { doc.text(String(client.billing_address).slice(0,48), margin, cY); cY+=3.2 }
    if (client.gstin) { doc.setFont('helvetica','bold'); doc.text(`GSTIN: ${client.gstin}`, margin, cY); doc.setFont('helvetica','normal'); cY+=3.2 }
    y = Math.max(y+4, cY+1)
  } else {
    y+=2
  }

  // Meta right block (optional duplicate for minimal — keep compact)
  // Add business contact line under header already, so skip

  // === Line items table ===
  const tableTop = y + 2
  y = tableTop
  // Table header
  const col = { desc: margin, qty: 114, rate: 138, total: 168 }
  // Background per theme
  if (theme.header === 'block'){
    doc.setFillColor(...primary)
    doc.rect(margin, y-5, contentW, 8, 'F')
    doc.setTextColor(255,255,255)
  } else if (theme.header === 'accent-bar'){
    doc.setFillColor(...primaryTint)
    doc.rect(margin, y-5, contentW, 8, 'F')
    doc.setTextColor(primary[0], primary[1], primary[2])
  } else {
    doc.setFillColor(theme.tableHeadFill[0], theme.tableHeadFill[1], theme.tableHeadFill[2])
    doc.setTextColor(theme.tableHeadText[0], theme.tableHeadText[1], theme.tableHeadText[2])
  }
  doc.setFont('helvetica','bold'); doc.setFontSize(6.8)
  doc.text('DESCRIPTION', col.desc, y)
  doc.text('QTY', col.qty, y, { align:'center' })
  doc.text('RATE', col.rate, y, { align:'right' })
  doc.text('TOTAL', col.total+18, y, { align:'right' })
  doc.setTextColor(0,0,0)
  // underline
  doc.setDrawColor(theme.header==='block' ? primary[0] : 226, theme.header==='block' ? primary[1] : 232, theme.header==='block' ? primary[2] : 240)
  doc.setLineWidth(theme.header==='block' ? 0.4 : 0.2)
  doc.line(margin, y+1.5, pageW - margin, y+1.5)
  y+=6
  doc.setFont('helvetica','normal'); doc.setFontSize(8)
  let rowFill = false
  invoice.line_items?.forEach((l)=>{
    if (y > 258){ doc.addPage(); y = 20 }
    // zebra for minimal/creative
    if (theme.header !== 'block' && rowFill){
      doc.setFillColor(248,250,252)
      doc.rect(margin, y-3.5, contentW, 7, 'F')
    }
    rowFill = !rowFill
    doc.setTextColor(15,23,42)
    const desc = String(l.description||'').slice(0,52)
    doc.text(desc, col.desc, y)
    doc.setTextColor(100,116,139); doc.setFontSize(7.5)
    doc.text(String(l.quantity), col.qty, y, { align:'center' })
    doc.text(currency + Number(l.rate).toFixed(2), col.rate, y, { align:'right' })
    doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(currency + Number(l.total ?? (l.quantity*l.rate)).toFixed(2), col.total+18, y, { align:'right' })
    doc.setFont('helvetica','normal'); doc.setFontSize(8)
    y+=6
  })
  // table bottom rule
  y+=1
  doc.setDrawColor(226,232,240); doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y+=8

  // === Totals — hierarchy: Total Amount is hero ===
  // Right-aligned block, generous whitespace
  const totalsX = pageW - margin
  const labelX = 128
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(100,116,139)
  doc.text('Subtotal', labelX, y, { align:'left' })
  doc.setTextColor(15,23,42); doc.setFont('helvetica','normal'); doc.setFontSize(8)
  doc.text(currency + sub.toFixed(2), totalsX, y, { align:'right' })
  y+=5
  doc.setTextColor(100,116,139); doc.setFontSize(7.5)
  doc.text(taxLabel(ttype, rate), labelX, y, { align:'left' })
  doc.setTextColor(15,23,42); doc.setFontSize(8)
  doc.text(currency + tax.toFixed(2), totalsX, y, { align:'right' })
  y+=7
  // Total Amount hero — theme-aware
  if (theme.totalStyle === 'block'){
    doc.setFillColor(...primary)
    doc.roundedRect(labelX-4, y-5, totalsX - labelX + 4 + 4, 12, 2, 2, 'F')
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
    doc.text('TOTAL DUE', labelX, y, { align:'left' })
    doc.setFontSize(13)
    doc.text(currency + grand.toFixed(2), totalsX, y+0.5, { align:'right' })
    doc.setTextColor(0,0,0)
    y+=8
  } else if (theme.totalStyle === 'card'){
    doc.setFillColor(...primaryTint)
    doc.setDrawColor(...primary); doc.setLineWidth(0.3)
    doc.roundedRect(labelX-4, y-5, totalsX - labelX + 4 + 4, 12, 3, 3, 'FD')
    doc.setTextColor(primary[0], primary[1], primary[2]); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
    doc.text('TOTAL DUE', labelX, y, { align:'left' })
    doc.setFontSize(13); doc.setTextColor(15,23,42)
    doc.text(currency + grand.toFixed(2), totalsX, y+0.5, { align:'right' })
    doc.setTextColor(0,0,0)
    y+=8
  } else {
    // minimal — large type + top border, generous leading
    doc.setDrawColor(15,23,42); doc.setLineWidth(0.35)
    doc.line(labelX, y-3, totalsX, y-3)
    doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    doc.text('TOTAL DUE', labelX, y, { align:'left' })
    doc.setFontSize(14)
    doc.text(currency + grand.toFixed(2), totalsX, y+0.5, { align:'right' })
    y+=8
  }
  // Paid / Outstanding beneath total — sub-hierarchy
  if (paid > 0){
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(16,122, 80)
    doc.text('Paid', labelX, y, { align:'left' })
    doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(currency + paid.toFixed(2), totalsX, y, { align:'right' })
    y+=4.5
  }
  if (bal > 0 && paid > 0){
    doc.setTextColor(180,83,9); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
    doc.text('Amount still owed', labelX, y, { align:'left' })
    doc.setFontSize(8)
    doc.text(currency + bal.toFixed(2), totalsX, y, { align:'right' })
    doc.setTextColor(0,0,0)
    y+=4.5
  }
  y+=4

  // === Revision Guard — Project Milestone (contract term) ===
  {
    const revInc = Number(invoice.revisions_included ?? 2)
    const revUsed = Number(invoice.revisions_used ?? 0)
    if (y > 235){ doc.addPage(); y = 20 }
    // Milestone card — premium, not a note: primary accent bar + badge look
    doc.setFillColor(...primaryTint)
    doc.setDrawColor(...primary)
    doc.setLineWidth(0.28)
    doc.roundedRect(margin-1, y-1, contentW+2, 14, 2.5, 2.5, 'FD')
    // Left: milestone label
    doc.setFont('helvetica','bold'); doc.setFontSize(6.8); doc.setTextColor(primary[0], primary[1], primary[2])
    doc.text('PROJECT MILESTONE', margin+3, y+3.5)
    doc.setFont('helvetica','normal'); doc.setFontSize(6.2); doc.setTextColor(71,85,105)
    doc.text('— Revision Guard', margin+33, y+3.5)
    // Right: badge Revisions Included: X | Used: Y
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(15,23,42)
    const revText = `Revisions Included: ${revInc}  |  Used: ${revUsed}`
    doc.text(revText, pageW - margin -3, y+3.5, { align:'right' })
    // Footer of card: remaining / overage
    if (revUsed > revInc){
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(185,28,28)
      doc.text(`Over by ${revUsed - revInc} — extra revisions billable at agreed rate`, margin+3, y+9)
    } else {
      doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(100,116,139)
      const remaining = Math.max(0, revInc - revUsed)
      doc.text(`${remaining} free revision${remaining===1?'':'s'} remaining of ${revInc} included`, margin+3, y+9)
    }
    // Subtle contract line
    doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(148,163,184)
    doc.text('Contract term — revisions beyond included count are billed separately', pageW - margin -3, y+9, { align:'right' })
    y+=16
  }

  // === Payment Instructions — premium details ===
  const pay = settings.paymentInstructions || {}
  const hasPayment = !!(pay.bankName || pay.accountNumber || pay.ifsc || pay.accountHolder || pay.paypalLink || pay.upiId || pay.custom)
  if (hasPayment){
    if (y > 240){ doc.addPage(); y = 20 }
    const boxY = y
    // Title
    doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    doc.text('PAYMENT INSTRUCTIONS', margin, y)
    y+=4
    doc.setDrawColor(...primary); doc.setLineWidth(0.4)
    doc.line(margin, y-2, margin+18, y-2)
    y+=1
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(51,65,85)
    const lines = []
    if (pay.accountHolder) lines.push(`Account holder: ${pay.accountHolder}`)
    if (pay.bankName) lines.push(`Bank: ${pay.bankName}`)
    if (pay.accountNumber) lines.push(`A/c: ${pay.accountNumber}`)
    if (pay.ifsc) lines.push(`IFSC/SWIFT: ${pay.ifsc}`)
    if (pay.paypalLink) lines.push(`PayPal: ${pay.paypalLink}`)
    if (pay.upiId) lines.push(`UPI: ${pay.upiId}`)
    if (pay.custom) lines.push(pay.custom)
    // Wrap
    let py = y
    const maxW = contentW
    lines.forEach(line=>{
      const wrapped = doc.splitTextToSize(line, maxW)
      wrapped.forEach(w=>{
        if (py > 272){ doc.addPage(); py = 20 }
        doc.text(w, margin, py)
        py+=3.2
      })
    })
    y = py + 4
    // subtle box border
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.18)
    doc.roundedRect(margin-2, boxY-4, contentW+4, y - boxY + 2, 2, 2, 'S')
  }

  // === Terms & Conditions ===
  if (settings.termsEnabled && (settings.termsText || '').trim()){
    if (y > 245){ doc.addPage(); y = 20 }
    doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    doc.text('TERMS & CONDITIONS', margin, y)
    y+=4
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.2)
    doc.line(margin, y-2, margin+18, y-2)
    y+=1
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(100,116,139)
    const termLines = doc.splitTextToSize(String(settings.termsText).trim(), contentW)
    termLines.forEach(l=>{
      if (y > 280){ doc.addPage(); y = 20 }
      doc.text(l, margin, y)
      y+=3
    })
    y+=3
  }

  // === Footer — thank you + brand ===
  if (y > 275){ doc.addPage(); y = 20 }
  y+=2
  doc.setDrawColor(226,232,240); doc.setLineWidth(0.15)
  doc.line(margin, y, pageW - margin, y)
  y+=5
  doc.setFont('helvetica','normal'); doc.setFontSize(6.8); doc.setTextColor(100,116,139)
  doc.text('Thank you for your business!', margin, y)
  doc.setFont('helvetica','bold'); doc.setTextColor(primary[0], primary[1], primary[2])
  doc.text(business, pageW - margin, y, { align:'right' })
  y+=3.2
  doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(148,163,184)
  doc.text('Generated by ClearBooks — freelance ledger', margin, y)
  doc.text(`Theme: ${theme.label}  •  ${new Date().toISOString().slice(0,10)}`, pageW - margin, y, { align:'right' })

  return doc
}

export function downloadInvoicePdf({ invoice, settings, client }){
  const doc = generateInvoicePdf({ invoice, settings, client })
  doc.save(`${invoice.invoice_number}.pdf`)
  return doc
}

export function getInvoiceThemeOptions(){
  return Object.entries(THEMES).map(([value, cfg])=> ({ value, label: cfg.label, desc: cfg.desc }))
}
