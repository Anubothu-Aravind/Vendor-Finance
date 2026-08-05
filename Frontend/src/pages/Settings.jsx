import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useBlocker, useBeforeUnload } from 'react-router-dom'
import { 
  User, Store, Building2, Coins, CreditCard, Database, Palette, Info, 
  Search, Plus, Trash2, Edit2, X, Check, Upload, RefreshCw,
  Sun, Moon, Monitor, Leaf, Waves, Flame, Sparkles, QrCode, FileText
} from 'lucide-react'
import api from '../utils/api'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useDirtyStateContext } from '../context/DirtyStateContext'
import { useSaveConfirmation } from '../hooks/useSaveConfirmation'
import { SaveConfirmationModal } from '../components/ui/SaveConfirmationModal'
import Badge from '../components/ui/Badge'
import { usePreferences } from '../hooks/usePreferences'
import { toInputDate, fromInputDate } from '../utils/date'
import * as XLSX from 'xlsx'
import ProfileCompletionCard from '../components/settings/ProfileCompletionCard'
import LogoUploader from '../components/settings/LogoUploader'
import StickySaveBar from '../components/settings/StickySaveBar'
import CopyButton from '../components/ui/CopyButton'
import useProfileDraft from '../hooks/useProfileDraft'
import { Skeleton } from '../components/ui/Skeleton'
import analytics from '../utils/analytics'
import featureFlags from '../utils/featureFlags'
import { getFormDiff } from '../utils/formDiff'
import { useCompanyProfile } from '../context/ProfileContext'

// ── Appearance Tab (extracted to keep Settings component lean) ────────────────
function AppearanceTab({ preferences, setPreferences, confirm, showToast }) {
  const themeOptions = [
    { value: 'light',  label: 'Light',  desc: 'Light backgrounds', Icon: Sun },
    { value: 'dark',   label: 'Dark',   desc: 'Dark canvas', Icon: Moon },
    { value: 'system', label: 'System', desc: 'Follows OS', Icon: Monitor },
  ]

  const handleThemeChange = async (targetTheme) => {
    if (targetTheme === preferences.theme) return
    const themeLabel = targetTheme === 'light' ? 'Light' : targetTheme === 'dark' ? 'Dark' : 'System Default'
    const ok = await confirm(
      `Are you sure you want to switch the application theme to ${themeLabel}?`,
      { title: 'Confirm Theme Change' }
    )
    if (ok) {
      setPreferences({ theme: targetTheme })
      if (showToast) showToast(`Application theme changed to ${themeLabel}`)
    }
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
          {themeOptions.map(({ value, label, desc }) => {
            const isActive = preferences.theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
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
                <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-display)' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{desc}</div>
              </button>
            )
          })}
        </div>
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
  const { updateCompanyProfile } = useCompanyProfile()
  const [activeTab, setActiveTab] = useState('profile')
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

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
  const [profileSnapshot, setProfileSnapshot] = useState(null)
  const [profileErrors, setProfileErrors] = useState({})
  const [profileLoading, setProfileLoading] = useState(true)
  const [completion, setCompletion] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  
  // Pending deferred logo upload
  const [pendingLogoFile, setPendingLogoFile] = useState(null)
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState(null)

  // Draft banner state
  const [profileDraftBanner, setProfileDraftBanner] = useState(null)

  const isDirty = useMemo(() => {
    if (!profileSnapshot) return false
    const fieldsChanged = (
      (profile.businessName || '') !== (profileSnapshot.businessName || '') ||
      (profile.ownerName || '') !== (profileSnapshot.ownerName || '') ||
      (profile.email || '') !== (profileSnapshot.email || '') ||
      (profile.phone || '') !== (profileSnapshot.phone || '') ||
      (profile.address || '') !== (profileSnapshot.address || '') ||
      (profile.gstin || '') !== (profileSnapshot.gstin || '') ||
      (profile.website || '') !== (profileSnapshot.website || '') ||
      (profile.logo || '') !== (profileSnapshot.logo || '')
    )
    return fieldsChanged || pendingLogoFile !== null
  }, [profile, profileSnapshot, pendingLogoFile])

  // Form diff for "What changed?" and field counts
  const formDiffResult = useMemo(() => {
    if (!profileSnapshot) return { changedFields: [], count: 0 }
    return getFormDiff(profileSnapshot, profile)
  }, [profileSnapshot, profile])

  // Draft hook integration
  const profileDraft = useProfileDraft(profile, isDirty)

  // Clean up object URLs on unmount or when pendingLogoPreviewUrl changes
  useEffect(() => {
    return () => {
      if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl)
      }
    }
  }, [pendingLogoPreviewUrl])

  const fetchProfile = async (signal) => {
    setProfileLoading(true)
    try {
      const res = await api.get('/settings/profile', { signal })
      if (res.success && res.data) {
        if (!signal || !signal.aborted) {
          const profileData = {
            ...res.data,
            businessName: res.data.businessName || '',
            ownerName: res.data.ownerName || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            address: res.data.address || '',
            gstin: res.data.gstin || '',
            website: res.data.website || '',
            logo: res.data.logo || '',
            banks: res.data.banks || [],
            paymentModes: res.data.paymentModes || [],
            usersList: res.data.usersList || [],
            invoiceTemplates: res.data.invoiceTemplates || {
              selectedTheme: 'Modern Minimal',
              showQr: true,
              showHsn: false,
              showQty: false,
              showTaxTable: false,
              declarationText: 'We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.'
            }
          }
          setProfile(profileData)
          setProfileSnapshot(profileData)
          if (res.completion) {
            setCompletion(res.completion)
          }
        }
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        showToast(err.message || 'Failed to load business profile', 'error')
      }
    } finally {
      if (!signal || !signal.aborted) {
        setProfileLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchProfile(controller.signal)

    // Check for unexpired draft on mount
    profileDraft.loadDraftOnMount().then(savedDraft => {
      if (savedDraft?.data) {
        setProfileDraftBanner(savedDraft)
      }
    })

    return () => controller.abort()
  }, [])

  // Auto-save draft interval when dirty
  const isDirtyRef = useRef(isDirty)
  const profileRef = useRef(profile)
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])
  useEffect(() => { profileRef.current = profile }, [profile])

  useEffect(() => {
    const cleanup = profileDraft.startAutoSave(
      () => profileRef.current,
      () => isDirtyRef.current
    )
    return cleanup
  }, [])

  const { confirmNavigation } = useDirtyStateContext()
  const { confirmConfig, isSaving, requestSaveConfirmation } = useSaveConfirmation()

  useDirtyForm({
    id: 'settings-profile',
    title: 'Company Profile Settings',
    isDirty: activeTab === 'profile' && isDirty,
    onSave: () => saveProfile(),
    onDiscard: () => handleDiscardProfile()
  })

  // Handle Logo Selection (Deferred Upload)
  const handleLogoFileSelect = (file) => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl)
    }
    const previewUrl = URL.createObjectURL(file)
    setPendingLogoFile(file)
    setPendingLogoPreviewUrl(previewUrl)
  }

  const handleRemoveLogo = () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl)
      setPendingLogoPreviewUrl(null)
    }
    setPendingLogoFile(null)
    setProfile(prev => ({ ...prev, logo: '' }))
  }

  const handleDiscardProfile = () => {
    setProfile(profileSnapshot)
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl)
      setPendingLogoPreviewUrl(null)
    }
    setPendingLogoFile(null)
    setProfileErrors({})
  }

  const handleRestoreDraftClick = async () => {
    const draftData = await profileDraft.restoreDraft()
    if (draftData) {
      setProfile(prev => ({ ...prev, ...draftData }))
      setProfileDraftBanner(null)
      showToast('Draft restored successfully', 'info')
    }
  }

  const handleDiscardDraftClick = async () => {
    await profileDraft.discardDraft()
    setProfileDraftBanner(null)
  }

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) return
    confirmNavigation(() => {
      setActiveTab(tabId)
    })
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleFieldFocusClick = (fieldName) => {
    const el = document.getElementsByName(fieldName)?.[0]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
    }
  }

  const saveProfile = (e) => {
    if (e) e.preventDefault()
    const errors = {}
    if (!profile.businessName?.trim()) errors.businessName = 'Business Name is required'
    if (!profile.ownerName?.trim()) errors.ownerName = 'Owner Name is required'
    if (!profile.email?.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      errors.email = 'Invalid email address'
    }
    if (!profile.phone?.trim()) {
      errors.phone = 'Phone is required'
    } else if (!/^[0-9]{10}$/.test(profile.phone.replace(/[-+()\s]/g, ''))) {
      errors.phone = 'Phone must be a valid 10-digit mobile number'
    }
    if (!profile.address?.trim()) errors.address = 'Address is required'
    if (!profile.gstin?.trim()) {
      errors.gstin = 'GSTIN is required'
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(profile.gstin.trim())) {
      errors.gstin = 'Invalid GSTIN format (e.g., 24AAAAA0000A1Z0)'
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      analytics.track('profile.validation.failed', { fields: Object.keys(errors) })
      showToast('Please fix the validation errors before saving', 'error')
      return
    }

    requestSaveConfirmation({
      title: 'Confirm Profile Update',
      message: 'You are about to save changes to your business profile.',
      initialValues: profileSnapshot,
      currentValues: profile,
      labelMap: {
        businessName: 'Business Name',
        ownerName: 'Owner Name',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        gstin: 'GSTIN',
        website: 'Website',
        logo: 'Logo'
      },
      onSaveApi: async () => {
        let finalLogoUrl = profile.logo

        // 1. Upload logo if pending
        if (pendingLogoFile && featureFlags.isEnabled('deferredLogo')) {
          const formData = new FormData()
          formData.append('logo', pendingLogoFile)
          try {
            const uploadRes = await api.post('/settings/upload-logo', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
            if (uploadRes.success && uploadRes.url) {
              finalLogoUrl = uploadRes.url
            }
          } catch (uploadErr) {
            analytics.track('profile.save.failed', { stage: 'logo_upload', error: uploadErr.message })
            showToast(uploadErr.message || 'Failed to upload logo — profile not saved', 'error')
            return false
          }
        }

        // 2. Save profile fields
        const payload = {
          businessName: profile.businessName.trim(),
          ownerName: profile.ownerName.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          gstin: profile.gstin.trim().toUpperCase(),
          website: profile.website?.trim() || '',
          logo: finalLogoUrl,
        }

        try {
          const res = await api.post('/settings/profile', payload)
          if (res.success) {
            showToast('Business profile updated successfully', 'success')
            setProfile(prev => ({ ...prev, ...payload, logo: finalLogoUrl }))
            setProfileSnapshot({ ...profile, ...payload, logo: finalLogoUrl })
            updateCompanyProfile(payload)
            
            if (pendingLogoPreviewUrl) {
              URL.revokeObjectURL(pendingLogoPreviewUrl)
              setPendingLogoPreviewUrl(null)
            }
            setPendingLogoFile(null)
            
            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            setSavedAt(nowTime)

            profileDraft.discardDraft().catch(() => {})
            setProfileDraftBanner(null)

            // Refetch to get updated completion score from backend
            fetchProfile().catch(() => {})
            return true
          } else {
            showToast(res.message || 'Failed to save business profile', 'error')
            return false
          }
        } catch (err) {
          analytics.track('profile.save.failed', { stage: 'profile_update', error: err.message })
          showToast(err.message || 'Failed to save business profile', 'error')
          return false
        }
      }
    })
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

  const fetchVendors = async (signal) => {
    try {
      const res = await api.get('/vendors', { signal })
      if (!signal || !signal.aborted) {
        setVendors(res)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        showToast('Failed to load vendors', 'error')
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchVendors(controller.signal)
    return () => controller.abort()
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

  const fetchFinanciers = async (signal) => {
    try {
      const res = await api.get('/financiers', { signal })
      if (!signal || !signal.aborted) {
        setFinanciers(res)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        showToast('Failed to load financiers', 'error')
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchFinanciers(controller.signal)
    return () => controller.abort()
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

  const fetchLoans = async (signal) => {
    try {
      const res = await api.get('/loans', { signal })
      if (!signal || !signal.aborted) {
        setLoans(res)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        showToast('Failed to load loans', 'error')
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchLoans(controller.signal)
    return () => controller.abort()
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
  const [banks, setBanks] = useState(['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'PNB', 'Kotak Bank'])
  const [bankInput, setBankInput] = useState('')
  const [editingBankIndex, setEditingBankIndex] = useState(-1)
  const [editingBankValue, setEditingBankValue] = useState('')

  useEffect(() => {
    if (profile) {
      if (profile.banks && Array.isArray(profile.banks) && profile.banks.length > 0) {
        setBanks(profile.banks)
      } else {
        const defaultBanks = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'PNB', 'Kotak Bank']
        setBanks(defaultBanks)
        api.post('/settings/profile', { banks: defaultBanks }).catch(() => {})
      }
    }
  }, [profile])

  const saveBanksToStorage = async (newBanks) => {
    setBanks(newBanks)
    try {
      await api.post('/settings/profile', { banks: newBanks })
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
  const [paymentModes, setPaymentModes] = useState([
    { name: 'Bank Transfer', enabled: true },
    { name: 'Cheque', enabled: true },
    { name: 'Cash', enabled: true },
    { name: 'UPI', enabled: true },
    { name: 'NEFT / RTGS', enabled: true }
  ])
  const [modeInput, setModeInput] = useState('')
  const [editingModeIndex, setEditingModeIndex] = useState(-1)
  const [editingModeValue, setEditingModeValue] = useState('')

  useEffect(() => {
    if (profile) {
      if (profile.paymentModes && Array.isArray(profile.paymentModes) && profile.paymentModes.length > 0) {
        setPaymentModes(profile.paymentModes)
      } else {
        const defaultModes = [
          { name: 'Bank Transfer', enabled: true },
          { name: 'Cheque', enabled: true },
          { name: 'Cash', enabled: true },
          { name: 'UPI', enabled: true },
          { name: 'NEFT / RTGS', enabled: true }
        ]
        setPaymentModes(defaultModes)
        // Automatically save default payment modes if missing in DB
        api.post('/settings/profile', { paymentModes: defaultModes }).catch(() => {})
      }
    }
  }, [profile])

  const saveModesToStorage = async (newModes) => {
    setPaymentModes(newModes)
    try {
      const res = await api.post('/settings/profile', { paymentModes: newModes })
      if (res && res.data) {
        setProfile(prev => ({ ...prev, paymentModes: res.data.paymentModes || newModes }))
      }
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
    const target = paymentModes[idx]
    if (!target) return
    const updated = paymentModes.map((m, i) => i === idx ? { ...m, enabled: !m.enabled } : m)
    saveModesToStorage(updated)
    showToast(`Payment mode "${target.name}" ${!target.enabled ? 'enabled' : 'disabled'}`)
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
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'Viewer' })

  useEffect(() => {
    if (profile && profile.usersList) {
      setUsers(profile.usersList)
    }
  }, [profile])

  const saveUsersToStorage = async (newUsers) => {
    setUsers(newUsers)
    try {
      await api.post('/settings/profile', { usersList: newUsers })
    } catch (err) {
      showToast('Failed to save users list to database', 'error')
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    const name = inviteForm.name.trim()
    const email = inviteForm.email.trim().toLowerCase()
    const password = inviteForm.password?.trim()

    if (!name || !email) {
      showToast('User name and email address are required', 'error')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password: password || undefined,
        role: inviteForm.role || 'Viewer'
      })

      const registeredUser = res.user || res.data?.user || {}
      const newUser = {
        id: registeredUser.id || String(Date.now()),
        name: registeredUser.name || name,
        email: registeredUser.email || email,
        role: registeredUser.role || inviteForm.role || 'Viewer',
        status: 'Active'
      }

      const updated = [...users.filter(u => u.email !== email), newUser]
      saveUsersToStorage(updated)
      setShowInviteModal(false)
      setInviteForm({ name: '', email: '', password: '', role: 'Viewer' })

      const emailSent = res.emailSent || res.data?.emailSent
      const emailNote = emailSent ? 'Invitation email sent' : 'Account created'
      showToast(`User ${name} invited successfully (${emailNote})`)
      fetchProfile()
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to create user account'
      showToast(msg, 'error')
    }
  }

  const handleChangeUserRole = async (id, newRole) => {
    try {
      await api.patch(`/auth/users/${id}/role`, { role: newRole })
      showToast('User role updated')
      fetchProfile()
    } catch (err) {
      showToast(err.message || 'Failed to update user role', 'error')
    }
  }

  const handleDeleteUser = async (u) => {
    const admins = users.filter(usr => usr.role === 'Admin')
    if (u.role === 'Admin' && admins.length <= 1) {
      showToast('Cannot delete the last remaining Admin user', 'error')
      return
    }

    if (await confirm(`Are you sure you want to remove user ${u.name}?`, { title: 'Remove User' })) {
      try {
        await api.delete(`/auth/users/${u.id}`)
        showToast('User removed successfully')
        fetchProfile()
      } catch (err) {
        showToast(err.message || 'Failed to remove user', 'error')
      }
    }
  }

  // --- TAB 8: Data & Backups ---
  const [importSummary, setImportSummary] = useState(null)
  const [importData, setImportData] = useState(null)
  const fileInputRef = useRef(null)

  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreError, setRestoreError] = useState('')
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [parsedRestoreData, setParsedRestoreData] = useState(null)
  const restoreFileInputRef = useRef(null)

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

      const todayStr = new Date().toISOString().split('T')[0]
      const fileName = `Vastrams_Financial_Backup_${todayStr}.xlsx`
      XLSX.writeFile(wb, fileName)
      showToast('Excel Export completed successfully!')
    } catch (error) {
      console.error('Excel export error:', error)
      showToast('Excel Export failed: ' + error.message, 'error')
    }
  }

  const handleRestoreFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setRestoreFile(null)
    setRestoreError('')
    setParsedRestoreData(null)

    // Client-side extension validation
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.xlsx' && ext !== '.xls') {
      setRestoreError("Only Excel files (.xlsx, .xls) are accepted")
      return
    }

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

        parsed.settings = parseSheet('Settings')[0] || {}
        parsed.vendors = parseSheet('Vendors')
        parsed.financiers = parseSheet('Financiers')
        parsed.loans = parseSheet('Loans')
        parsed.bills = parseSheet('Bills')
        parsed.payments = parseSheet('Payments')
        parsed.repayments = parseSheet('Repayments')
        parsed.cheques = parseSheet('Cheques')
        parsed.transactions = parseSheet('Transactions')

        setParsedRestoreData(parsed)
        setRestoreFile(file)
      } catch (err) {
        console.error('Restore parsing error:', err)
        setRestoreError("Invalid Excel file format or structure")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirmRestore = async () => {
    if (!restoreFile || !parsedRestoreData) return
    try {
      setRestoreLoading(true)
      const formData = new FormData()
      formData.append('backup', restoreFile)
      formData.append('data', JSON.stringify(parsedRestoreData))

      const res = await api.post('/settings/backup/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (res.success) {
        showToast('Data restored successfully')
        setShowRestoreModal(false)
        setRestoreFile(null)
        setParsedRestoreData(null)
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = ''
        navigate('/') // redirect to dashboard!
      }
    } catch (err) {
      showToast(err.message || 'Failed to restore backup', 'error')
    } finally {
      setRestoreLoading(false)
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
          <div className="space-y-6 pb-24">
            <div className="border-b border-gray-200 dark:border-slate-800 pb-3 mb-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>Business Profile</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage corporate credentials, contact information, and branding assets</p>
            </div>

            {/* Draft restore banner */}
            {profileDraftBanner && (
              <div
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Unsaved profile draft available
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Saved {new Date(profileDraftBanner.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRestoreDraftClick}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Apply Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraftClick}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: 'transparent',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {profileLoading ? (
              /* Loading Skeleton Shimmer */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-4 space-y-4">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-44 w-full rounded-xl" />
                </div>
                <div className="md:col-span-8 space-y-6">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </div>
            ) : (
              <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* ── LEFT COLUMN (Fixed 4 Cols): Completion Card + Logo Uploader ── */}
                <div className="md:col-span-4 space-y-4">
                  <ProfileCompletionCard
                    completion={completion}
                    onFieldClick={handleFieldFocusClick}
                  />

                  <div
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <h3 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                      Company Logo
                    </h3>
                    <LogoUploader
                      currentLogoUrl={profile.logo}
                      pendingPreviewUrl={pendingLogoPreviewUrl}
                      onFileSelect={handleLogoFileSelect}
                      onRemove={handleRemoveLogo}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* ── RIGHT COLUMN (8 Cols): Form Sections ── */}
                <div className="md:col-span-8 space-y-8">
                  
                  {/* Section 1: Business Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Identity</h3>
                    <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="businessName"
                          value={profile.businessName}
                          onChange={handleProfileChange}
                          placeholder="e.g. Vastrams Textiles Ltd"
                          aria-required="true"
                          aria-describedby={profileErrors.businessName ? "businessName-error" : undefined}
                          style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                          className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                        {profileErrors.businessName && (
                          <p id="businessName-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                            {profileErrors.businessName}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                            GSTIN Number <span className="text-red-500">*</span>
                          </label>
                          {profile.gstin && <CopyButton value={profile.gstin} label="Copy GSTIN" />}
                        </div>
                        <input
                          type="text"
                          name="gstin"
                          value={profile.gstin}
                          onChange={handleProfileChange}
                          placeholder="e.g. 24AAAAA0000A1Z0"
                          aria-required="true"
                          aria-describedby={profileErrors.gstin ? "gstin-error" : undefined}
                          style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                          className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono uppercase"
                        />
                        {profileErrors.gstin && (
                          <p id="gstin-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                            {profileErrors.gstin}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Credentials</h3>
                    <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Owner Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="ownerName"
                          value={profile.ownerName}
                          onChange={handleProfileChange}
                          placeholder="Owner name"
                          aria-required="true"
                          aria-describedby={profileErrors.ownerName ? "ownerName-error" : undefined}
                          style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                          className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                        {profileErrors.ownerName && (
                          <p id="ownerName-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                            {profileErrors.ownerName}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                            Email <span className="text-red-500">*</span>
                          </label>
                          {profile.email && <CopyButton value={profile.email} label="Copy email" />}
                        </div>
                        <input
                          type="email"
                          name="email"
                          autoComplete="off"
                          data-lpignore="true"
                          data-form-type="other"
                          value={profile.email}
                          onChange={handleProfileChange}
                          placeholder="email@company.com"
                          aria-required="true"
                          aria-describedby={profileErrors.email ? "email-error" : undefined}
                          style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                          className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                        {profileErrors.email && (
                          <p id="email-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                            {profileErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          {profile.phone && <CopyButton value={profile.phone} label="Copy phone" />}
                        </div>
                        <input
                          type="text"
                          name="phone"
                          autoComplete="off"
                          data-lpignore="true"
                          data-form-type="other"
                          value={profile.phone}
                          onChange={handleProfileChange}
                          placeholder="9876543210"
                          aria-required="true"
                          aria-describedby={profileErrors.phone ? "phone-error" : undefined}
                          style={{
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                          className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                        />
                        {profileErrors.phone && (
                          <p id="phone-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                            {profileErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Address */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Corporate Address</h3>
                    <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Full Registered Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="address"
                        rows={3}
                        value={profile.address}
                        onChange={handleProfileChange}
                        placeholder="Enter registered corporate address"
                        aria-required="true"
                        aria-describedby={profileErrors.address ? "address-error" : undefined}
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-strong)',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px'
                        }}
                        className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
                      />
                      {profileErrors.address && (
                        <p id="address-error" role="alert" className="text-[11px] text-red-500 mt-1 font-medium">
                          {profileErrors.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Online Presence */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Online Presence</h3>
                    <div className="h-[1px] bg-gray-200 dark:bg-slate-800" />
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Official Website
                      </label>
                      <input
                        type="text"
                        name="website"
                        value={profile.website}
                        onChange={handleProfileChange}
                        placeholder="e.g. https://www.company.com"
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border-strong)',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px'
                        }}
                        className="w-full px-3 py-2 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                      />
                    </div>
                  </div>

                </div>
              </form>
            )}
          </div>
        )

      case 'vendors':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Vendors Management</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Administer vendor directory listings, categories, and credit parameters</p>
              </div>
              <button onClick={handleOpenAddVendor} className="px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <span>Add Vendor</span>
              </button>
            </div>

            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search vendors..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>

            {filteredVendors.length === 0 ? (
              vendors.length === 0 ? (
                <EmptyState icon="store" title="No Vendors Yet" description="Add your first vendor to manage them here" action={{ label: "Add Vendor", onClick: handleOpenAddVendor }} />
              ) : (
                <EmptyState icon="search" title="No Results" description="No vendors match your search keywords" />
              )
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">GSTIN</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map(v => (
                      <tr key={v._id} className="transition-colors text-sm" style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{v.name}</td>
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
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Financiers Management</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Administer financier profiles, lenders, and interest parameters</p>
              </div>
              <button onClick={handleOpenAddFinancier} className="px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <span>Add Financier</span>
              </button>
            </div>

            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" placeholder="Search financiers..." value={financierSearch} onChange={e => setFinancierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>

            {filteredFinanciers.length === 0 ? (
              financiers.length === 0 ? (
                <EmptyState icon="bank" title="No Financiers Yet" description="Add your first financier to manage them here" action={{ label: "Add Financier", onClick: handleOpenAddFinancier }} />
              ) : (
                <EmptyState icon="search" title="No Results" description="No financiers match your search keywords" />
              )
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Address</th>
                      <th className="px-4 py-2.5">Rate (%)</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFinanciers.map(f => (
                      <tr key={f._id} className="transition-colors text-sm" style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{f.name}</td>
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
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Loan Management</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Edit parameters, toggle statuses, and audit loan details across financiers</p>
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
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
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
                  <tbody>
                    {filteredLoans.map(l => {
                      const isClosed = l.status.toUpperCase() === 'SETTLED'
                      return (
                        <tr key={l._id} className="transition-colors text-sm" style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{l.noteNumber || l.loanReference}</td>
                          <td className="px-4 py-3">{l.financierId?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono">{formatDate(l.date || l.drawdownDate)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(l.amount || l.principalAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">{formatCurrency(l.paid || l.paidPrincipal || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-orange-500 tabular-nums">{formatCurrency(l.outstanding || l.outstandingPrincipal || 0)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={!isClosed ? 'success' : 'neutral'}>
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
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Cheque Banks</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Manage the list of active banking partners loaded in cheque forms</p>
            </div>

            {banks.length === 0 ? (
              <EmptyState icon="bank" title="No Banks Added" description="Add a bank to use it in the cheque registry" />
            ) : (
              <div className="overflow-x-auto rounded-lg max-w-md" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="px-4 py-2.5">Bank Name</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.map((b, idx) => (
                      <tr key={b || idx} className="transition-colors text-sm" style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                              className="px-2 py-1 text-sm rounded w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {editingBankIndex === idx ? (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleSaveEditBank(idx)} className="text-xs font-bold text-brand-primary">Save</button>
                              <button onClick={() => setEditingBankIndex(-1)} className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>Cancel</button>
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
                className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
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
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Payment Modes</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Enable, disable, or declare custom payment types used in transactions</p>
            </div>

            {paymentModes.length === 0 ? (
              <EmptyState icon="wallet" title="No Payment Modes" description="Add a payment mode to use it across the app" />
            ) : (
              <div className="overflow-x-auto rounded-lg max-w-lg" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="px-4 py-2.5">Mode Name</th>
                      <th className="px-4 py-2.5">Enabled</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentModes.map((m, idx) => (
                      <tr key={m.name || idx} className="transition-colors text-sm" style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                              className="px-2 py-1 text-sm rounded w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{m.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleMode(idx)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              m.enabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                            role="switch"
                            aria-checked={m.enabled}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              m.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {editingModeIndex === idx ? (
                            <div className="inline-flex space-x-2">
                              <button onClick={() => handleSaveEditMode(idx)} className="text-xs font-bold text-brand-primary">Save</button>
                              <button onClick={() => setEditingModeIndex(-1)} className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>Cancel</button>
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
                className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
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
              <button onClick={() => setShowInviteModal(true)} className="px-3 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                <span>Invite User</span>
              </button>
            </div>

            {users.length === 0 ? (
              <EmptyState icon="user" title="No Users Found" description="Invite a user to give them access to Vastrams" />
            ) : (
              <div className="overflow-x-auto rounded-lg max-w-2xl" style={{ border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="transition-colors text-sm" style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{u.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <DropdownSelect
                            value={u.role}
                            onChange={val => handleChangeUserRole(u.id, val)}
                            options={[
                              { value: 'Admin', label: 'Admin' },
                              { value: 'Viewer', label: 'Viewer' }
                            ]}
                            className="w-28 text-xs"
                          />
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
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Export Data</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Download full snapshots of vendors, loans, checks, and settings</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button onClick={handleExportExcel} className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 transition-colors">
                  <Database size={14} />
                  <span>Export as Excel</span>
                </button>
              </div>
            </div>

            {/* Restore from Backup Section */}
            <div className="space-y-4 pt-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>Restore from Backup</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Restore the application data from a previously exported Excel backup file</p>
              </div>

              <div className="max-w-md space-y-4">
                <div className="border border-dashed rounded-lg p-5" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Upload size={20} className="text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>Upload Excel backup file</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Only Excel files (.xlsx, .xls) are accepted</p>
                    </div>
                    <label className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-opacity" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      <Upload size={12} />
                      <span>Choose File</span>
                      <input 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={handleRestoreFileChange}
                        ref={restoreFileInputRef}
                        className="hidden"
                      />
                    </label>
                    {restoreFile && (
                      <div className="text-left w-full border-t border-slate-800 pt-3 mt-2 space-y-1">
                        <p className="text-[10px] font-mono truncate max-w-full" style={{ color: 'var(--color-text-secondary)' }}>
                          <strong>File:</strong> {restoreFile.name}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          <strong>Size:</strong> {(restoreFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    )}
                    {restoreError && (
                      <p className="text-[10px] font-semibold text-red-500 mt-1">{restoreError}</p>
                    )}
                  </div>
                </div>

                {restoreFile && parsedRestoreData && !restoreError && (
                  <div className="p-3 rounded-lg text-xs space-y-3 flex items-center justify-between" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)' }}>
                    <div style={{ color: 'var(--color-primary)' }}>
                      <p className="font-semibold">Ready to restore data snapshot:</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {parsedRestoreData.vendors?.length || 0} vendors · {parsedRestoreData.bills?.length || 0} bills · {parsedRestoreData.loans?.length || 0} loans
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowRestoreModal(true)} 
                      className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Restore
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
          confirm={confirm}
          showToast={showToast}
        />

      case 'about':
        return (
          <div style={{ maxWidth: '640px' }}>
            {/* Dark hero card */}
            <div style={{
              background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 60%, #0a1628 100%)',
              borderRadius: '20px',
              padding: '40px 36px',
              border: '1px solid rgba(0,200,150,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '24px',
            }}>
              {/* Radial glow */}
              <div style={{
                position: 'absolute', top: '-60px', right: '-60px',
                width: '260px', height: '260px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,200,150,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Brand mark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #00C896, #00A87E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', fontWeight: 900, color: '#fff',
                    fontFamily: 'var(--font-display)',
                    boxShadow: '0 4px 20px rgba(0,200,150,0.35)',
                  }}>V</div>
                  <div>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>Vastrams</p>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Vendor & Finance</p>
                  </div>
                </div>

                {/* Tagline */}
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  Enterprise ledger management, automated FIFO payables reconciliation,<br />
                  and lender notes tracker — built for India's fast-moving trade.
                </p>

                {/* Version badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Version', value: 'v1.0.0' },
                    { label: 'Build', value: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
                    { label: 'Environment', value: 'Production' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      padding: '6px 14px',
                      borderRadius: '99px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tech stack section */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Built With</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { name: 'React 18', color: '#61dafb', bg: 'rgba(97,218,251,0.08)' },
                  { name: 'Vite', color: '#646cff', bg: 'rgba(100,108,255,0.08)' },
                  { name: 'Tailwind CSS', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
                  { name: 'Node.js', color: '#74c14d', bg: 'rgba(116,193,77,0.08)' },
                  { name: 'Express.js', color: '#aaa', bg: 'rgba(170,170,170,0.08)' },
                  { name: 'MongoDB', color: '#00ed64', bg: 'rgba(0,237,100,0.08)' },
                ].map(({ name, color, bg }) => (
                  <span key={name} style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: bg,
                    color: color,
                    border: `1px solid ${color}22`,
                  }}>{name}</span>
                ))}
              </div>
            </div>

            {/* Check updates + copyright */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={checkUpdates}
                style={{
                  padding: '9px 20px',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,200,150,0.25)',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Check for Updates
              </button>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>
                Developed for Vastrams Accounts Division &copy; 2026. All Rights Reserved.
              </p>
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
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'banks', label: 'Cheque Banks', icon: Building2 },
        { id: 'paymentModes', label: 'Payment Modes', icon: CreditCard },
        { id: 'vendors', label: 'Vendors Master', icon: Store },
        { id: 'financiers', label: 'Financiers Master', icon: Building2 },
        { id: 'loans', label: 'Loan Manager', icon: Coins },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'backups', label: 'Data & Backups', icon: Database },
        { id: 'about', label: 'About', icon: Info },
      ]
    }
  ]

  return (
    <div className="space-y-6 pt-2 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure system parameters, manage profile details, and maintain backups</p>
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
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold w-full transition-all text-left ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
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
          <div className="rounded-xl border max-w-lg w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {vendorModalMode === 'add' ? 'Add New Vendor' : 'Edit Vendor Parameters'}
              </h3>
              <button onClick={() => setShowVendorModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Vendor Name *</label>
                  <input type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Vendor Type</label>
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
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Phone Number</label>
                  <input type="text" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                  <input type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>GSTIN</label>
                  <input type="text" value={vendorForm.gstin} onChange={e => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Opening Balance</label>
                  <input type="number" value={vendorForm.openingBalance} onChange={e => setVendorForm({ ...vendorForm, openingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
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
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Address</label>
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
          <div className="rounded-xl border max-w-lg w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
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
          <div className="rounded-xl border max-w-sm w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Edit Loan parameters</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Note Number *</label>
                  <input type="text" value={loanForm.noteNumber} onChange={e => setLoanForm({ ...loanForm, noteNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Loan Date</label>
                  <CustomDatePicker
                    value={loanForm.date}
                    onChange={val => setLoanForm({ ...loanForm, date: val })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Loan Amount *</label>
                  <input type="number" value={loanForm.amount} onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Notes</label>
                  <textarea rows={2} value={loanForm.notes} onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none" />
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
          <div className="rounded-xl border max-w-sm w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Invite New User</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>User Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="user@company.com"
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Initial Password <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    value={inviteForm.password || ''}
                    onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                    placeholder="Default: Vastrams@123"
                    className="w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Access Role</label>
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
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET MODAL 1 --- */}
      {showResetModal1 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-xl border max-w-sm w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
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

      {/* --- RESTORE MODAL --- */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide">Confirm Database Restore</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This will overwrite all current data. This cannot be undone. Are you sure?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowRestoreModal(false)} 
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmRestore} 
                disabled={restoreLoading}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {restoreLoading ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'profile' && (
        <StickySaveBar
          isDirty={isDirty}
          isSaving={isSaving}
          savedAt={savedAt}
          changedFieldCount={formDiffResult.count}
          changedFieldNames={formDiffResult.changedFields}
          onSave={saveProfile}
          onDiscard={handleDiscardProfile}
          onWhatChanged={() => {
            requestSaveConfirmation({
              title: 'Form Changes Summary',
              message: 'Review modified fields below.',
              initialValues: profileSnapshot,
              currentValues: profile,
              labelMap: {
                businessName: 'Business Name',
                ownerName: 'Owner Name',
                email: 'Email',
                phone: 'Phone',
                address: 'Address',
                gstin: 'GSTIN',
                website: 'Website',
                logo: 'Logo'
              },
              onSaveApi: async () => true // Read-only diff preview
            })
          }}
        />
      )}
      <SaveConfirmationModal {...confirmConfig} isSaving={isSaving} />
    </div>
  )
}

export default Settings
