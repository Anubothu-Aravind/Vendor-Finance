import React, { useState, useEffect } from 'react'
import { Save, RotateCcw, Eye, Layers, Type, FileText, Grid } from 'lucide-react'
import api from '../../utils/api'
import { useToast } from '../../hooks/useToast'

const DEFAULTS = {
  accentColor: '#0F172A',
  borderColor: '#000000',
  headerBackground: '#F8FAFC',
  tableHeaderBackground: '#F1F5F9',
  fontSize: 'medium',
  fontFamily: 'Inter, sans-serif',
  borderStyle: 'minimal',
  showQRCode: true,
  showGSTTable: false,
  showHSNColumn: false,
  showQuantityColumn: false,
  swapRecipientSupplier: false,
  showSignatory: true,
  showBankDetails: true,
  signatoryText: 'Authorised Signatory',
  declarationText: 'We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.'
}

const TITLE_PALETTE = [
  { name: 'Ink Black',  hex: '#000000' },
  { name: 'Slate Dark', hex: '#0F172A' },
  { name: 'Charcoal',   hex: '#374151' },
  { name: 'Graphite',   hex: '#6B7280' },
  { name: 'Steel Grey', hex: '#94A3B8' },
  { name: 'Off White',  hex: '#F1F5F9' },
  { name: 'Indigo',     hex: '#4F46E5' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Crimson',    hex: '#DC2626' },
  { name: 'Emerald',    hex: '#059669' },
  { name: 'Amber',      hex: '#D97706' },
  { name: 'Violet',     hex: '#7C3AED' },
]

const FONTS = [
  { label: 'Default (Inter)',  value: 'Inter, sans-serif' },
  { label: 'Formal (Georgia)', value: 'Georgia, serif' },
  { label: 'Compact (Mono)',   value: '"Courier New", Courier, monospace' },
]

const BORDER_STYLES = [
  { label: 'Minimal',    value: 'minimal'    },
  { label: 'Boxed',      value: 'boxed'      },
  { label: 'Borderless', value: 'borderless' },
]

const FONT_SIZES = {
  small:  'text-[10px] leading-tight',
  medium: 'text-xs leading-normal',
  large:  'text-sm leading-relaxed',
}

const SAMPLE = {
  title:            'TAX INVOICE',
  ackNo:            '202608-BILL-001',
  ackDate:          '05/AUG/2026',
  supplierName:     'Vastrams Corporate Ltd',
  supplierAddress:  '123 Main Textile Hub, Surat, Gujarat - 395002',
  supplierGstin:    '24AAAAA0000A1Z0',
  recipientName:    'Infosys Limited',
  recipientAddress: 'Plot No. 44, Electronic City, Hosur Road, Bengaluru - 560100',
  recipientGstin:   '29AAACI4168R1ZP',
  totalAmount:      180000,
  taxableValue:     152542.37,
  cgstAmount:       13728.81,
  sgstAmount:       13728.81,
}

const fmt = (v) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

function getBorders(template) {
  switch (template.borderStyle) {
    case 'boxed':      return { outer: `2px double ${template.borderColor}`, cell: `1px solid ${template.borderColor}` }
    case 'borderless': return { outer: 'none', cell: 'none' }
    default:           return { outer: `1px solid ${template.borderColor}`, cell: `1px solid ${template.borderColor}` }
  }
}

function SectionHead({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b mb-3"
         style={{ borderColor: 'var(--color-border)' }}>
      <Icon size={14} style={{ color: 'var(--color-text-muted)' }} />
      <span className="text-xs font-semibold tracking-wide uppercase"
            style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}

function Card({ children }) {
  return (
    <div className="p-4 rounded-xl border"
         style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
      {children}
    </div>
  )
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border"
         style={{ borderColor: 'var(--color-border)' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 py-1.5 text-[11px] font-semibold transition-colors"
          style={{
            background: value === opt.value ? 'var(--color-bg-elevated)' : 'transparent',
            color:      value === opt.value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function InvoiceTemplateCustomizer() {
  const { showToast } = useToast()
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [template, setTemplate] = useState(DEFAULTS)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get('/settings/invoice-template')
        if (res?.data) {
          const d = res.data
          setTemplate({
            accentColor:           d.accentColor            ?? DEFAULTS.accentColor,
            borderColor:           d.borderColor            ?? DEFAULTS.borderColor,
            headerBackground:      d.headerBackground       ?? DEFAULTS.headerBackground,
            tableHeaderBackground: d.tableHeaderBackground  ?? DEFAULTS.tableHeaderBackground,
            fontSize:              d.fontSize               ?? DEFAULTS.fontSize,
            fontFamily:            d.fontFamily             ?? DEFAULTS.fontFamily,
            borderStyle:           d.borderStyle            ?? DEFAULTS.borderStyle,
            showQRCode:            d.showQRCode             ?? DEFAULTS.showQRCode,
            showGSTTable:          d.showGSTTable           ?? DEFAULTS.showGSTTable,
            showHSNColumn:         d.showHSNColumn          ?? DEFAULTS.showHSNColumn,
            showQuantityColumn:    d.showQuantityColumn      ?? DEFAULTS.showQuantityColumn,
            swapRecipientSupplier: d.swapRecipientSupplier   ?? DEFAULTS.swapRecipientSupplier,
            showSignatory:         d.showSignatory          ?? DEFAULTS.showSignatory,
            showBankDetails:       d.showBankDetails        ?? DEFAULTS.showBankDetails,
            signatoryText:         d.signatoryText          ?? DEFAULTS.signatoryText,
            declarationText:       d.declarationText        ?? DEFAULTS.declarationText,
          })
        }
      } catch {
        showToast('Failed to load invoice template preferences', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put('/settings/invoice-template', template)
      showToast('Invoice template synced across all devices!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to save template preferences', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTemplate(DEFAULTS)
    showToast('Template reset to defaults - click Save to apply.', 'info')
  }

  const set = (key, val) => setTemplate(prev => ({ ...prev, [key]: val }))
  const toggleProp = (key) => (e) => set(key, e.target.checked)
  const borders = getBorders(template)
  const softCopyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/print?type=bill&id=demo`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(softCopyUrl)}`

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16" style={{ color: 'var(--color-text-muted)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Top header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b"
           style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Master Invoice Template Editor
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Customize layout, typography, and section visibility. Edits sync automatically across all devices.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-secondary)', background: 'transparent' }}
          >
            <RotateCcw size={13} />
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)', background: 'var(--color-bg-elevated)' }}
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save & Sync Template'}
          </button>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT CONTROLS */}
        <div className="lg:col-span-5 space-y-4">

          {/* 1. Document Title Color */}
          <Card>
            <SectionHead icon={Grid} label="Document Title Color" />
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={template.accentColor}
                onChange={e => set('accentColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <span className="font-mono text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                {template.accentColor}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {TITLE_PALETTE.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => set('accentColor', c.hex)}
                  className="w-full aspect-square rounded-md transition-all hover:scale-110"
                  style={{
                    background:  c.hex,
                    border: template.accentColor === c.hex
                      ? '3px solid var(--color-text-primary)'
                      : '2px solid var(--color-border)',
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Hover a swatch for its name. Click to select.
            </p>
          </Card>

          {/* 2. Typography */}
          <Card>
            <SectionHead icon={Type} label="Typography" />
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Font Family
                </label>
                <select
                  value={template.fontFamily}
                  onChange={e => set('fontFamily', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border appearance-none"
                  style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {FONTS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Font Size
                </label>
                <ToggleGroup
                  options={[{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }]}
                  value={template.fontSize}
                  onChange={v => set('fontSize', v)}
                />
              </div>
            </div>
          </Card>

          {/* 3. Border Style */}
          <Card>
            <SectionHead icon={Layers} label="Border Style" />
            <ToggleGroup options={BORDER_STYLES} value={template.borderStyle} onChange={v => set('borderStyle', v)} />
          </Card>

          {/* 4. Section Visibility */}
          <Card>
            <SectionHead icon={Eye} label="Section and Column Visibility" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                { key: 'showQRCode',            label: 'Show e-Invoice QR Code' },
                { key: 'showGSTTable',          label: 'Show GST Tax Breakdown Table' },
                { key: 'showHSNColumn',         label: 'Show HSN/SAC Column' },
                { key: 'showQuantityColumn',     label: 'Show Quantity Column' },
                { key: 'swapRecipientSupplier', label: 'Swap Recipient / Supplier' },
                { key: 'showSignatory',          label: 'Show Authorised Signatory' },
                { key: 'showBankDetails',        label: 'Show Bank Details Box' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={template[key]} onChange={toggleProp(key)} className="rounded" />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* 5. Declaration & Signatory */}
          <Card>
            <SectionHead icon={FileText} label="Legal Declaration and Signatory" />
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Authorised Signatory Role
                </label>
                <input
                  type="text"
                  value={template.signatoryText}
                  onChange={e => set('signatoryText', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border"
                  style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Legal Declaration Statement
                </label>
                <textarea
                  rows={3}
                  value={template.declarationText}
                  onChange={e => set('declarationText', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border resize-none"
                  style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT - Live A4 Preview */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border sticky top-6"
             style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
               style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Live A4 Master Preview
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              Updates instantly
            </span>
          </div>
          <div className="overflow-y-auto p-4 flex justify-center" style={{ maxHeight: '75vh' }}>
            <div
              className={`w-full bg-white text-slate-900 shadow-xl ${FONT_SIZES[template.fontSize]}`}
              style={{
                fontFamily:   template.fontFamily,
                border:       borders.outer,
                borderRadius: template.borderStyle === 'borderless' ? '0' : '6px',
              }}
            >
              {/* Header */}
              <div className="p-4 flex justify-between items-start"
                   style={{ background: template.headerBackground, borderBottom: borders.cell }}>
                <div>
                  <h1 className="text-xl font-extrabold uppercase tracking-wider"
                      style={{ color: template.accentColor }}>
                    {SAMPLE.title}
                  </h1>
                  <div className="mt-1.5 font-mono space-y-0.5" style={{ fontSize: '10px', color: '#374151' }}>
                    <p>Ack No: <span className="font-semibold">{SAMPLE.ackNo}</span></p>
                    <p>Ack Date: <span className="font-semibold">{SAMPLE.ackDate}</span></p>
                  </div>
                </div>
                {template.showQRCode && (
                  <div className="flex flex-col items-end">
                    <span className="font-bold tracking-widest uppercase mb-1" style={{ fontSize: '9px', color: '#6B7280' }}>
                      e-Invoice
                    </span>
                    <img src={qrUrl} alt="QR" className="w-16 h-16 bg-white p-0.5" style={{ border: borders.cell }} />
                  </div>
                )}
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2" style={{ borderBottom: borders.cell }}>
                {template.swapRecipientSupplier ? (
                  <>
                    <div className="p-3 space-y-0.5" style={{ borderRight: borders.cell }}>
                      <p className="font-bold uppercase text-slate-400" style={{ fontSize: '9px' }}>Supplier (From)</p>
                      <p className="font-bold text-slate-900">{SAMPLE.supplierName}</p>
                      <p className="text-slate-600">{SAMPLE.supplierAddress}</p>
                      <p className="font-mono text-slate-700" style={{ fontSize: '10px' }}>GSTIN: {SAMPLE.supplierGstin}</p>
                    </div>
                    <div className="p-3 space-y-0.5">
                      <p className="font-bold uppercase text-slate-400" style={{ fontSize: '9px' }}>Recipient (Bill To)</p>
                      <p className="font-bold text-slate-900">{SAMPLE.recipientName}</p>
                      <p className="text-slate-600">{SAMPLE.recipientAddress}</p>
                      <p className="font-mono text-slate-700" style={{ fontSize: '10px' }}>GSTIN: {SAMPLE.recipientGstin}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 space-y-0.5" style={{ borderRight: borders.cell }}>
                      <p className="font-bold uppercase text-slate-400" style={{ fontSize: '9px' }}>Recipient (Bill To)</p>
                      <p className="font-bold text-slate-900">{SAMPLE.recipientName}</p>
                      <p className="text-slate-600">{SAMPLE.recipientAddress}</p>
                      <p className="font-mono text-slate-700" style={{ fontSize: '10px' }}>GSTIN: {SAMPLE.recipientGstin}</p>
                    </div>
                    <div className="p-3 space-y-0.5">
                      <p className="font-bold uppercase text-slate-400" style={{ fontSize: '9px' }}>Supplier (From)</p>
                      <p className="font-bold text-slate-900">{SAMPLE.supplierName}</p>
                      <p className="text-slate-600">{SAMPLE.supplierAddress}</p>
                      <p className="font-mono text-slate-700" style={{ fontSize: '10px' }}>GSTIN: {SAMPLE.supplierGstin}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Line Items */}
              <table className="w-full" style={{ borderBottom: borders.cell }}>
                <thead>
                  <tr style={{ borderBottom: borders.cell, background: template.tableHeaderBackground }}>
                    <th className="p-2 font-bold text-center" style={{ borderRight: borders.cell }}>SI No.</th>
                    <th className="p-2 font-bold text-left" style={{ borderRight: borders.cell }}>Description</th>
                    {template.showHSNColumn     && <th className="p-2 font-bold text-center" style={{ borderRight: borders.cell }}>HSN/SAC</th>}
                    {template.showQuantityColumn && <th className="p-2 font-bold text-center" style={{ borderRight: borders.cell }}>Qty</th>}
                    <th className="p-2 font-bold text-right" style={{ borderRight: borders.cell }}>Rate</th>
                    <th className="p-2 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: borders.cell }}>
                    <td className="p-2 text-center" style={{ borderRight: borders.cell }}>1</td>
                    <td className="p-2 font-medium" style={{ borderRight: borders.cell }}>Purchase Bill Settlement & Services</td>
                    {template.showHSNColumn     && <td className="p-2 text-center font-mono" style={{ borderRight: borders.cell }}>9983</td>}
                    {template.showQuantityColumn && <td className="p-2 text-center" style={{ borderRight: borders.cell }}>1 No</td>}
                    <td className="p-2 text-right tabular-nums" style={{ borderRight: borders.cell }}>Rs.{fmt(SAMPLE.taxableValue)}</td>
                    <td className="p-2 text-right tabular-nums font-semibold">Rs.{fmt(SAMPLE.taxableValue)}</td>
                  </tr>
                  <tr style={{ background: template.tableHeaderBackground }}>
                    <td className="p-2 font-bold text-center"
                        colSpan={2 + (template.showHSNColumn ? 1 : 0) + (template.showQuantityColumn ? 1 : 0)}
                        style={{ borderRight: borders.cell }}>
                      Total Amount
                    </td>
                    <td className="p-2" style={{ borderRight: borders.cell }} />
                    <td className="p-2 text-right tabular-nums font-bold" style={{ color: template.accentColor }}>
                      Rs.{fmt(SAMPLE.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* GST Table */}
              {template.showGSTTable && (
                <table className="w-full text-center" style={{ borderBottom: borders.cell, fontSize: '10px' }}>
                  <thead>
                    <tr style={{ background: template.tableHeaderBackground, borderBottom: borders.cell }}>
                      {['HSN', 'Taxable Val', 'CGST', 'SGST', 'Total Tax'].map((h, i, a) => (
                        <th key={h} className="p-1.5 font-bold" style={{ borderRight: i < a.length - 1 ? borders.cell : 'none' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1.5 font-mono" style={{ borderRight: borders.cell }}>9983</td>
                      <td className="p-1.5 text-right" style={{ borderRight: borders.cell }}>Rs.{fmt(SAMPLE.taxableValue)}</td>
                      <td className="p-1.5 text-right" style={{ borderRight: borders.cell }}>Rs.{fmt(SAMPLE.cgstAmount)}</td>
                      <td className="p-1.5 text-right" style={{ borderRight: borders.cell }}>Rs.{fmt(SAMPLE.sgstAmount)}</td>
                      <td className="p-1.5 text-right font-bold">Rs.{fmt(SAMPLE.cgstAmount + SAMPLE.sgstAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Bank Details */}
              {template.showBankDetails && (
                <div className="p-3 flex justify-between items-center"
                     style={{ borderBottom: borders.cell, background: template.headerBackground, fontSize: '10px', color: '#374151' }}>
                  <div>
                    <p className="font-bold uppercase text-slate-400 mb-0.5" style={{ fontSize: '8px' }}>Bank Details for Transfer</p>
                    <p className="font-semibold">HDFC Bank - A/C: 50200012345678 - IFSC: HDFC0001234</p>
                  </div>
                  <span className="font-mono font-bold text-slate-400" style={{ fontSize: '9px' }}>SURAT BRANCH</span>
                </div>
              )}

              {/* Declaration & Signatory */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 p-3" style={{ borderRight: borders.cell, fontSize: '10px', color: '#374151' }}>
                  <p className="font-bold uppercase text-slate-400 mb-1" style={{ fontSize: '8px' }}>Declaration</p>
                  <p className="italic">{template.declarationText}</p>
                </div>
                {template.showSignatory && (
                  <div className="col-span-4 p-3 flex flex-col justify-between text-center"
                       style={{ fontSize: '10px', color: '#374151' }}>
                    <p className="font-bold text-slate-500" style={{ fontSize: '9px' }}>For Vastrams Ltd</p>
                    <p className="font-semibold text-slate-900 border-t pt-1 mt-4"
                       style={{ borderColor: template.borderStyle === 'borderless' ? '#E5E7EB' : template.borderColor }}>
                      {template.signatoryText}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default InvoiceTemplateCustomizer