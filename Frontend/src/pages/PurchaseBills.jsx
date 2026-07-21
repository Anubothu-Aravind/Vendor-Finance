import React, { useState, useEffect, useMemo, useReducer, useCallback } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X } from 'lucide-react'
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

const initials = (name) => name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-pink-100 text-pink-700']

const statusStyle = {
  Paid: 'text-green-600 bg-green-50 border-green-200',
  Pending: 'text-gray-600 bg-gray-50 border-gray-200',
  Partial: 'text-orange-600 bg-orange-50 border-orange-200',
  Overdue: 'text-red-600 bg-red-50 border-red-200',
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
        if (mappedStatus !== 'Paid' && b.dueDate && new Date(b.dueDate) < new Date()) {
          mappedStatus = 'Overdue'
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

  const filtered = bills.filter(b => {
    const matchSearch = (b.billNo || '').toLowerCase().includes(search.toLowerCase()) || (b.vendor || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || statusFilter === 'All Status' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase bills</h1>
          <p className="text-sm text-gray-400 mt-0.5">{bills.length} bills total</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Total Bills</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-gray-900">{bills.length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Unpaid</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-orange-500">{bills.filter(b => b.status === 'Pending' || b.status === 'Partial').length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Overdue</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-red-500">{bills.filter(b => b.status === 'Overdue').length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Total Amount Billed</p>
          {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-gray-900">₹{fmt(bills.reduce((s, b) => s + b.amount, 0))}</p>}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center space-x-3">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
          <DropdownSelect
            className="w-40"
            value={statusFilter}
            onChange={val => setStatusFilter(val)}
            placeholder="Select Status"
            options={['All Status', 'Paid', 'Pending', 'Partial', 'Overdue'].map(s => ({ value: s === 'All Status' ? '' : s, label: toTitleCase(s) }))}
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
              {filtered.map((b, i) => (
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
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(b); }} className="text-gray-300 hover:text-brand-primary p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(b); }} className="text-gray-300 hover:text-brand-primary p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} className="text-gray-300 hover:text-red-500 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
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
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary/95">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor *</label>
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bill Number</label>
                    <input type="text" value={form.billNo} onChange={e => setForm({...form, billNo: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Type</label>
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
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Payment Type</label>
                      <input type="text" required placeholder="e.g. Bank Guarantee" value={form.customPaymentType} onChange={e => setForm({...form, customPaymentType: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bill Date *</label>
                    <CustomDatePicker
                      value={form.date}
                      onChange={val => setForm({...form, date: val})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                    <CustomDatePicker
                      value={form.dueDate}
                      onChange={val => setForm({...form, dueDate: val})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
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
    </>
  )
}

export default PurchaseBills
