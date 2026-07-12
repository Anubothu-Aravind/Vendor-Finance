import React, { useState, useEffect, useRef } from 'react'
import { 
  User, Store, Building2, Coins, CreditCard, Database, Palette, Info, 
  Search, Plus, Trash2, Edit2, X, Check, Upload, RefreshCw,
  Sun, Moon, Monitor, Leaf, Waves, Flame, Sparkles
} from 'lucide-react'
import api from '../utils/api'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Badge from '../components/ui/Badge'
import { usePreferences } from '../hooks/usePreferences'
import { toInputDate, fromInputDate } from '../utils/date'
import * as XLSX from 'xlsx'

// ── Appearance Tab (extracted to keep Settings component lean) ────────────────
function AppearanceTab({ preferences, setPreferences, applyGradient, accentGradients }) {
  const [gradientCategory, setGradientCategory] = useState('Nature')
  const [showCustom, setShowCustom] = useState(false)
  const [customA,    setCustomA]    = useState('#00C896')
  const [customB,    setCustomB]    = useState('#00A87E')
  const [customAngle, setCustomAngle] = useState(135)

  const categories = ['Nature', 'Ocean', 'Warm', 'Special']
  const visibleGradients = accentGradients.filter(g => g.cat === gradientCategory)
  const customGradient = `linear-gradient(${customAngle}deg, ${customA}, ${customB})`

  const themeOptions = [
    { value: 'light',  label: 'Light',  desc: 'Light backgrounds', Icon: Sun },
    { value: 'dark',   label: 'Dark',   desc: 'Dark canvas', Icon: Moon },
    { value: 'system', label: 'System', desc: 'Follows OS', Icon: Monitor },
  ]

  const categoryIcons = {
    Nature: Leaf,
    Ocean: Waves,
    Warm: Flame,
    Special: Sparkles,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Section 1: Application Theme ──────────────────────────────── */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          Application Theme
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Switch between light, dark, or follow the OS setting
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '400px' }}>
          {themeOptions.map(({ value, label, desc, Icon }) => {
            const isActive = preferences.theme === value
            return (
              <button
                key={value}
                onClick={() => setPreferences({ theme: value })}
                style={{
                  padding: '20px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isActive ? 'var(--color-primary-muted)' : 'var(--color-bg-elevated)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  position: 'relative',
                  gap: '8px',
                }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '16px', height: '16px',
                    background: 'var(--gradient-primary)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: '#fff',
                    fontWeight: 'bold',
                  }}>✓</span>
                )}
                <Icon size={22} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-display)' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* ── Section 2: Accent Gradient ────────────────────────────────── */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          Accent Gradient
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Choose a gradient preset — applied to buttons, sidebar, stat values, and page titles
        </p>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {categories.map(cat => {
            const isActive = gradientCategory === cat
            const CatIcon = categoryIcons[cat]
            return (
              <button
                key={cat}
                onClick={() => setGradientCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '99px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isActive ? 'var(--color-primary-muted)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
              >
                {CatIcon && <CatIcon size={14} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />}
                <span>{cat}</span>
              </button>
            )
          })}
        </div>

        {/* 4×4 pill grid (4 cols, 4 per category shown) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', maxWidth: '320px', marginBottom: '16px' }}>
          {visibleGradients.map(grad => {
            const isSelected = preferences.gradient === grad.value
            return (
              <button
                key={grad.name}
                title={grad.name}
                onClick={() => applyGradient(grad.value)}
                style={{
                  width: '68px', height: '36px',
                  borderRadius: '8px',
                  background: grad.value,
                  border: isSelected ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 120ms, box-shadow 120ms',
                  outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                  outlineOffset: '1px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    fontWeight: 700,
                  }}>✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Current gradient label */}
        {preferences.gradient && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '16px', borderRadius: '4px', background: preferences.gradient }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {accentGradients.find(g => g.value === preferences.gradient)?.name || 'Custom gradient'}
            </span>
          </div>
        )}

        {/* Custom gradient builder toggle */}
        <button
          onClick={() => setShowCustom(v => !v)}
          style={{
            padding: '6px 14px', fontSize: '12px', fontWeight: 500,
            border: '1px solid var(--color-border-strong)',
            borderRadius: '8px', background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer', transition: 'all 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          {showCustom ? '✕ Close' : '+ Custom gradient'}
        </button>

        {/* Custom gradient builder */}
        {showCustom && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '400px',
          }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Custom Gradient Builder
            </p>

            {/* Color pickers row */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color A</label>
                <input type="color" value={customA} onChange={e => setCustomA(e.target.value)}
                  style={{ width: '52px', height: '36px', borderRadius: '8px', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '2px', background: 'var(--color-bg-surface)' }} />
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '18px', marginTop: '16px' }}>→</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color B</label>
                <input type="color" value={customB} onChange={e => setCustomB(e.target.value)}
                  style={{ width: '52px', height: '36px', borderRadius: '8px', border: '1px solid var(--color-border)', cursor: 'pointer', padding: '2px', background: 'var(--color-bg-surface)' }} />
              </div>
            </div>

            {/* Angle slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Angle</label>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)' }}>{customAngle}°</span>
              </div>
              <input type="range" min="0" max="360" value={customAngle} onChange={e => setCustomAngle(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            </div>

            {/* Live preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '36px', borderRadius: '8px', background: customGradient }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Preview</span>
            </div>

            {/* Apply button */}
            <button
              onClick={() => { applyGradient(customGradient); setShowCustom(false) }}
              style={{
                padding: '8px 20px', fontSize: '13px', fontWeight: 600,
                background: customGradient,
                color: '#fff', border: 'none',
                borderRadius: '8px', cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Apply Gradient
            </button>
          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* ── Section 3: Locale ─────────────────────────────────────────── */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          Locale &amp; Formats
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Set default currencies, date formats, and numeric delimiters
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '560px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Currency Symbol</label>
            <DropdownSelect
              value={preferences.currency}
              onChange={val => setPreferences({ currency: val })}
              options={[
                { value: 'INR', label: '₹ INR (Indian Rupee)' },
                { value: 'USD', label: '$ USD (US Dollar)' },
                { value: 'EUR', label: '€ EUR (Euro)' }
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Date Display Format</label>
            <DropdownSelect
              value={preferences.dateFormat}
              onChange={val => setPreferences({ dateFormat: val })}
              options={[
                { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
                { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Number Delimiters</label>
            <DropdownSelect
              value={preferences.numberFormat}
              onChange={val => setPreferences({ numberFormat: val })}
              options={[
                { value: 'Indian', label: 'Indian (1,00,000)' },
                { value: 'International', label: 'International (100,000)' }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  const { preferences, setPreferences, applyGradient, formatCurrency, formatDate } = usePreferences()
  const [activeTab, setActiveTab] = useState('profile')
  const toast = useToast()
  const confirm = useConfirm()

  const showToast = (message, type = 'success') => {
    toast(message, type)
  }

  // --- TAB 1: Business Profile ---
  const [profile, setProfile] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    website: '',
    logo: ''
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  
  const fetchProfile = async () => {
    try {
      const res = await api.get('/settings/profile')
      if (res.success && res.data) {
        setProfile(res.data)
        setHasChanges(false)
      }
    } catch (err) {
      showToast(err.message || 'Failed to load business profile', 'error')
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
    setHasChanges(true)
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      const allowed = ['.jpg', '.jpeg', '.png']
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!allowed.includes(ext)) {
        showToast('Only .jpg, .jpeg, and .png files are allowed', 'error')
        return
      }

      const formData = new FormData()
      formData.append('logo', file)

      try {
        const res = await api.post('/settings/upload-logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        if (res.success && res.url) {
          setProfile(prev => ({ ...prev, logo: res.url }))
          setHasChanges(true)
          showToast('Image uploaded and cleaned successfully')
        }
      } catch (err) {
        showToast(err.message || 'Failed to upload logo', 'error')
      }
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target?.files?.[0]
    if (file) {
      const allowed = ['.jpg', '.jpeg', '.png']
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!allowed.includes(ext)) {
        showToast('Only .jpg, .jpeg, and .png files are allowed', 'error')
        return
      }

      const formData = new FormData()
      formData.append('logo', file)

      try {
        const res = await api.post('/settings/upload-logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        if (res.success && res.url) {
          setProfile(prev => ({ ...prev, logo: res.url }))
          setHasChanges(true)
          showToast('Image uploaded and cleaned successfully')
        }
      } catch (err) {
        showToast(err.message || 'Failed to upload logo', 'error')
      }
    }
  }

  const handleRemoveLogo = () => {
    setProfile(prev => ({ ...prev, logo: '' }))
    setHasChanges(true)
  }

  const saveProfile = async (e) => {
    if (e) e.preventDefault()
    const errors = {}
    if (!profile.businessName) errors.businessName = 'Business Name is required'
    if (!profile.ownerName) errors.ownerName = 'Owner Name is required'
    if (!profile.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Invalid email address'
    }
    if (!profile.phone) {
      errors.phone = 'Phone is required'
    } else if (!/^[0-9]{10}$/.test(profile.phone.replace(/[-+()\s]/g, ''))) {
      errors.phone = 'Phone must be a 10-digit number'
    }
    if (!profile.address) errors.address = 'Address is required'
    if (!profile.gstin) {
      errors.gstin = 'GSTIN is required'
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(profile.gstin.toUpperCase())) {
      errors.gstin = 'Invalid GSTIN format (e.g., 24AAAAA0000A1Z0)'
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      showToast('Please fix the validation errors before saving', 'error')
      return
    }

    try {
      const res = await api.post('/settings/profile', profile)
      if (res.success) {
        showToast('Business profile updated successfully')
        setHasChanges(false)
        setLastSaved(new Date().toLocaleTimeString())
      }
    } catch (err) {
      showToast(err.message || 'Failed to save business profile', 'error')
    }
  }

  // --- TAB 2: Vendors Management ---
  const [vendors, setVendors] = useState([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [vendorModalMode, setVendorModalMode] = useState('add') // 'add' | 'edit'
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    type: 'largeVendor',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    openingBalance: 0,
    status: 'Active'
  })

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors')
      setVendors(res)
    } catch (err) {
      showToast('Failed to load vendors', 'error')
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const handleOpenAddVendor = () => {
    setVendorForm({
      name: '',
      type: 'largeVendor',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      openingBalance: 0,
      status: 'Active'
    })
    setVendorModalMode('add')
    setShowVendorModal(true)
  }

  const handleOpenEditVendor = (v) => {
    setSelectedVendor(v)
    setVendorForm({
      name: v.name || '',
      type: v.type || 'largeVendor',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      gstin: v.gstin || '',
      openingBalance: v.openingBalance || 0,
      status: v.status || 'Active'
    })
    setVendorModalMode('edit')
    setShowVendorModal(true)
  }

  const handleSaveVendor = async (e) => {
    e.preventDefault()
    if (!vendorForm.name) {
      showToast('Vendor name is required', 'error')
      return
    }

    try {
      if (vendorModalMode === 'add') {
        await api.post('/vendors', vendorForm)
        showToast('Vendor added successfully')
      } else {
        await api.put(`/vendors/${selectedVendor._id}`, vendorForm)
        showToast('Vendor updated successfully')
      }
      setShowVendorModal(false)
      fetchVendors()
    } catch (err) {
      showToast(err.message || 'Error saving vendor', 'error')
    }
  }

  const handleDeleteVendor = async (v) => {
    if (await confirm(`Are you sure you want to delete ${v.name}? This action cannot be undone.`, { title: 'Delete Vendor' })) {
      try {
        await api.delete(`/vendors/${v._id}`)
        showToast('Vendor deleted successfully')
        fetchVendors()
      } catch (err) {
        showToast(err.message || 'Error deleting vendor', 'error')
      }
    }
  }

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  )

  // --- TAB 3: Financiers Management ---
  const [financiers, setFinanciers] = useState([])
  const [financierSearch, setFinancierSearch] = useState('')
  const [showFinancierModal, setShowFinancierModal] = useState(false)
  const [financierModalMode, setFinancierModalMode] = useState('add') // 'add' | 'edit'
  const [selectedFinancier, setSelectedFinancier] = useState(null)
  const [financierForm, setFinancierForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    status: 'Active',
    defaultInterestRate: 12
  })

  const fetchFinanciers = async () => {
    try {
      const res = await api.get('/financiers')
      setFinanciers(res)
    } catch (err) {
      showToast('Failed to load financiers', 'error')
    }
  }

  useEffect(() => {
    fetchFinanciers()
  }, [])

  const handleOpenAddFinancier = () => {
    setFinancierForm({
      name: '',
      phone: '',
      address: '',
      notes: '',
      status: 'Active',
      defaultInterestRate: 12
    })
    setFinancierModalMode('add')
    setShowFinancierModal(true)
  }

  const handleOpenEditFinancier = (f) => {
    setSelectedFinancier(f)
    setFinancierForm({
      name: f.name || '',
      phone: f.phone || '',
      address: f.address || '',
      notes: f.notes || '',
      status: f.status || 'Active',
      defaultInterestRate: f.defaultInterestRate || 12
    })
    setFinancierModalMode('edit')
    setShowFinancierModal(true)
  }

  const handleSaveFinancier = async (e) => {
    e.preventDefault()
    if (!financierForm.name) {
      showToast('Financier name is required', 'error')
      return
    }

    try {
      if (financierModalMode === 'add') {
        await api.post('/financiers', financierForm)
        showToast('Financier added successfully')
      } else {
        await api.put(`/financiers/${selectedFinancier._id}`, financierForm)
        showToast('Financier updated successfully')
      }
      setShowFinancierModal(false)
      fetchFinanciers()
    } catch (err) {
      showToast(err.message || 'Error saving financier', 'error')
    }
  }

  const handleDeleteFinancier = async (f) => {
    if (await confirm(`Are you sure you want to delete ${f.name}? This action cannot be undone.`, { title: 'Delete Financier' })) {
      try {
        await api.delete(`/financiers/${f._id}`)
        showToast('Financier deleted successfully')
        fetchFinanciers()
      } catch (err) {
        showToast(err.message || 'Error deleting financier', 'error')
      }
    }
  }

  const filteredFinanciers = financiers.filter(f => 
    f.name.toLowerCase().includes(financierSearch.toLowerCase())
  )

  // --- TAB 4: Loan Management ---
  const [loans, setLoans] = useState([])
  const [loanFinancierFilter, setLoanFinancierFilter] = useState('All')
  const [loanStatusFilter, setLoanStatusFilter] = useState('All')
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loanForm, setLoanForm] = useState({
    noteNumber: '',
    date: '29-06-2026',
    amount: '',
    notes: ''
  })

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans')
      setLoans(res)
    } catch (err) {
      showToast('Failed to load loans', 'error')
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  const handleOpenEditLoan = (l) => {
    setSelectedLoan(l)
    setLoanForm({
      noteNumber: l.noteNumber || l.loanReference || '',
      date: fromInputDate(l.date || l.drawdownDate || new Date().toISOString().split('T')[0]),
      amount: l.amount || l.principalAmount || '',
      notes: l.notes || ''
    })
    setShowLoanModal(true)
  }

  const handleSaveLoan = async (e) => {
    e.preventDefault()
    if (!loanForm.amount) {
      showToast('Loan amount is required', 'error')
      return
    }

    try {
      await api.put(`/loans/${selectedLoan._id}`, {
        noteNumber: loanForm.noteNumber,
        amount: Number(loanForm.amount),
        date: toInputDate(loanForm.date),
        notes: loanForm.notes
      })
      showToast('Loan details updated successfully')
      setShowLoanModal(false)
      fetchLoans()
    } catch (err) {
      showToast(err.message || 'Failed to update loan', 'error')
    }
  }

  const handleToggleLoanStatus = async (l) => {
    const isCurrentlyActive = l.status.toUpperCase() === 'ACTIVE'
    const newStatus = isCurrentlyActive ? 'CLOSED' : 'ACTIVE'
    
    try {
      await api.put(`/loans/${l._id}`, { status: newStatus })
      showToast(`Loan status marked as ${newStatus.toLowerCase()} successfully`)
      fetchLoans()
    } catch (err) {
      showToast(err.message || 'Failed to change loan status', 'error')
    }
  }

  const handleDeleteLoan = async (l) => {
    if (await confirm(`Are you sure you want to delete Loan ${l.noteNumber || l.loanReference}? This action cannot be undone.`, { title: 'Delete Loan' })) {
      try {
        await api.delete(`/loans/${l._id}`)
        showToast('Loan deleted successfully')
        fetchLoans()
      } catch (err) {
        showToast(err.message || 'Failed to delete loan', 'error')
      }
    }
  }

  const filteredLoans = loans.filter(l => {
    const matchFinancier = loanFinancierFilter === 'All' || l.financierId?._id === loanFinancierFilter
    
    let matchStatus = true
    if (loanStatusFilter !== 'All') {
      const isClosed = l.status.toUpperCase() === 'SETTLED'
      const filterClosed = loanStatusFilter === 'Closed'
      matchStatus = isClosed === filterClosed
    }

    return matchFinancier && matchStatus
  })

  // --- TAB 5: Cheque Banks (DB) ---
  const [banks, setBanks] = useState([])
  const [bankInput, setBankInput] = useState('')
  const [editingBankIndex, setEditingBankIndex] = useState(-1)
  const [editingBankValue, setEditingBankValue] = useState('')

  useEffect(() => {
    if (profile && profile.banks) {
      setBanks(profile.banks)
    }
  }, [profile])

  const saveBanksToStorage = async (newBanks) => {
    setBanks(newBanks)
    try {
      await api.post('/settings/profile', { ...profile, banks: newBanks })
    } catch (err) {
      showToast('Failed to save banks configuration to database', 'error')
    }
  }

  const handleAddBank = (e) => {
    if (e) e.preventDefault()
    if (!bankInput.trim()) return
    if (banks.includes(bankInput.trim())) {
      showToast('Bank already exists', 'error')
      return
    }
    const updated = [...banks, bankInput.trim()]
    saveBanksToStorage(updated)
    setBankInput('')
    showToast('Bank added successfully')
  }

  const handleStartEditBank = (idx, value) => {
    setEditingBankIndex(idx)
    setEditingBankValue(value)
  }

  const handleSaveEditBank = (idx) => {
    if (!editingBankValue.trim()) return
    const updated = [...banks]
    updated[idx] = editingBankValue.trim()
    saveBanksToStorage(updated)
    setEditingBankIndex(-1)
    showToast('Bank name updated')
  }

  const handleDeleteBank = async (idx, name) => {
    if (await confirm(`Are you sure you want to delete ${name}?`, { title: 'Delete Bank' })) {
      const updated = banks.filter((_, i) => i !== idx)
      saveBanksToStorage(updated)
      showToast('Bank deleted')
    }
  }

  // --- TAB 6: Payment Modes (DB) ---
  const [paymentModes, setPaymentModes] = useState([])
  const [modeInput, setModeInput] = useState('')
  const [editingModeIndex, setEditingModeIndex] = useState(-1)
  const [editingModeValue, setEditingModeValue] = useState('')

  useEffect(() => {
    if (profile && profile.paymentModes) {
      setPaymentModes(profile.paymentModes)
    }
  }, [profile])

  const saveModesToStorage = async (newModes) => {
    setPaymentModes(newModes)
    try {
      await api.post('/settings/profile', { ...profile, paymentModes: newModes })
    } catch (err) {
      showToast('Failed to save payment modes to database', 'error')
    }
  }

  const handleAddMode = (e) => {
    if (e) e.preventDefault()
    if (!modeInput.trim()) return
    if (paymentModes.some(m => m.name.toLowerCase() === modeInput.trim().toLowerCase())) {
      showToast('Payment mode already exists', 'error')
      return
    }
    const updated = [...paymentModes, { name: modeInput.trim(), enabled: true }]
    saveModesToStorage(updated)
    setModeInput('')
    showToast('Payment mode added')
  }

  const handleToggleMode = (idx) => {
    const updated = [...paymentModes]
    updated[idx].enabled = !updated[idx].enabled
    saveModesToStorage(updated)
    showToast(`Payment mode ${updated[idx].enabled ? 'enabled' : 'disabled'}`)
  }

  const handleSaveEditMode = (idx) => {
    if (!editingModeValue.trim()) return
    const updated = [...paymentModes]
    updated[idx].name = editingModeValue.trim()
    saveModesToStorage(updated)
    setEditingModeIndex(-1)
    showToast('Payment mode name updated')
  }

  const handleDeleteMode = async (idx, name) => {
    if (await confirm(`Are you sure you want to delete ${name}?`, { title: 'Delete Payment Mode' })) {
      const updated = paymentModes.filter((_, i) => i !== idx)
      saveModesToStorage(updated)
      showToast('Payment mode deleted')
    }
  }

  // --- TAB 7: Users & Access (DB) ---
  const [users, setUsers] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Viewer' })

  useEffect(() => {
    if (profile && profile.usersList) {
      setUsers(profile.usersList)
    }
  }, [profile])

  const saveUsersToStorage = async (newUsers) => {
    setUsers(newUsers)
    try {
      await api.post('/settings/profile', { ...profile, usersList: newUsers })
    } catch (err) {
      showToast('Failed to save users list to database', 'error')
    }
  }

  const handleInviteUser = (e) => {
    e.preventDefault()
    if (!inviteForm.name || !inviteForm.email) {
      showToast('Name and Email are required', 'error')
      return
    }
    const newUser = {
      id: String(Date.now()),
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'Active'
    }
    const updated = [...users, newUser]
    saveUsersToStorage(updated)
    setShowInviteModal(false)
    setInviteForm({ name: '', email: '', role: 'Viewer' })
    showToast(`Invite sent to ${newUser.email}`)
  }

  const handleChangeUserRole = (id, newRole) => {
    const updated = users.map(u => u.id === id ? { ...u, role: newRole } : u)
    saveUsersToStorage(updated)
    showToast('User role updated')
  }

  const handleDeleteUser = async (u) => {
    const admins = users.filter(usr => usr.role === 'Admin')
    if (u.role === 'Admin' && admins.length <= 1) {
      showToast('Cannot delete the last remaining Admin user', 'error')
      return
    }

    if (await confirm(`Are you sure you want to remove user ${u.name}?`, { title: 'Remove User' })) {
      const updated = users.filter(usr => usr.id !== u.id)
      saveUsersToStorage(updated)
      showToast('User removed successfully')
    }
  }

  // --- TAB 8: Data & Backups ---
  const [importSummary, setImportSummary] = useState(null)
  const [importData, setImportData] = useState(null)
  const fileInputRef = useRef(null)

  // Reset Flow States
  const [showResetModal1, setShowResetModal1] = useState(false)
  const [showResetModal2, setShowResetModal2] = useState(false)
  const [resetInputText, setResetInputText] = useState('')

  const handleExportExcel = async () => {
    try {
      showToast('Preparing Excel export...', 'info')
      const backupData = await api.get('/export/json')
      
      const formatSheetData = (arr) => {
        if (!arr || !Array.isArray(arr)) return []
        return arr.map(item => {
          const formatted = {}
          for (const key in item) {
            if (item.hasOwnProperty(key)) {
              let val = item[key]
              if (val === null || val === undefined || val === '') {
                val = '—'
              } else if (typeof val === 'object') {
                if (val.name) {
                  val = val.name
                } else if (val._id) {
                  val = val._id
                } else {
                  val = JSON.stringify(val)
                }
              }
              if (typeof val === 'boolean') {
                val = val ? 'Yes' : 'No'
              }
              formatted[key] = val
            }
          }
          return formatted
        })
      }

      const wb = XLSX.utils.book_new()
      
      const sheets = [
        { name: 'Settings', data: backupData.settings ? [backupData.settings] : [] },
        { name: 'Vendors', data: backupData.vendors },
        { name: 'Financiers', data: backupData.financiers },
        { name: 'Loans', data: backupData.loans },
        { name: 'Bills', data: backupData.bills },
        { name: 'Payments', data: backupData.payments },
        { name: 'Repayments', data: backupData.repayments },
        { name: 'Cheques', data: backupData.cheques },
        { name: 'Transactions', data: backupData.transactions }
      ]

      sheets.forEach(sheet => {
        const formatted = formatSheetData(sheet.data)
        const ws = XLSX.utils.json_to_sheet(formatted)
        XLSX.utils.book_append_sheet(wb, ws, sheet.name)
      })

      XLSX.writeFile(wb, 'vastrams_financial_data.xlsx')
      showToast('Excel Export completed successfully!')
    } catch (error) {
      console.error('Excel export error:', error)
      showToast('Excel Export failed: ' + error.message, 'error')
    }
  }

  const handleImportFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const parsed = {}
        
        const parseSheet = (sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          if (!sheet) return []
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          return rows.map(row => {
            const cleaned = {}
            for (const key in row) {
              if (row.hasOwnProperty(key)) {
                let val = row[key]
                if (val === '—') {
                  val = null
                } else if (val === 'Yes') {
                  val = true
                } else if (val === 'No') {
                  val = false
                }
                cleaned[key] = val
              }
            }
            return cleaned
          })
        }

        const settingsList = parseSheet('Settings')
        parsed.settings = settingsList[0] || {}
        parsed.vendors = parseSheet('Vendors')
        parsed.financiers = parseSheet('Financiers')
        parsed.loans = parseSheet('Loans')
        parsed.bills = parseSheet('Bills')
        parsed.payments = parseSheet('Payments')
        parsed.repayments = parseSheet('Repayments')
        parsed.cheques = parseSheet('Cheques')
        parsed.transactions = parseSheet('Transactions')

        setImportData(parsed)
        
        const vendorsCount = parsed.vendors?.length || 0
        const billsCount = parsed.bills?.length || 0
        const paymentsCount = parsed.payments?.length || 0
        const financiersCount = parsed.financiers?.length || 0
        const loansCount = parsed.loans?.length || 0
        const repaymentsCount = parsed.repayments?.length || 0
        const chequesCount = parsed.cheques?.length || 0

        setImportSummary(`Found ${vendorsCount} vendors, ${billsCount} bills, ${paymentsCount} payments, ${financiersCount} financiers, ${loansCount} loans, ${repaymentsCount} repayments, ${chequesCount} cheques in the Excel file.`)
      } catch (err) {
        console.error('Import error:', err)
        showToast('Invalid Excel file format', 'error')
        setImportSummary(null)
        setImportData(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirmImport = async () => {
    if (!importData) return
    try {
      const res = await api.post('/import', importData)
      if (res.success) {
        showToast('Data imported successfully')
        setImportSummary(null)
        setImportData(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        // Refresh all local backend lists
        fetchProfile()
        fetchVendors()
        fetchFinanciers()
        fetchLoans()
      }
    } catch (err) {
      showToast(err.message || 'Failed to import data', 'error')
    }
  }

  const handleResetConfirm1 = () => {
    setShowResetModal1(false)
    setShowResetModal2(true)
    setResetInputText('')
  }

  const handleFinalReset = async () => {
    if (resetInputText !== 'RESET') return
    try {
      const res = await api.post('/reset', { token: 'RESET' })
      if (res.success) {
        showToast('Database reset successfully')
        setShowResetModal2(false)
        setResetInputText('')
        
        // Reload page to let App reinitialize with clean configs
        window.location.reload()
      }
    } catch (err) {
      showToast(err.message || 'Database reset failed', 'error')
    }
  }

  // --- TAB 9: Appearance & Locale ---
  const accentGradients = [
    // Nature
    { name: 'Emerald Rush',  value: 'linear-gradient(135deg, #00C896, #00A87E)', cat: 'Nature' },
    { name: 'Forest',        value: 'linear-gradient(135deg, #11998e, #38ef7d)', cat: 'Nature' },
    { name: 'Mint Frost',    value: 'linear-gradient(135deg, #43e97b, #38f9d7)', cat: 'Nature' },
    { name: 'Aurora',        value: 'linear-gradient(135deg, #00C896, #6366f1)', cat: 'Nature' },
    // Ocean
    { name: 'Ocean Depth',   value: 'linear-gradient(135deg, #1a6dff, #00d2ff)', cat: 'Ocean' },
    { name: 'Arctic',        value: 'linear-gradient(135deg, #4facfe, #00f2fe)', cat: 'Ocean' },
    { name: 'Midnight',      value: 'linear-gradient(135deg, #0f3460, #533483)', cat: 'Ocean' },
    { name: 'Cosmic',        value: 'linear-gradient(135deg, #6366f1, #8b5cf6)', cat: 'Ocean' },
    // Warm
    { name: 'Sunset',        value: 'linear-gradient(135deg, #f97316, #eab308)', cat: 'Warm' },
    { name: 'Volcano',       value: 'linear-gradient(135deg, #ff4e50, #f9d423)', cat: 'Warm' },
    { name: 'Rose Gold',     value: 'linear-gradient(135deg, #f43f5e, #fb7185)', cat: 'Warm' },
    { name: 'Inferno',       value: 'linear-gradient(135deg, #f12711, #f5af19)', cat: 'Warm' },
    // Special
    { name: 'Nebula',        value: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', cat: 'Special' },
    { name: 'Ultraviolet',   value: 'linear-gradient(135deg, #7F00FF, #E100FF)', cat: 'Special' },
    { name: 'Neon',          value: 'linear-gradient(135deg, #00ff87, #60efff)', cat: 'Special' },
    { name: 'Galaxy',        value: 'linear-gradient(135deg, #1a1a2e, #e94560)', cat: 'Special' },
  ]

  // --- TAB 10: About ---
  const checkUpdates = () => {
    showToast('You are on the latest version', 'info')
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-8 pb-16">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>Business Profile</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage your corporate details, invoicing info, and logo</p>
            </div>

            <form onSubmit={saveProfile} className="space-y-8">
              
              {/* --- SECTION 1: Business Information --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Business Information</h3>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  
                  {/* Logo Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                      dragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200 dark:border-slate-700'
                    }`}
                    style={{ 
                      minWidth: '220px', 
                      height: '150px', 
                      background: 'var(--color-bg-elevated)',
                    }}
                  >
                    {profile.logo ? (
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-white">
                        <img src={profile.logo} alt="Logo Preview" className="object-contain h-full w-full" />
                      </div>
                    ) : (
                      <Store size={28} className="text-gray-400 mb-1" />
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">Drag logo here or upload</p>
                    <div className="flex gap-2 mt-2">
                      <label className="px-2.5 py-1 text-[10px] font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors">
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {profile.logo && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Business Name *</label>
                      <input 
                        type="text" 
                        name="businessName" 
                        value={profile.businessName} 
                        onChange={handleProfileChange}
                        placeholder="Company Name"
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-strong)',
                          color: 'var(--color-text-primary)',
                          fontSize: '15px'
                        }}
                        className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500" 
                      />
                      {profileErrors.businessName && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.businessName}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">GSTIN Number *</label>
                      <input 
                        type="text" 
                        name="gstin" 
                        value={profile.gstin} 
                        onChange={handleProfileChange}
                        placeholder="22AAAAA0000A1Z0"
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-strong)',
                          color: 'var(--color-text-primary)',
                          fontSize: '15px'
                        }}
                        className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500 font-mono uppercase" 
                      />
                      {profileErrors.gstin && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.gstin}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* --- SECTION 2: Contact Information --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact Information</h3>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Owner Name *</label>
                    <input 
                      type="text" 
                      name="ownerName" 
                      value={profile.ownerName} 
                      onChange={handleProfileChange}
                      placeholder="Owner name"
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-strong)',
                        color: 'var(--color-text-primary)',
                        fontSize: '15px'
                      }}
                      className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500" 
                    />
                    {profileErrors.ownerName && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.ownerName}</p>}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={profile.email} 
                      onChange={handleProfileChange}
                      placeholder="email@company.com"
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-strong)',
                        color: 'var(--color-text-primary)',
                        fontSize: '15px'
                      }}
                      className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500" 
                    />
                    {profileErrors.email && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                    <input 
                      type="text" 
                      name="phone" 
                      value={profile.phone} 
                      onChange={handleProfileChange}
                      placeholder="9876543210"
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-strong)',
                        color: 'var(--color-text-primary)',
                        fontSize: '15px'
                      }}
                      className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500" 
                    />
                    {profileErrors.phone && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* --- SECTION 3: Address --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Address</h3>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Corporate Address *</label>
                  <textarea 
                    name="address" 
                    rows={2} 
                    value={profile.address} 
                    onChange={handleProfileChange}
                    placeholder="Enter corporate address"
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border-strong)',
                      color: 'var(--color-text-primary)',
                      fontSize: '15px'
                    }}
                    className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500 resize-none" 
                  />
                  {profileErrors.address && <p className="text-[11px] text-red-500 mt-1 font-medium">{profileErrors.address}</p>}
                </div>
              </div>

              {/* --- SECTION 4: Online Presence --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Online Presence</h3>
                <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Website</label>
                  <input 
                    type="text" 
                    name="website" 
                    value={profile.website} 
                    onChange={handleProfileChange}
                    placeholder="https://www.company.com"
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border-strong)',
                      color: 'var(--color-text-primary)',
                      fontSize: '15px'
                    }}
                    className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-gray-400 dark:hover:border-slate-500" 
                  />
                </div>
              </div>

              {/* Unsaved changes status indicator */}
              {!hasChanges && lastSaved && (
                <div className="flex justify-end pt-2 text-[11px] text-gray-400 font-medium">
                  Last saved at {lastSaved}
                </div>
              )}

              {/* Sticky Action Footer */}
              {hasChanges && (
                <div 
                  className="fixed bottom-0 left-0 right-0 z-50 py-4 px-6 flex justify-between items-center border-t backdrop-blur-sm"
                  style={{
                    background: 'rgba(17, 24, 39, 0.95)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div className="flex items-center space-x-2 text-xs font-semibold text-amber-500">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Unsaved Changes</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        fetchProfile()
                        setHasChanges(false)
                      }}
                      className="px-4 py-2 text-xs font-semibold text-gray-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-md btn-primary"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )

      case 'vendors':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vendors Management</h2>
                <p className="text-xs text-gray-400 mt-0.5">Administer vendor directory listings, categories, and credit parameters</p>
              </div>
              <button onClick={handleOpenAddVendor} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={14} />
                <span>Add Vendor</span>
              </button>
            </div>

            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search vendors..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
            </div>

            {filteredVendors.length === 0 ? (
              vendors.length === 0 ? (
                <EmptyState icon="store" title="No Vendors Yet" description="Add your first vendor to manage them here" action={{ label: "Add Vendor", onClick: handleOpenAddVendor }} />
              ) : (
                <EmptyState icon="search" title="No Results" description="No vendors match your search keywords" />
              )
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">GSTIN</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVendors.map(v => (
                      <tr key={v._id} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                        <td className="px-4 py-3 font-semibold text-gray-900">{v.name}</td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="neutral">{v.type === 'smallVendor' ? 'Small Vendor' : 'Big Vendor'}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">{v.phone || '—'}</td>
                        <td className="px-4 py-3 font-mono uppercase">{v.gstin || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={v.status === 'Active' ? 'success' : 'danger'}>
                            {v.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex space-x-2">
                            <button onClick={() => handleOpenEditVendor(v)} className="p-1 hover:text-brand-primary text-gray-400 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteVendor(v)} className="p-1 hover:text-red-500 text-gray-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'financiers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Financiers Management</h2>
                <p className="text-xs text-gray-400 mt-0.5">Administer financier profiles, lenders, and interest parameters</p>
              </div>
              <button onClick={handleOpenAddFinancier} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={14} />
                <span>Add Financier</span>
              </button>
            </div>

            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search financiers..." value={financierSearch} onChange={e => setFinancierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
            </div>

            {filteredFinanciers.length === 0 ? (
              financiers.length === 0 ? (
                <EmptyState icon="bank" title="No Financiers Yet" description="Add your first financier to manage them here" action={{ label: "Add Financier", onClick: handleOpenAddFinancier }} />
              ) : (
                <EmptyState icon="search" title="No Results" description="No financiers match your search keywords" />
              )
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Address</th>
                      <th className="px-4 py-2.5">Rate (%)</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFinanciers.map(f => (
                      <tr key={f._id} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                        <td className="px-4 py-3 font-semibold text-gray-900">{f.name}</td>
                        <td className="px-4 py-3 font-mono">{f.phone || '—'}</td>
                        <td className="px-4 py-3 truncate max-w-[200px]">{f.address || '—'}</td>
                        <td className="px-4 py-3 font-mono">{f.defaultInterestRate}%</td>
                        <td className="px-4 py-3">
                          <Badge variant={f.status === 'Active' ? 'success' : 'danger'}>
                            {f.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex space-x-2">
                            <button onClick={() => handleOpenEditFinancier(f)} className="p-1 hover:text-brand-primary text-gray-400 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteFinancier(f)} className="p-1 hover:text-red-500 text-gray-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'loans':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Loan Management</h2>
              <p className="text-xs text-gray-400 mt-0.5">Edit parameters, toggle statuses, and audit loan details across financiers</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="w-48">
                <DropdownSelect
                  value={loanFinancierFilter}
                  onChange={val => setLoanFinancierFilter(val)}
                  placeholder="Select Financier"
                  options={[{ value: 'All', label: 'All Financiers' }, ...financiers.map(f => ({ value: f._id, label: f.name }))]}
                />
              </div>
              <div className="w-48">
                <DropdownSelect
                  value={loanStatusFilter}
                  onChange={val => setLoanStatusFilter(val)}
                  placeholder="Select Status"
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Closed', label: 'Closed' }
                  ]}
                />
              </div>
            </div>

            {filteredLoans.length === 0 ? (
              loans.length === 0 ? (
                <EmptyState icon="loan" title="No Loans Yet" description="No loans are currently recorded in the database" />
              ) : (
                <EmptyState icon="search" title="No Loans Match" description="Try adjusting your financier or status filters" />
              )
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Note #</th>
                      <th className="px-4 py-2.5">Financier</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Loan Amount</th>
                      <th className="px-4 py-2.5 text-right">Paid</th>
                      <th className="px-4 py-2.5 text-right">Outstanding</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLoans.map(l => {
                      const isClosed = l.status.toUpperCase() === 'SETTLED'
                      return (
                        <tr key={l._id} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                          <td className="px-4 py-3 font-semibold text-gray-900">{l.noteNumber || l.loanReference}</td>
                          <td className="px-4 py-3">{l.financierId?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono">{formatDate(l.date || l.drawdownDate)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(l.amount || l.principalAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">{formatCurrency(l.paid || l.paidPrincipal || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-orange-500 tabular-nums">{formatCurrency(l.outstanding || l.outstandingPrincipal || 0)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={!isClosed ? 'success' : 'success'}>
                              {!isClosed ? 'Active' : 'Closed'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleOpenEditLoan(l)} className="p-1 hover:text-brand-primary text-gray-400 transition-colors" title="Edit Loan"><Edit2 size={14} /></button>
                              <button onClick={() => handleToggleLoanStatus(l)} className={`p-1 transition-colors ${!isClosed ? 'text-gray-400 hover:text-green-600' : 'text-green-600 hover:text-gray-400'}`} title={!isClosed ? 'Mark Closed' : 'Reopen Loan'}>
                                <Check size={14} />
                              </button>
                              <button onClick={() => handleDeleteLoan(l)} className="p-1 hover:text-red-500 text-gray-400 transition-colors" title="Delete Loan"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'banks':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cheque Banks</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage the list of active banking partners loaded in cheque forms</p>
            </div>

            {banks.length === 0 ? (
              <EmptyState icon="bank" title="No Banks Added" description="Add a bank to use it in the cheque registry" />
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-w-md">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Bank Name</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {banks.map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                        <td className="px-4 py-3.5">
                          {editingBankIndex === idx ? (
                            <input 
                              type="text" 
                              value={editingBankValue} 
                              onChange={e => setEditingBankValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEditBank(idx)
                                if (e.key === 'Escape') setEditingBankIndex(-1)
                              }}
                              className="px-2 py-1 text-sm border border-gray-200 rounded w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">{b}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {editingBankIndex === idx ? (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleSaveEditBank(idx)} className="text-xs font-bold text-brand-primary">Save</button>
                              <button onClick={() => setEditingBankIndex(-1)} className="text-xs font-bold text-gray-400">Cancel</button>
                            </div>
                          ) : (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleStartEditBank(idx, b)} className="p-1 hover:text-brand-primary text-gray-400"><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteBank(idx, b)} className="p-1 hover:text-red-500 text-gray-400"><Trash2 size={13} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleAddBank} className="flex items-center space-x-2 max-w-md pt-2">
              <input 
                type="text" 
                placeholder="Enter bank name..." 
                value={bankInput} 
                onChange={e => setBankInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
              <button type="submit" className="px-3.5 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                Add Bank
              </button>
            </form>
          </div>
        )

      case 'paymentModes':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment Modes</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enable, disable, or declare custom payment types used in transactions</p>
            </div>

            {paymentModes.length === 0 ? (
              <EmptyState icon="wallet" title="No Payment Modes" description="Add a payment mode to use it across the app" />
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-w-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Mode Name</th>
                      <th className="px-4 py-2.5">Enabled</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentModes.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                        <td className="px-4 py-3.5">
                          {editingModeIndex === idx ? (
                            <input 
                              type="text" 
                              value={editingModeValue} 
                              onChange={e => setEditingModeValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEditMode(idx)
                                if (e.key === 'Escape') setEditingModeIndex(-1)
                              }}
                              className="px-2 py-1 text-sm border border-gray-200 rounded w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">{m.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleMode(idx)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              m.enabled
                                ? 'bg-brand-primary'
                                : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                            role="switch"
                            aria-checked={m.enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                m.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {editingModeIndex === idx ? (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleSaveEditMode(idx)} className="text-xs font-bold text-brand-primary">Save</button>
                              <button onClick={() => setEditingModeIndex(-1)} className="text-xs font-bold text-gray-400">Cancel</button>
                            </div>
                          ) : (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => { setEditingModeIndex(idx); setEditingModeValue(m.name) }} className="p-1 hover:text-brand-primary text-gray-400"><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteMode(idx, m.name)} className="p-1 hover:text-red-500 text-gray-400"><Trash2 size={13} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleAddMode} className="flex items-center space-x-2 max-w-lg pt-2">
              <input 
                type="text" 
                placeholder="Enter custom mode name..." 
                value={modeInput} 
                onChange={e => setModeInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
              <button type="submit" className="px-3.5 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                Add Mode
              </button>
            </form>
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Users & Access</h2>
                <p className="text-xs text-gray-400 mt-0.5">Control administrative access permissions and role allocations</p>
              </div>
              <button onClick={() => setShowInviteModal(true)} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <Plus size={14} />
                <span>Invite User</span>
              </button>
            </div>

            {users.length === 0 ? (
              <EmptyState icon="user" title="No Users Found" description="Invite a user to give them access to Vastrams" />
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors text-sm text-gray-700">
                        <td className="px-4 py-3 font-semibold text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <select 
                            value={u.role} 
                            onChange={e => handleChangeUserRole(u.id, e.target.value)}
                            className="px-2 py-0.5 text-xs border border-gray-200 rounded bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 focus:outline-none"
                          >
                            <option value="Admin" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100">Admin</option>
                            <option value="Viewer" className="bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100">Viewer</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.status === 'Active' ? 'success' : 'danger'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteUser(u)} className="p-1 hover:text-red-500 text-gray-400 transition-colors" title="Delete User">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'backups':
        return (
          <div className="space-y-8 divide-y divide-gray-100">
            {/* Export Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Export Data</h2>
                <p className="text-xs text-gray-400 mt-0.5">Download full snapshots of vendors, loans, checks, and settings</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button onClick={handleExportExcel} className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 transition-colors">
                  <Database size={14} />
                  <span>Export as Excel</span>
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-4 pt-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Import Data</h2>
                <p className="text-xs text-gray-400 mt-0.5">Restore the application data from a previously exported `.xlsx` file</p>
              </div>

              <div className="max-w-md space-y-4">
                <div className="border border-dashed border-gray-200 dark:border-slate-600 rounded-lg p-5 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Upload size={20} className="text-gray-400 dark:text-slate-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-0.5">Import an Excel backup file</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">Only valid Excel backups created by this app are supported</p>
                    </div>
                    <label className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
                      <Upload size={12} />
                      <span>Choose File</span>
                      <input 
                        type="file" 
                        accept=".xlsx" 
                        onChange={handleImportFileChange}
                        ref={fileInputRef}
                        className="hidden"
                      />
                    </label>
                    {fileInputRef.current?.files?.[0] && (
                      <p className="text-[10px] font-mono text-gray-500 dark:text-slate-400 truncate max-w-full">{fileInputRef.current.files[0].name}</p>
                    )}
                  </div>
                </div>

                {importSummary && (
                  <div className="p-3 rounded-lg text-xs space-y-3" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', color: 'var(--color-primary)' }}>
                    <p className="font-semibold">{importSummary}</p>
                    <button onClick={handleConfirmImport} className="px-3.5 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                      Confirm Import
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Section */}
            <div className="space-y-4 pt-6">
              <div>
                <h2 className="text-lg font-bold text-red-500">Reset Data</h2>
                <p className="text-xs text-gray-400 mt-0.5">Danger zone: permanently wipe all financial ledgers, bills, and settings</p>
              </div>
              <div>
                <button onClick={() => setShowResetModal1(true)} className="px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return <AppearanceTab
          preferences={preferences}
          setPreferences={setPreferences}
          applyGradient={applyGradient}
          accentGradients={accentGradients}
        />

      case 'about':
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Vastrams</h2>
              <p className="text-sm font-semibold text-brand-primary">Vendor & Finance Management System</p>
              <p className="text-xs text-gray-400 mt-1">Enterprise ledger management, automated FIFO payables reconciliation, and lender notes tracker.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">App Version</span>
                <span className="text-sm font-semibold text-gray-900 mt-1 block">v1.0.0</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Build Date</span>
                <span className="text-sm font-semibold text-gray-900 mt-1 block">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Technology Stack</h3>
              <div className="flex flex-wrap gap-2">
                {['React 18', 'Vite', 'Tailwind CSS', 'Node.js', 'Express.js', 'MongoDB (Mongoose)'].map((tech) => (
                  <span key={tech} className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-medium border border-gray-200">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button onClick={checkUpdates} className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                <RefreshCw size={12} />
                <span>Check for Updates</span>
              </button>
            </div>

            <div className="pt-8 border-t border-gray-200">
              <p className="text-[10px] text-gray-400">Developed for Vastrams Accounts Division. All Rights Reserved &copy; 2026.</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const groups = [
    {
      title: 'General',
      items: [
        { id: 'profile', label: 'Business Profile', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'users', label: 'Users & Access', icon: User },
        { id: 'backups', label: 'Data & Backups', icon: Database },
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'vendors', label: 'Vendors Master', icon: Store },
        { id: 'financiers', label: 'Financiers Master', icon: Building2 },
        { id: 'loans', label: 'Loan Manager', icon: Coins },
        { id: 'banks', label: 'Cheque Banks', icon: Building2 },
        { id: 'paymentModes', label: 'Payment Modes', icon: CreditCard },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'about', label: 'About', icon: Info },
      ]
    }
  ]

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
        <p className="text-xs text-gray-400 mt-1">Configure system parameters, manage profile details, and maintain backups</p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col md:flex-row gap-8 items-start relative">
        {/* Left Column Tab Bar (Sticky) */}
        <aside className="w-full md:w-48 shrink-0 md:sticky md:top-14 space-y-6 flex md:flex-col flex-row overflow-x-auto md:overflow-x-visible whitespace-nowrap">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5 flex flex-col w-full">
              <h3 className="hidden md:block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-1">
                {group.title}
              </h3>
              <div className="flex md:flex-col flex-row gap-0.5">
                {group.items.map(tab => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold w-full transition-all text-left ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <tab.icon size={13} className="shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Right Column Tab Content (Scrolls independently) */}
        <div className="flex-1 w-full min-w-0 min-h-[450px]">
          {renderActiveTabContent()}
        </div>
      </div>

      {/* Toast managed globally via ToastProvider in App.jsx */}

      {/* --- VENDOR MODAL --- */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {vendorModalMode === 'add' ? 'Add New Vendor' : 'Edit Vendor Parameters'}
              </h3>
              <button onClick={() => setShowVendorModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Name *</label>
                  <input type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Type</label>
                  <DropdownSelect
                    value={vendorForm.type}
                    onChange={val => setVendorForm({ ...vendorForm, type: val })}
                    options={[
                      { value: 'smallVendor', label: 'Small Vendor' },
                      { value: 'largeVendor', label: 'Big Vendor' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input type="text" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN</label>
                  <input type="text" value={vendorForm.gstin} onChange={e => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Balance</label>
                  <input type="number" value={vendorForm.openingBalance} onChange={e => setVendorForm({ ...vendorForm, openingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <DropdownSelect
                    value={vendorForm.status}
                    onChange={val => setVendorForm({ ...vendorForm, status: val })}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                  <textarea rows={2} value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowVendorModal(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3.5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FINANCIER MODAL --- */}
      {showFinancierModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {financierModalMode === 'add' ? 'Add New Financier' : 'Edit Financier Parameters'}
              </h3>
              <button onClick={() => setShowFinancierModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveFinancier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Financier Name *</label>
                  <input type="text" value={financierForm.name} onChange={e => setFinancierForm({ ...financierForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input type="text" value={financierForm.phone} onChange={e => setFinancierForm({ ...financierForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={financierForm.defaultInterestRate} onChange={e => setFinancierForm({ ...financierForm, defaultInterestRate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <DropdownSelect
                    value={financierForm.status}
                    onChange={val => setFinancierForm({ ...financierForm, status: val })}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                  <textarea rows={2} value={financierForm.address} onChange={e => setFinancierForm({ ...financierForm, address: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={financierForm.notes} onChange={e => setFinancierForm({ ...financierForm, notes: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowFinancierModal(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3.5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90">Save Financier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT LOAN MODAL --- */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Edit Loan parameters</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Note Number *</label>
                  <input type="text" value={loanForm.noteNumber} onChange={e => setLoanForm({ ...loanForm, noteNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Loan Date</label>
                  <CustomDatePicker
                    value={loanForm.date}
                    onChange={val => setLoanForm({ ...loanForm, date: val })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Loan Amount *</label>
                  <input type="number" value={loanForm.amount} onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={loanForm.notes} onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowLoanModal(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3.5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INVITE USER MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Invite New User</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">User Name *</label>
                  <input type="text" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Access Role</label>
                  <DropdownSelect
                    value={inviteForm.role}
                    onChange={val => setInviteForm({ ...inviteForm, role: val })}
                    options={[
                      { value: 'Admin', label: 'Admin' },
                      { value: 'Viewer', label: 'Viewer' }
                    ]}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3.5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET MODAL 1 --- */}
      {showResetModal1 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide">Are you sure?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">This will permanently wipe all financial ledgers, bills, loans, cheques, and custom settings. This action is irreversible.</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowResetModal1(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleResetConfirm1} className="px-3.5 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESET MODAL 2 --- */}
      {showResetModal2 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide">Final Confirmation</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Please type <strong className="font-semibold text-gray-900">RESET</strong> exactly in the input box below to authorize the database purge.</p>
            <input 
              type="text" 
              value={resetInputText} 
              onChange={e => setResetInputText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center font-bold tracking-widest focus:outline-none"
              placeholder="Type RESET"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowResetModal2(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button 
                onClick={handleFinalReset} 
                disabled={resetInputText !== 'RESET'}
                className={`px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
                  resetInputText === 'RESET' 
                    ? 'bg-red-600 hover:bg-red-700 cursor-pointer shadow-sm' 
                    : 'bg-red-300 cursor-not-allowed'
                }`}
              >
                Permanently Wipe Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
