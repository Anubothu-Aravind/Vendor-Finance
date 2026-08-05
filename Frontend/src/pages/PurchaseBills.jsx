import React, { useState, useEffect, useMemo, useReducer, useCallback } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X } from 'lucide-react'
import PrintPreviewModal from '../components/PrintPreviewModal'
import { toInputDate, fromInputDate, getTodayFormatted } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useDirtyStateContext } from '../context/DirtyStateContext'
import { useSaveConfirmation } from '../hooks/useSaveConfirmation'
import { SaveConfirmationModal } from '../components/ui/SaveConfirmationModal'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'

const initials = (name) => name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-pink-100 text-pink-700']

const statusStyle = {
  Paid: 'text-green-600 bg-green-50 border-green-200',
  Pending: 'text-gray-600 bg-gray-50 border-gray-200',
  Partial: 'text-orange-600 bg-orange-50 border-orange-200',
  Overdue: 'text-red-600 bg-red-50 border-red-200',
  'Due Today': 'text-amber-600 bg-amber-50 border-amber-200',
}

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// ── Fetch state reducer (defined at module scope for stable reference) ────────
const fetchInitial = { status: 'idle', bills: [], vendors: [], error: null }
function fetchReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':   return { ...state, status: 'loading', error: null }
    case 'FETCH_SUCCESS': return { status: 'success', bills: action.payload.bills, vendors: action.payload.vendors, error: null }
    case 'FETCH_ERROR':   return { ...state, status: 'error', error: action.payload }
    default:              return state
  }
}

export function PurchaseBills() {
  const toast = useToast()
  const confirm = useConfirm()

  // ── Fetch state: consolidated into one reducer to avoid impossible states ──
  const [fetchState, fetchDispatch] = useReducer(fetchReducer, fetchInitial)
  const { bills, vendors, status: fetchStatus, error } = fetchState
  const loading = fetchStatus === 'idle' || fetchStatus === 'loading'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedBill, setSelectedBill] = useState(null)
  const [printDoc, setPrintDoc] = useState(null)

  const emptyForm = {
    vendor: '',
    billNo: '',
    paymentType: '',
    customPaymentType: '',
    date: getTodayFormatted(),
    dueDate: getTodayFormatted(),
    amount: '',
    remarks: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(emptyForm)
  const { confirmNavigation } = useDirtyStateContext()
  const { confirmConfig, isSaving, requestSaveConfirmation } = useSaveConfirmation()

  const isFormDirty = useMemo(() => {
    if (!showModal || modalMode === 'preview') return false
    return (
      (form.vendor || '') !== (initialFormSnapshot.vendor || '') ||
      (form.billNo || '') !== (initialFormSnapshot.billNo || '') ||
      (form.paymentType || '') !== (initialFormSnapshot.paymentType || '') ||
      (form.customPaymentType || '') !== (initialFormSnapshot.customPaymentType || '') ||
      (form.date || '') !== (initialFormSnapshot.date || '') ||
      (form.dueDate || '') !== (initialFormSnapshot.dueDate || '') ||
      (form.amount || '') !== (initialFormSnapshot.amount || '') ||
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
    id: 'purchase-bill-form',
    title: modalMode === 'add' ? 'Add Purchase Bill Form' : 'Edit Purchase Bill Form',
    isDirty: isFormDirty,
    onSave: () => handleSave(),
    onDiscard: () => setForm(emptyForm)
  })

  // Sub-modal states for adding vendor inline
  const emptyVendorForm = {
    name: '',
    type: 'smallVendor',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    openingBalance: '',
    status: 'Active'
  }
  const [showAddVendorInline, setShowAddVendorInline] = useState(false)
  const [vendorForm, setVendorForm] = useState(emptyVendorForm)

  // ── Fetch bills + vendors ───────────────────────────────────────────────────
  // Wrapped in useCallback so the reference is stable across renders.
  const fetchBillsAndVendors = useCallback(async (signal) => {
    fetchDispatch({ type: 'FETCH_START' })
    try {
      const [billsData, vendorsData] = await Promise.all([
        api.get('/bills', signal ? { signal } : {}),
        api.get('/vendors', signal ? { signal } : {})
      ])

      const mapped = billsData.map(b => {
        const billDateStr = b.billDate ? fromInputDate(b.billDate.split('T')[0]) : ''
        const dueDateStr = b.dueDate ? fromInputDate(b.dueDate.split('T')[0]) : ''

        let mappedStatus = b.status === 'PAID' ? 'Paid' : b.status === 'PARTIALLY_PAID' ? 'Partial' : 'Pending'
        if (mappedStatus !== 'Paid' && b.dueDate) {
          // Normalise both to midnight local time so we compare dates only, not times
          const today   = new Date(); today.setHours(0, 0, 0, 0)
          const dueDay  = new Date(b.dueDate); dueDay.setHours(0, 0, 0, 0)
          if (dueDay < today) {
            mappedStatus = 'Overdue'
          } else if (dueDay.getTime() === today.getTime()) {
            mappedStatus = 'Due Today'
          }
        }

        return {
          id: b._id,
          billNo: b.billNumber,
          vendor: b.vendorId?.name || '—',
          vendorId: b.vendorId?._id || b.vendorId || '',
          paymentType: b.paymentType || 'Credit',
          date: billDateStr,
          dueDate: dueDateStr,
          amount: b.amount,
          paid: b.paidAmount,
          outstanding: b.outstandingAmount,
          remarks: b.remarks || '',
          status: mappedStatus
        }
      })

      if (!signal || !signal.aborted) {
        fetchDispatch({ type: 'FETCH_SUCCESS', payload: { bills: mapped, vendors: vendorsData } })
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        fetchDispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch bills' })
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchBillsAndVendors(controller.signal)
    return () => controller.abort()
  }, [fetchBillsAndVendors])

  useEffect(() => {
    const handleDataChanged = () => fetchBillsAndVendors()
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [fetchBillsAndVendors])

  const vendorListOptions = useMemo(() => {
    return vendors.map(v => ({ value: v._id, label: toTitleCase(v.name) }))
  }, [vendors])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setInitialFormSnapshot(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (bill) => {
    setSelectedBill(bill)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (bill) => {
    const editObj = {
      ...bill,
      vendor: bill.vendorId || bill.vendor,
      customPaymentType: ['Credit', 'cash'].includes(bill.paymentType) ? '' : bill.paymentType,
      paymentType: ['Credit', 'cash'].includes(bill.paymentType) ? bill.paymentType : 'custom'
    }
    setSelectedBill(bill)
    setForm(editObj)
    setInitialFormSnapshot(editObj)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = (e) => {
    if (e) e.preventDefault()
    requestSaveConfirmation({
      title: modalMode === 'add' ? 'Confirm Add Purchase Bill' : 'Confirm Update Bill',
      message: `You are about to save changes for Bill #${form.billNo || 'New'}.`,
      initialValues: initialFormSnapshot,
      currentValues: form,
      labelMap: {
        vendor: 'Vendor',
        billNo: 'Bill Number',
        paymentType: 'Payment Terms',
        customPaymentType: 'Custom Terms',
        date: 'Bill Date',
        dueDate: 'Due Date',
        amount: 'Bill Amount',
        remarks: 'Remarks'
      },
      onSaveApi: async () => {
        let savedPaymentType = form.paymentType
        if (form.paymentType === 'custom') {
          savedPaymentType = form.customPaymentType || 'Custom'
        }

        const payload = {
          billNumber: form.billNo,
          vendorId: form.vendor,
          paymentType: savedPaymentType,
          billDate: toInputDate(form.date),
          dueDate: toInputDate(form.dueDate),
          amount: Number(form.amount) || 0,
          remarks: form.remarks
        }

        try {
          if (modalMode === 'add') {
            await api.post('/bills', payload)
          } else {
            await api.put(`/bills/${selectedBill.id}`, payload)
          }
          await fetchBillsAndVendors()
          setShowModal(false)
          setForm(emptyForm)
          toast(modalMode === 'add' ? 'Purchase Bill created successfully' : 'Purchase Bill updated successfully', 'success')
        } catch (err) {
          toast(err.message || 'Failed to save bill', 'error')
          return false
        }
      }
    })
  }

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this purchase bill? This will reverse the payable ledger entry.', { title: 'Delete Bill' })) {
      try {
        await api.delete(`/bills/${id}`)
        await fetchBillsAndVendors()
      } catch (err) {
        toast(err.message || 'Failed to delete bill', 'error')
      }
    }
  }

  const handleSaveVendorInline = async (e) => {
    e.preventDefault()
    if (!vendorForm.name) {
      toast('Vendor name is required', 'error')
      return
    }
    try {
      const res = await api.post('/vendors', {
        ...vendorForm,
        openingBalance: Number(vendorForm.openingBalance) || 0
      })
      toast('Vendor added successfully')
      
      // Refresh vendors list
      await fetchBillsAndVendors()
      
      // Auto-select the newly created vendor ID
      const newVendorId = res?._id || res?.data?._id
      if (newVendorId) {
        setForm(prev => ({ ...prev, vendor: newVendorId }))
      }
      
      setShowAddVendorInline(false)
      setVendorForm(emptyVendorForm)
    } catch (err) {
      toast(err.message || 'Error saving vendor', 'error')
    }
  }

  const tableContainerRef = React.useRef(null)

  const filtered = bills.filter(b => {
    const matchSearch = (b.billNo || '').toLowerCase().includes(search.toLowerCase()) || (b.vendor || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || statusFilter === 'All Status' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const pagination = usePagination({
    items: filtered,
    moduleKey: 'bills',
    initialPageSize: 20,
    filterDependencies: [search, statusFilter],
    containerRef: tableContainerRef
  })

  return (
    <>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Purchase bills
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {bills.length} bills total · Manage vendor invoices and due dates
          </p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
        >
          <Plus size={16} />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Total Bills</p>
          {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">{bills.length}</p>}
        </div>
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80 mb-2">Unpaid</p>
          {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-extrabold tracking-tight tabular-nums text-amber-500 dark:text-amber-400">{bills.filter(b => b.status === 'Pending' || b.status === 'Partial').length}</p>}
        </div>
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-400/80 mb-2">Overdue</p>
          {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-extrabold tracking-tight tabular-nums text-rose-500 dark:text-rose-400">{bills.filter(b => b.status === 'Overdue').length}</p>}
        </div>
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Total Amount Billed</p>
          {loading ? <Skeleton className="h-8 w-32" /> : <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">₹{fmt(bills.reduce((s, b) => s + b.amount, 0))}</p>}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search bills..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" 
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <DropdownSelect
            className="w-40"
            value={statusFilter}
            onChange={val => setStatusFilter(val)}
            placeholder="Select Status"
            options={['All Status', 'Paid', 'Pending', 'Partial', 'Due Today', 'Overdue'].map(s => ({ value: s === 'All Status' ? '' : s, label: toTitleCase(s) }))}
          />
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState icon="search" title="Error Loading Bills" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">BILL NO</th>
                  <th className="text-left px-5 py-3">VENDOR</th>
                  <th className="text-left px-5 py-3">PAYMENT TYPE</th>
                  <th className="text-left px-5 py-3">DATE</th>
                  <th className="text-left px-5 py-3">DUE DATE</th>
                  <th className="text-right px-5 py-3">AMOUNT</th>
                  <th className="text-right px-5 py-3">OUTSTANDING</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={9} widths={["w-16", "w-32", "w-16", "w-20", "w-20", "w-16", "w-16", "w-12", "w-8"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {bills.length === 0 ? (
              <EmptyState 
                icon="document" 
                title="No Purchase Bills" 
                description="Record your first purchase bill to track payables" 
                action={{ label: "Add Bill", onClick: handleOpenAdd }} 
              />
            ) : (
              <EmptyState 
                icon="search" 
                title="No Bills Match" 
                description="Try adjusting your filters" 
              />
            )}
          </div>
        ) : (
          <>
            <div ref={tableContainerRef} className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left px-5 py-3">BILL NO</th>
                    <th className="text-left px-5 py-3">VENDOR</th>
                    <th className="text-left px-5 py-3">PAYMENT TYPE</th>
                    <th className="text-left px-5 py-3">DATE</th>
                    <th className="text-left px-5 py-3">DUE DATE</th>
                    <th className="text-right px-5 py-3">AMOUNT</th>
                    <th className="text-right px-5 py-3">OUTSTANDING</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagination.paginatedItems.map((b, i) => (
                    <motion.tr 
                      key={b._id || b.id} 
                      onClick={() => handleOpenPreview(b)} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{b.billNo}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                            {initials(b.vendor)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{toTitleCase(b.vendor)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <Badge variant="neutral">{toTitleCase(b.paymentType)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{b.date}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{b.dueDate}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">₹{fmt(b.amount)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-red-500">₹{fmt(b.outstanding)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={b.status === 'Paid' ? 'success' : 'warning'}>
                          {toTitleCase(b.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(b); }} className="text-xs text-gray-500 hover:text-brand-primary font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            View
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(b); }} className="text-xs text-gray-500 hover:text-brand-primary font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} className="text-xs text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white dark:bg-slate-800 w-[500px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {modalMode === 'add' ? 'Add Purchase Bill' : modalMode === 'edit' ? 'Edit Purchase Bill' : 'Purchase Bill Preview'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Vendor</label>
                    <p className="font-bold text-gray-900">{toTitleCase(selectedBill?.vendor)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Bill Number</label>
                    <p className="font-mono text-gray-900 font-semibold">{selectedBill?.billNo}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Payment Type</label>
                    <Badge variant="neutral">{toTitleCase(selectedBill?.paymentType)}</Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Amount</label>
                    <p className="text-gray-900 font-bold tabular-nums">₹{fmt(selectedBill?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Bill Date</label>
                    <p className="text-gray-900">{selectedBill?.date}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Due Date</label>
                    <p className="text-gray-900">{selectedBill?.dueDate}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Remarks</label>
                    <p className="text-gray-900">{selectedBill?.remarks || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Status</label>
                    <Badge variant={selectedBill?.status === 'Paid' ? 'success' : 'warning'}>
                      {toTitleCase(selectedBill?.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6 space-x-2">
                  <button 
                    onClick={() => {
                      setShowModal(false);
                      setPrintDoc({ type: 'bill', id: selectedBill?._id || selectedBill?.id });
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
                  >
                    Print Invoice
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary/95">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Vendor *</label>
                  <DropdownSelect
                    value={form.vendor}
                    onChange={val => setForm({...form, vendor: val})}
                    placeholder="Select Vendor"
                    options={vendorListOptions}
                    actionLabel="＋ Add New Vendor"
                    onAction={() => {
                      setVendorForm(emptyVendorForm)
                      setShowAddVendorInline(true)
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bill Number</label>
                    <input type="text" value={form.billNo} onChange={e => setForm({...form, billNo: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Amount *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Payment Type</label>
                    <DropdownSelect
                      value={form.paymentType}
                      onChange={val => setForm({...form, paymentType: val})}
                      placeholder="Select Payment Type"
                      options={[
                        { value: 'Credit', label: 'Credit' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'custom', label: 'Custom' }
                      ]}
                    />
                  </div>
                  {form.paymentType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Custom Payment Type</label>
                      <input type="text" required placeholder="e.g. Bank Guarantee" value={form.customPaymentType} onChange={e => setForm({...form, customPaymentType: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bill Date *</label>
                    <CustomDatePicker
                      value={form.date}
                      onChange={val => setForm({...form, date: val})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Due Date</label>
                    <CustomDatePicker
                      value={form.dueDate}
                      onChange={val => setForm({...form, dueDate: val})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Save Bill' : 'Update Bill'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showAddVendorInline && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-xl border max-w-lg w-full p-6 space-y-4 shadow-2xl" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Add New Vendor</h3>
              <button onClick={() => setShowAddVendorInline(false)} className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveVendorInline} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Vendor Name *</label>
                  <input type="text" required value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
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
                  <input type="text" value={vendorForm.gstin} onChange={e => setVendorForm({ ...vendorForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Opening Balance</label>
                  <input type="number" value={vendorForm.openingBalance} onChange={e => setVendorForm({ ...vendorForm, openingBalance: e.target.value })}
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
                <button type="button" onClick={() => setShowAddVendorInline(false)} className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3.5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:opacity-90">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Save Confirmation Dialog */}
      <SaveConfirmationModal {...confirmConfig} isSaving={isSaving} />

      {printDoc && (
        <PrintPreviewModal
          type={printDoc.type}
          id={printDoc.id}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </>
  )
}

export default PurchaseBills
