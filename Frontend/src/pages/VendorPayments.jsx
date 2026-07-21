import React, { useState, useMemo, useEffect, useReducer, useCallback } from 'react'
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
const colors = ['bg-blue-100 text-blue-700', 'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700', 'bg-green-100 text-green-700', 'bg-red-100 text-red-700']

const modeStyle = {
  Cash: 'bg-green-50 text-green-700 border-green-200',
  Cheque: 'bg-orange-50 text-orange-700 border-orange-200',
  NEFT: 'bg-blue-50 text-blue-700 border-blue-200',
  RTGS: 'bg-teal-50 text-teal-700 border-teal-200',
}

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// ── Fetch state reducer (defined at module scope for stable reference) ────────
const fetchInitial = { status: 'idle', payments: [], vendors: [], bills: [], paymentModes: [], error: null }
function fetchReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':   return { ...state, status: 'loading', error: null }
    case 'FETCH_SUCCESS': return { status: 'success', ...action.payload, error: null }
    case 'FETCH_ERROR':   return { ...state, status: 'error', error: action.payload }
    default:              return state
  }
}

export function VendorPayments() {
  const toast = useToast()
  const confirm = useConfirm()

  // ── Fetch state: consolidated into one reducer to avoid impossible states ──
  const [fetchState, fetchDispatch] = useReducer(fetchReducer, fetchInitial)
  const { payments, vendors, bills, paymentModes, status: fetchStatus, error } = fetchState
  const loading = fetchStatus === 'idle' || fetchStatus === 'loading'

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedPay, setSelectedPay] = useState(null)

  const emptyForm = {
    vendor: '',
    date: getTodayFormatted(),
    amount: '',
    mode: '',
    remarks: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(emptyForm)
  const { confirmNavigation } = useDirtyStateContext()
  const { confirmConfig, isSaving, requestSaveConfirmation } = useSaveConfirmation()

  const isFormDirty = useMemo(() => {
    if (!showModal || modalMode === 'preview') return false
    return (
      (form.vendor || '') !== (initialFormSnapshot.vendor || '') ||
      (form.date || '') !== (initialFormSnapshot.date || '') ||
      (form.amount || '') !== (initialFormSnapshot.amount || '') ||
      (form.mode || '') !== (initialFormSnapshot.mode || '') ||
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
    id: 'vendor-payment-form',
    title: modalMode === 'add' ? 'Record Vendor Payment Form' : 'Edit Vendor Payment Form',
    isDirty: isFormDirty,
    onSave: () => handleSave(),
    onDiscard: () => setForm(emptyForm)
  })

  // ── Fetch payments, vendors, bills, profile ───────────────────────────────
  // Wrapped in useCallback so the reference is stable across renders.
  const fetchPaymentsData = useCallback(async (signal) => {
    fetchDispatch({ type: 'FETCH_START' })
    try {
      const [paymentsData, vendorsData, billsData, profileRes] = await Promise.all([
        api.get('/payments', signal ? { signal } : {}),
        api.get('/vendors', signal ? { signal } : {}),
        api.get('/bills', signal ? { signal } : {}),
        api.get('/settings/profile', signal ? { signal } : {})
      ])

      const mappedPayments = paymentsData.map(p => {
        const paymentDateStr = p.paymentDate ? fromInputDate(p.paymentDate.split('T')[0]) : ''
        
        const mappedAllocations = (p.allocations || []).map(a => {
          const b = a.billId || {}
          const prev = (b.outstandingAmount || 0) + (a.allocatedAmount || 0)
          const next = b.outstandingAmount || 0
          return {
            billNo: b.billNumber || '—',
            prev: prev,
            adjusted: a.allocatedAmount || 0,
            next: next,
            status: next === 0 ? 'Paid' : 'Partial'
          }
        })

        return {
          id: p._id,
          ref: p.referenceNumber || '—',
          vendor: p.vendorId?.name || '—',
          vendorId: p.vendorId?._id || p.vendorId || '',
          date: paymentDateStr,
          amount: p.amount,
          mode: p.paymentMode === 'BANK_TRANSFER' ? 'NEFT' : p.paymentMode === 'CHEQUE' ? 'Cheque' : p.paymentMode === 'CASH' ? 'Cash' : 'NEFT',
          remarks: p.remarks || `Payment Ref: ${p.referenceNumber}`,
          allocations: mappedAllocations
        }
      })

      const mappedBills = billsData.map(b => ({
        billNo: b.billNumber,
        vendor: b.vendorId?.name || '—',
        vendorId: b.vendorId?._id || b.vendorId || '',
        outstanding: b.outstandingAmount,
        status: b.status
      }))

      const activeModes = profileRes?.data
        ? (profileRes.data.paymentModes || []).filter(m => m.enabled)
        : []

      if (!signal || !signal.aborted) {
        fetchDispatch({
          type: 'FETCH_SUCCESS',
          payload: { payments: mappedPayments, vendors: vendorsData, bills: mappedBills, paymentModes: activeModes }
        })
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        fetchDispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch payments' })
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchPaymentsData(controller.signal)
    return () => controller.abort()
  }, [fetchPaymentsData])

  useEffect(() => {
    const handleDataChanged = () => fetchPaymentsData()
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [fetchPaymentsData])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setInitialFormSnapshot(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (pay) => {
    setSelectedPay(pay)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (pay) => {
    const editObj = { ...pay }
    setSelectedPay(pay)
    setForm(editObj)
    setInitialFormSnapshot(editObj)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = (e) => {
    if (e) e.preventDefault()
    const amt = Number(form.amount) || 0
    
    const selectedVendorObj = vendors.find(v => v.name === form.vendor)
    if (!selectedVendorObj) {
      toast('Selected vendor not found', 'error')
      return
    }

    requestSaveConfirmation({
      title: 'Confirm Payment Record',
      message: `You are about to record a payment of ₹${amt} to "${form.vendor}".`,
      initialValues: initialFormSnapshot,
      currentValues: form,
      labelMap: {
        vendor: 'Vendor',
        date: 'Payment Date',
        amount: 'Payment Amount',
        mode: 'Payment Mode',
        remarks: 'Remarks'
      },
      onSaveApi: async () => {
        const modeMapping = {
          'Cash': 'CASH',
          'Cheque': 'CHEQUE',
          'NEFT': 'BANK_TRANSFER',
          'RTGS': 'BANK_TRANSFER',
          'UPI': 'BANK_TRANSFER',
          'Bank Transfer': 'BANK_TRANSFER'
        }

        const payload = {
          vendorId: selectedVendorObj._id,
          amount: amt,
          paymentDate: toInputDate(form.date),
          paymentMode: modeMapping[form.mode] || 'BANK_TRANSFER',
          referenceNumber: 'TXN-' + String(Math.floor(100 + Math.random() * 900)),
          chequeNumber: form.mode === 'Cheque' ? 'CHQ-' + String(Math.floor(10000 + Math.random() * 90000)) : undefined
        }

        try {
          await api.post('/payments', payload)
          await fetchPaymentsData()
          setShowModal(false)
          setForm(emptyForm)
          toast('Vendor payment recorded successfully', 'success')
        } catch (err) {
          toast(err.message || 'Failed to save payment', 'error')
          return false
        }
      }
    })
  }

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this payment transaction? This will reverse vendor outstanding balance and FIFO allocations.', { title: 'Delete Payment' })) {
      try {
        await api.delete(`/payments/${id}`)
        await fetchPaymentsData()
      } catch (err) {
        toast(err.message || 'Failed to delete payment', 'error')
      }
    }
  }

  const fifoAllocations = useMemo(() => {
    const amt = Number(form.amount) || 0
    const vendorBills = bills.filter(b => b.vendor === form.vendor && b.outstanding > 0)
    let remaining = amt
    const result = []

    for (const b of vendorBills) {
      if (remaining <= 0) break
      const adjusted = Math.min(b.outstanding, remaining)
      const next = b.outstanding - adjusted
      result.push({
        billNo: b.billNo,
        prev: b.outstanding,
        adjusted: adjusted,
        next: next,
        status: next === 0 ? 'Paid' : 'Partial'
      })
      remaining -= adjusted
    }
    return result
  }, [form.vendor, form.amount, bills])

  const filtered = payments.filter(p =>
    (p.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.remarks || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.mode || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendor Payments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{payments.length} transactions recorded</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState icon="search" title="Error Loading Payments" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">REF #</th>
                  <th className="text-left px-5 py-3">VENDOR</th>
                  <th className="text-left px-5 py-3">PAYMENT DATE</th>
                  <th className="text-right px-5 py-3">AMOUNT PAID</th>
                  <th className="text-left px-5 py-3">MODE</th>
                  <th className="text-left px-5 py-3">REMARKS</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-16", "w-32", "w-24", "w-16", "w-16", "w-36", "w-8"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {payments.length === 0 ? (
              <EmptyState 
                icon="wallet" 
                title="No Payments Recorded" 
                description="Record a payment against a vendor bill to see it here" 
                action={{ label: "Record Payment", onClick: handleOpenAdd }} 
              />
            ) : (
              <EmptyState 
                icon="search" 
                title="No Payments Match" 
                description="Try adjusting your filters" 
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3">REF #</th>
                <th className="text-left px-5 py-3">VENDOR</th>
                <th className="text-left px-5 py-3">PAYMENT DATE</th>
                <th className="text-right px-5 py-3">AMOUNT PAID</th>
                <th className="text-left px-5 py-3">MODE</th>
                <th className="text-left px-5 py-3">REMARKS</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p, i) => (
                <motion.tr 
                  key={p.id} 
                  onClick={() => handleOpenPreview(p)} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{p.ref}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                        {initials(p.vendor)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{toTitleCase(p.vendor)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{p.date}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">₹{fmt(p.amount)}</td>
                  <td className="px-5 py-3.5 text-xs">
                    <Badge variant={
                      p.mode?.toLowerCase() === 'cash' ? 'success' :
                      p.mode?.toLowerCase() === 'cheque' ? 'warning' :
                      p.mode?.toLowerCase() === 'neft' || p.mode?.toLowerCase() === 'rtgs' ? 'info' : 'neutral'
                    }>
                      {toTitleCase(p.mode)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 italic max-w-[200px] truncate">{p.remarks || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(p); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-gray-400 hover:text-red-500 p-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={closeModal}>
          <div className="bg-white dark:bg-slate-800 w-[540px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-6 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {modalMode === 'add' ? 'Record Vendor Payment' : modalMode === 'edit' ? 'Edit Payment Details' : 'Payment & FIFO Allocation Preview'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Vendor</label>
                    <p className="font-bold text-gray-900">{toTitleCase(selectedPay?.vendor)}</p>
                  </div>
                   <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Payment Mode</label>
                    <Badge variant={
                      selectedPay?.mode?.toLowerCase() === 'cash' ? 'success' :
                      selectedPay?.mode?.toLowerCase() === 'cheque' ? 'warning' :
                      selectedPay?.mode?.toLowerCase() === 'neft' || selectedPay?.mode?.toLowerCase() === 'rtgs' ? 'info' : 'neutral'
                    }>
                      {toTitleCase(selectedPay?.mode)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Amount Paid</label>
                    <p className="text-brand-primary font-bold tabular-nums text-base">₹{fmt(selectedPay?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Payment Date</label>
                    <p className="text-gray-900">{selectedPay?.date}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Remarks</label>
                    <p className="text-gray-900">{selectedPay?.remarks || '—'}</p>
                  </div>
                </div>

                {/* Allocation table in preview */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">FIFO Bill Allocations</h3>
                  <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="px-3 py-2 text-left">Bill #</th>
                          <th className="px-3 py-2 text-right">Prev Balance</th>
                          <th className="px-3 py-2 text-right">Adjusted</th>
                          <th className="px-3 py-2 text-right">New Balance</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPay?.allocations?.map((a, idx) => (
                          <tr key={idx} className="border-b border-gray-200 last:border-0">
                            <td className="px-3 py-2 font-mono text-gray-700">{a.billNo}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.prev)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600 tabular-nums">₹{fmt(a.adjusted)}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.next)}</td>
                            <td className="px-3 py-2">
                              <Badge variant={a.status === 'Paid' ? 'success' : 'warning'} className="text-[10px] px-1.5 py-0.5">
                                {toTitleCase(a.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>            </div>
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
                    options={vendors.map(v => ({ value: v.name, label: toTitleCase(v.name) }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date *</label>
                    <CustomDatePicker
                      value={form.date}
                      onChange={val => setForm({...form, date: val})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode *</label>
                    <DropdownSelect
                      value={form.mode}
                      onChange={val => setForm({...form, mode: val})}
                      placeholder="Select Payment Mode"
                      options={paymentModes.map(m => ({ value: m.name, label: m.name }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                  <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>

                {/* FIFO Real-Time Allocation Preview */}
                {form.amount && Number(form.amount) > 0 && (
                  <div className="border border-brand-primary/10 rounded-lg p-3 bg-brand-primary/[0.01]">
                    <p className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Real-time FIFO Allocation Preview</p>
                    {fifoAllocations.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No outstanding bills found for {form.vendor}. This will register as an advance.</p>
                    ) : (
                      <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100 pb-1">
                            <th className="text-left font-semibold">Bill #</th>
                            <th className="text-right font-semibold">Prev Balance</th>
                            <th className="text-right font-semibold text-brand-primary">Adjusted</th>
                            <th className="text-right font-semibold">New Balance</th>
                            <th className="text-left font-semibold pl-2">New Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fifoAllocations.map((a, idx) => (
                            <tr key={idx} className="border-b border-gray-50 last:border-none py-1">
                              <td className="font-mono text-gray-700 py-1">{a.billNo}</td>
                              <td className="text-right py-1 font-medium text-gray-600 tabular-nums">₹{fmt(a.prev)}</td>
                              <td className="text-right py-1 font-bold text-green-600 tabular-nums">₹{fmt(a.adjusted)}</td>
                              <td className="text-right py-1 font-medium text-gray-600 tabular-nums">₹{fmt(a.next)}</td>
                              <td className="py-1 pl-2">
                                <span className={`text-[10px] font-semibold px-1 rounded ${
                                  a.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                }`}>{toTitleCase(a.status)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>            </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Confirm & Save' : 'Update Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <SaveConfirmationModal {...confirmConfig} isSaving={isSaving} />
    </>
  )
}

export default VendorPayments
