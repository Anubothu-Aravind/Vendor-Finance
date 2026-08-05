import React, { useState, useEffect, useReducer, useCallback, useMemo } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toInputDate, fromInputDate, getTodayFormatted } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import PartyTypeBadge from '../components/ui/PartyTypeBadge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useDirtyStateContext } from '../context/DirtyStateContext'
import { useSaveConfirmation } from '../hooks/useSaveConfirmation'
import { SaveConfirmationModal } from '../components/ui/SaveConfirmationModal'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// Map backend status to display
const BE_STATUS_MAP = {
  PENDING: 'Pending',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
  CANCELLED: 'deposited', // using 'deposited' as closest for cancelled/deposited
}
const FE_STATUS_MAP = {
  Pending: 'PENDING',
  cleared: 'CLEARED',
  bounced: 'BOUNCED',
  deposited: 'CANCELLED',
}

// Map cheque type frontend -> backend
const BE_TYPE_MAP = {
  Vendor: 'ISSUED_VENDOR',
  Financier: 'ISSUED_FINANCIER',
}

export function ChequeRegistry() {
  const toast = useToast()
  const confirm = useConfirm()
  const [banks, setBanks] = useState([])

  const [cheques, setCheques] = useState([])
  const [vendors, setVendors] = useState([])
  const [financiers, setFinanciers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedCheque, setSelectedCheque] = useState(null)

  const emptyForm = {
    chequeNo: '',
    date: getTodayFormatted(),
    amount: '',
    bank: '',
    partyType: '',
    party: '',
    partyId: '',
    status: '',
    remarks: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(emptyForm)
  const { confirmNavigation } = useDirtyStateContext()
  const { confirmConfig, isSaving, requestSaveConfirmation } = useSaveConfirmation()

  const isFormDirty = useMemo(() => {
    if (!showModal || modalMode === 'preview') return false
    return (
      (form.chequeNo || '') !== (initialFormSnapshot.chequeNo || '') ||
      (form.date || '') !== (initialFormSnapshot.date || '') ||
      (form.amount || '') !== (initialFormSnapshot.amount || '') ||
      (form.bank || '') !== (initialFormSnapshot.bank || '') ||
      (form.partyType || '') !== (initialFormSnapshot.partyType || '') ||
      (form.party || '') !== (initialFormSnapshot.party || '') ||
      (form.status || '') !== (initialFormSnapshot.status || '') ||
      (form.remarks || '') !== (initialFormSnapshot.remarks || '')
    )
  }, [showModal, modalMode, form, initialFormSnapshot])

  const closeModal = useCallback(() => {
    confirmNavigation(() => {
      setShowModal(false)
      setForm(emptyForm)
    })
  }, [confirmNavigation])

  useDirtyForm({
    id: 'cheque-registry-form',
    title: modalMode === 'add' ? 'Add Cheque Form' : 'Edit Cheque Form',
    isDirty: isFormDirty,
    onSave: () => handleSave(),
    onDiscard: () => setForm(emptyForm)
  })

  const fetchData = async (signal) => {
    try {
      setLoading(true)
      const [chequesData, vendorsData, financiersData, profileRes] = await Promise.all([
        api.get('/cheques', { signal }),
        api.get('/vendors', { signal }),
        api.get('/financiers', { signal }),
        api.get('/settings/profile', { signal })
      ])

      const mapped = chequesData.map((c, idx) => ({
        id: c._id,
        chequeNo: c.chequeNumber,
        date: c.chequeDate ? fromInputDate(c.chequeDate.split('T')[0]) : '—',
        amount: c.amount,
        bank: c.vendorId?.bank || c.financierId?.bank || '—',
        partyType: c.type === 'ISSUED_VENDOR' ? 'Vendor' : 'Financier',
        partyId: c.vendorId?._id || c.financierId?._id || '',
        party: c.partyName || (c.vendorId?.name) || (c.financierId?.name) || '—',
        status: BE_STATUS_MAP[c.status] || 'Pending',
        remarks: c.bounceReason || '—',
        idx,
      }))

      if (!signal || !signal.aborted) {
        setCheques(mapped)
        setVendors(vendorsData)
        setFinanciers(financiersData)
        if (profileRes && profileRes.data) {
          setBanks(profileRes.data.banks || [])
        }
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to load cheques')
      }
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchData()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setInitialFormSnapshot(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (c) => {
    setSelectedCheque(c)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (c) => {
    const editObj = { ...c }
    setSelectedCheque(c)
    setForm(editObj)
    setInitialFormSnapshot(editObj)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = (e) => {
    if (e) e.preventDefault()
    const amt = Number(form.amount) || 0

    if (modalMode === 'add') {
      if (!form.chequeNo || form.chequeNo.length !== 6) {
        toast('Cheque number must be exactly 6 digits', 'error')
        return
      }
    }

    requestSaveConfirmation({
      title: modalMode === 'add' ? 'Confirm Add Cheque' : 'Confirm Update Cheque Status',
      message: `You are about to save changes for Cheque #${form.chequeNo || 'New'}.`,
      initialValues: initialFormSnapshot,
      currentValues: form,
      labelMap: {
        chequeNo: 'Cheque Number',
        date: 'Cheque Date',
        amount: 'Cheque Amount',
        bank: 'Bank Name',
        partyType: 'Party Type',
        party: 'Payee / Party',
        status: 'Cheque Status',
        remarks: 'Remarks'
      },
      onSaveApi: async () => {
        const partyOptions = form.partyType === 'Vendor' ? vendors : financiers
        const partyRecord = partyOptions.find(p => p.name === form.party || p._id === form.partyId)

        const payload = {
          chequeNumber: form.chequeNo,
          chequeDate: toInputDate(form.date),
          amount: amt,
          bankName: form.bank,
          payeeName: form.party,
          partyType: form.partyType === 'Vendor' ? 'VENDOR' : 'FINANCIER',
          partyId: partyRecord?._id || form.partyId,
          type: 'ISSUED',
          status: 'PENDING',
          notes: form.remarks
        }

        const FE_STATUS_MAP = {
          'Cleared': 'CLEARED',
          'Pending': 'PENDING',
          'Bounced': 'BOUNCED',
          'Cancelled': 'CANCELLED'
        }

        try {
          if (modalMode === 'add') {
            await api.post('/cheques', payload)
          } else {
            const beStatus = FE_STATUS_MAP[form.status] || 'PENDING'
            await api.patch(`/cheques/${selectedCheque.id}/status`, { status: beStatus })
          }
          await fetchData()
          setShowModal(false)
          setForm(emptyForm)
          toast(modalMode === 'add' ? 'Cheque registered successfully' : 'Cheque status updated successfully', 'success')
        } catch (err) {
          toast(err.message || 'Failed to save cheque', 'error')
          return false
        }
      }
    })
  }

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this cheque record? This action cannot be undone.', { title: 'Delete Cheque' })) {
      try {
        await api.delete(`/cheques/${id}`)
        await fetchData()
      } catch (err) {
        toast(err.message || 'Failed to delete cheque', 'error')
      }
    }
  }

  const partyOptions = form.partyType === 'Vendor'
    ? vendors.map(v => ({ value: v.name, label: toTitleCase(v.name) }))
    : form.partyType === 'Financier'
      ? financiers.map(f => ({ value: f.name, label: toTitleCase(f.name) }))
      : []

  const tableContainerRef = React.useRef(null)

  const filtered = cheques.filter(c => {
    const matchSearch = c.chequeNo.includes(search) || (c.party || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All Status' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const pagination = usePagination({
    items: filtered,
    moduleKey: 'cheques',
    initialPageSize: 20,
    filterDependencies: [search, statusFilter],
    containerRef: tableContainerRef
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cheque Registry</h1>
          <p className="text-sm text-gray-400 mt-0.5">{cheques.length} cheques registered</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Add Cheque</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error} — <button onClick={fetchData} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="flex gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="flex-1 h-[72px] rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
            <p className="text-xs text-gray-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-orange-500">{cheques.filter(c => c.status === 'Pending').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
            <p className="text-xs text-gray-400 mb-1">Deposited/Cancelled</p>
            <p className="text-2xl font-bold text-blue-500">{cheques.filter(c => c.status === 'deposited').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
            <p className="text-xs text-gray-400 mb-1">Cleared</p>
            <p className="text-2xl font-bold text-green-600">{cheques.filter(c => c.status === 'cleared').length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
            <p className="text-xs text-gray-400 mb-1">Bounced</p>
            <p className="text-2xl font-bold text-red-500">{cheques.filter(c => c.status === 'bounced').length}</p>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center space-x-3">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search cheques..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="w-48">
            <DropdownSelect
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={['All Status', 'Pending', 'deposited', 'bounced', 'cleared'].map(s => ({ value: s, label: toTitleCase(s) }))}
            />
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3">CHEQUE NO.</th>
                  <th className="text-left px-5 py-3">CHEQUE DATE</th>
                  <th className="text-right px-5 py-3">AMOUNT</th>
                  <th className="text-left px-5 py-3">BANK NAME</th>
                  <th className="text-left px-5 py-3">PARTY TYPE</th>
                  <th className="text-left px-5 py-3">PARTY</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                  <th className="text-left px-5 py-3">REMARKS</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={9} widths={["w-16", "w-20", "w-16", "w-28", "w-16", "w-32", "w-12", "w-24", "w-8"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {cheques.length === 0 ? (
              <EmptyState
                icon="cheque"
                title="No Cheques Registered"
                description="Register a new cheque to start tracking clearing statuses"
                action={{ label: 'Add Cheque', onClick: handleOpenAdd }}
              />
            ) : (
              <EmptyState
                icon="search"
                title="No Cheques Match"
                description="Try adjusting your filters"
              />
            )}
          </div>
        ) : (
          <>
            <div ref={tableContainerRef} className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">CHEQUE NO.</th>
                    <th className="text-left px-5 py-3">CHEQUE DATE</th>
                    <th className="text-right px-5 py-3">AMOUNT</th>
                    <th className="text-left px-5 py-3">BANK NAME</th>
                    <th className="text-left px-5 py-3">PARTY TYPE</th>
                    <th className="text-left px-5 py-3">PARTY</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                    <th className="text-left px-5 py-3">REMARKS</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                  {pagination.paginatedItems.map((c, i) => (
                    <motion.tr 
                      key={c._id || c.id} 
                      onClick={() => handleOpenPreview(c)} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">{c.chequeNo}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">{c.date}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums">₹{fmt(c.amount)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{c.bank !== '—' ? toTitleCase(c.bank) : '—'}</td>
                      <td className="px-5 py-3.5 text-xs">
                        <PartyTypeBadge type={c.partyType} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-800 dark:text-gray-100 font-medium">{toTitleCase(c.party)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={
                          c.status?.toLowerCase() === 'cleared' ? 'success' :
                          c.status?.toLowerCase() === 'pending' ? 'warning' :
                          c.status?.toLowerCase() === 'deposited' ? 'info' : 'danger'
                        }>
                          {toTitleCase(c.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 italic truncate max-w-[150px]">{c.remarks || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(c); }} className="text-xs text-gray-500 hover:text-brand-primary font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            View
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }} className="text-xs text-gray-500 hover:text-brand-primary font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} isLoading={loading} />
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-[480px] rounded-xl border shadow-xl p-6" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {modalMode === 'add' ? 'Add Cheque' : modalMode === 'edit' ? 'Update Cheque Status' : 'Cheque Details Preview'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Cheque Number</label>
                    <p className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedCheque?.chequeNo}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Cheque Date</label>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{selectedCheque?.date}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Amount</label>
                    <p className="text-brand-primary font-bold tabular-nums">₹{fmt(selectedCheque?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Bank Name</label>
                    <p style={{ color: 'var(--color-text-primary)' }}>{selectedCheque?.bank !== '—' ? toTitleCase(selectedCheque?.bank) : '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Party Type</label>
                    <PartyTypeBadge type={selectedCheque?.partyType} />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Party Name</label>
                    <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{toTitleCase(selectedCheque?.party)}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                    <div className="mt-0.5">
                      <Badge variant={
                        selectedCheque?.status?.toLowerCase() === 'cleared' ? 'success' :
                        selectedCheque?.status?.toLowerCase() === 'pending' ? 'warning' :
                        selectedCheque?.status?.toLowerCase() === 'deposited' ? 'info' : 'danger'
                      }>
                        {toTitleCase(selectedCheque?.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>Remarks</label>
                    <p style={{ color: 'var(--color-text-primary)' }}>{selectedCheque?.remarks || '—'}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t mt-6" style={{ borderColor: 'var(--color-border)' }}>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary/95">Close</button>
                </div>
              </div>
            ) : modalMode === 'edit' ? (
              /* Edit mode — only allow updating status */
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>Cheque <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedCheque?.chequeNo}</span> — ₹{fmt(selectedCheque?.amount || 0)} — {toTitleCase(selectedCheque?.party)}</p>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Update Status</label>
                  <DropdownSelect
                    value={form.status}
                    onChange={val => setForm({...form, status: val})}
                    placeholder="Select Status"
                    options={[
                      { value: 'Pending', label: 'Pending' },
                      { value: 'deposited', label: 'Deposited / Cancelled' },
                      { value: 'bounced', label: 'Bounced' },
                      { value: 'cleared', label: 'Cleared' }
                    ]}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t mt-6" style={{ borderColor: 'var(--color-border)' }}>
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">Update Status</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Cheque Number * (6 digits)</label>
                    <input type="text" required pattern="\d{6}" maxLength={6} value={form.chequeNo} onChange={e => setForm({...form, chequeNo: e.target.value.replace(/[^0-9]/g, '').slice(0, 6)})}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none font-mono"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Cheque Date *</label>
                    <CustomDatePicker
                      value={form.date}
                      onChange={val => setForm({...form, date: val})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Amount *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Bank Name</label>
                    <DropdownSelect
                      value={form.bank}
                      onChange={val => setForm({...form, bank: val})}
                      placeholder="Select Bank"
                      options={banks.map(b => ({ value: b, label: toTitleCase(b) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Party Type</label>
                    <DropdownSelect
                      value={form.partyType}
                      onChange={val => setForm({...form, partyType: val, party: '', partyId: ''})}
                      placeholder="Select Party Type"
                      options={[
                        { value: 'Vendor', label: 'Vendor' },
                        { value: 'Financier', label: 'Financier' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Party Name</label>
                    <DropdownSelect
                      value={form.party}
                      onChange={val => setForm({...form, party: val})}
                      placeholder="Select Party"
                      options={partyOptions}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t mt-6" style={{ borderColor: 'var(--color-border)' }}>
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    Save Cheque
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <SaveConfirmationModal {...confirmConfig} isSaving={isSaving} />
    </div>
  )
}

export default ChequeRegistry
