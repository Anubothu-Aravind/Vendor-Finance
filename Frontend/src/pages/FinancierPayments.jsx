import React, { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X, Building2 } from 'lucide-react'
import { toInputDate, fromInputDate, getTodayFormatted } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

export function FinancierPayments() {
  const toast = useToast()
  const confirm = useConfirm()
  const [paymentModes, setPaymentModes] = useState([])

  const [repayments, setRepayments] = useState([])
  const [financiers, setFinanciers] = useState([])
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedRepay, setSelectedRepay] = useState(null)

  const emptyForm = {
    financier: '',
    date: getTodayFormatted(),
    amount: '',
    mode: '',
    remarks: '',
    chequeNo: ''
  }
  const [form, setForm] = useState(emptyForm)

  const fetchRepaymentsData = async (signal) => {
    try {
      setLoading(true)
      const [repaymentsData, financiersData, loansData, profileRes] = await Promise.all([
        api.get('/loans/repayments/all', { signal }),
        api.get('/financiers', { signal }),
        api.get('/loans', { signal }),
        api.get('/settings/profile', { signal })
      ])

      const mappedRepayments = repaymentsData.map(r => {
        const repaymentDateStr = r.repaymentDate ? fromInputDate(r.repaymentDate.split('T')[0]) : ''
        const l = r.loanId || {}
        const financierName = l.financierId?.name || '—'

        return {
          id: r._id,
          loanId: l._id || '',
          ref: r.referenceNumber || '—',
          financier: financierName,
          date: repaymentDateStr,
          amount: r.amount,
          mode: r.repaymentMode === 'BANK_TRANSFER' ? 'NEFT' : r.repaymentMode === 'CHEQUE' ? 'Cheque' : r.repaymentMode === 'CASH' ? 'Cash' : 'NEFT',
          remarks: r.remarks || `Repayment Ref: ${r.referenceNumber}`,
          allocations: [{
            noteNo: l.loanReference || '—',
            prev: (l.outstandingPrincipal || 0) + (r.principalPaid || 0),
            adjusted: r.principalPaid || 0,
            next: l.outstandingPrincipal || 0,
            status: l.status === 'SETTLED' ? 'Closed' : 'Active'
          }]
        }
      })

      if (!signal || !signal.aborted) {
        setRepayments(mappedRepayments)
        setFinanciers(financiersData)
        setLoans(loansData)
        if (profileRes && profileRes.data) {
          const activeModes = (profileRes.data.paymentModes || []).filter(m => m.enabled)
          setPaymentModes(activeModes)
        }
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch repayments')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchRepaymentsData(controller.signal)
    return () => controller.abort()
  }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (repay) => {
    setSelectedRepay(repay)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (repay) => {
    setSelectedRepay(repay)
    setForm({ ...repay })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount) || 0
    
    if (form.mode === 'Cheque') {
      if (!form.chequeNo || form.chequeNo.length !== 6) {
        toast('Cheque number must be exactly 6 digits', 'error')
        return
      }
    }

    if (isOverBalance) {
      toast('Amount cannot exceed the total outstanding balance', 'error')
      return
    }

    const modeMapping = {
      'Cash': 'CASH',
      'Cheque': 'CHEQUE',
      'NEFT': 'BANK_TRANSFER',
      'RTGS': 'BANK_TRANSFER',
      'UPI': 'BANK_TRANSFER',
      'Bank Transfer': 'BANK_TRANSFER'
    }

    try {
      for (const alloc of fifoAllocations) {
        if (alloc.adjusted > 0) {
          await api.post(`/loans/${alloc.loanId}/repayments`, {
            amount: alloc.adjusted,
            repaymentDate: toInputDate(form.date),
            repaymentMode: modeMapping[form.mode] || 'BANK_TRANSFER',
            referenceNumber: 'REP-' + String(Math.floor(100 + Math.random() * 900)),
            chequeNumber: form.mode === 'Cheque' ? form.chequeNo : undefined,
            principalPaid: alloc.adjusted,
            interestPaid: 0
          })
        }
      }
      await fetchRepaymentsData()
      setShowModal(false)
    } catch (err) {
      toast(err.message || 'Failed to save repayment', 'error')
    }
  }

  const handleDelete = async (id) => {
    const repay = repayments.find(r => r.id === id)
    if (!repay) return

    if (await confirm('Are you sure you want to delete this repayment record? This action cannot be undone.', { title: 'Delete Repayment' })) {
      try {
        await api.delete(`/loans/${repay.loanId}/repayments/${id}`)
        await fetchRepaymentsData()
      } catch (err) {
        toast(err.message || 'Failed to delete repayment', 'error')
      }
    }
  }

  const fifoAllocations = useMemo(() => {
    const amt = Number(form.amount) || 0
    const financierLoans = loans.filter(l => !l.isDeleted && l.financierId?.name === form.financier && l.outstandingPrincipal > 0)
    let remaining = amt
    const result = []

    for (const l of financierLoans) {
      if (remaining <= 0) break
      const adjusted = Math.min(l.outstandingPrincipal, remaining)
      const next = l.outstandingPrincipal - adjusted
      result.push({
        loanId: l._id,
        noteNo: l.loanReference,
        prev: l.outstandingPrincipal,
        adjusted: adjusted,
        next: next,
        status: next === 0 ? 'Closed' : 'Active'
      })
      remaining -= adjusted
    }
    return result
  }, [form.financier, form.amount, loans])

  const filtered = repayments.filter(r =>
    (r.financier || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.remarks || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.mode || '').toLowerCase().includes(search.toLowerCase())
  )

  const selectedFinancierLoans = useMemo(() => {
    return loans.filter(l => !l.isDeleted && l.financierId?.name === form.financier && l.outstandingPrincipal > 0)
  }, [loans, form.financier])

  const totalOutstandingBalance = useMemo(() => {
    return selectedFinancierLoans.reduce((sum, l) => sum + l.outstandingPrincipal, 0)
  }, [selectedFinancierLoans])

  const isOverBalance = Number(form.amount) > totalOutstandingBalance

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12)
    }
    val = parts.join('.')
    setForm(prev => ({ ...prev, amount: val }))
  }

  const totalRepaid = repayments.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financier Repayments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{repayments.length} payments recorded · ₹{fmt(totalRepaid)} total repaid</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Record Repayment</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search repayments..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState icon="search" title="Error Loading Repayments" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">REF #</th>
                  <th className="text-left px-5 py-3">FINANCIER</th>
                  <th className="text-left px-5 py-3">REPAYMENT DATE</th>
                  <th className="text-right px-5 py-3">AMOUNT REPAID</th>
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
            {repayments.length === 0 ? (
              <EmptyState 
                icon="wallet" 
                title="No Repayments" 
                description="Record your first repayment to a financier here" 
                action={{ label: "Record Repayment", onClick: handleOpenAdd }} 
              />
            ) : (
              <EmptyState 
                icon="search" 
                title="No Repayments Match" 
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
                <th className="text-left px-5 py-3">FINANCIER</th>
                <th className="text-left px-5 py-3">REPAYMENT DATE</th>
                <th className="text-right px-5 py-3">AMOUNT REPAID</th>
                <th className="text-left px-5 py-3">MODE</th>
                <th className="text-left px-5 py-3">REMARKS</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r, i) => (
                <motion.tr 
                  key={r._id || r.id} 
                  onClick={() => handleOpenPreview(r)} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{r.ref}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <Building2 size={14} />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{toTitleCase(r.financier)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 font-mono">{r.date}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">₹{fmt(r.amount)}</td>
                  <td className="px-5 py-3.5 text-xs">
                    <Badge variant={
                      r.mode?.toLowerCase() === 'cash' ? 'success' :
                      r.mode?.toLowerCase() === 'cheque' ? 'warning' :
                      r.mode?.toLowerCase() === 'neft' || r.mode?.toLowerCase() === 'rtgs' ? 'info' : 'neutral'
                    }>
                      {toTitleCase(r.mode)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 italic max-w-[200px] truncate">{r.remarks || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(r); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-gray-400 hover:text-red-500 p-1">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-[540px] rounded-xl border border-gray-200 shadow-xl p-6 my-8">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                {modalMode === 'add' ? 'Record Repayment' : modalMode === 'edit' ? 'Edit Repayment Details' : 'Repayment & Loan FIFO Preview'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Financier</label>
                    <p className="font-bold text-gray-900">{toTitleCase(selectedRepay?.financier)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Payment Mode</label>
                    <Badge variant={
                      selectedRepay?.mode?.toLowerCase() === 'cash' ? 'success' :
                      selectedRepay?.mode?.toLowerCase() === 'cheque' ? 'warning' :
                      selectedRepay?.mode?.toLowerCase() === 'neft' || selectedRepay?.mode?.toLowerCase() === 'rtgs' ? 'info' : 'neutral'
                    }>
                      {toTitleCase(selectedRepay?.mode)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Amount Repaid</label>
                    <p className="text-brand-primary font-bold tabular-nums text-base">₹{fmt(selectedRepay?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Repayment Date</label>
                    <p className="text-gray-900">{selectedRepay?.date}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Remarks</label>
                    <p className="text-gray-900">{selectedRepay?.remarks || '—'}</p>
                  </div>
                </div>

                {/* FIFO table in preview */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">FIFO Loan Allocations</h3>
                  <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="px-3 py-2 text-left">Note #</th>
                          <th className="px-3 py-2 text-right">Prev Balance</th>
                          <th className="px-3 py-2 text-right">Adjusted</th>
                          <th className="px-3 py-2 text-right">New Balance</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepay?.allocations?.map((a, idx) => (
                          <tr key={idx} className="border-b border-gray-200 last:border-0">
                            <td className="px-3 py-2 font-mono text-gray-700">{a.noteNo}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.prev)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600 tabular-nums">₹{fmt(a.adjusted)}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.next)}</td>
                             <td className="px-3 py-2">
                               <Badge variant={String(a.status).toLowerCase() === 'closed' ? 'success' : 'success'} className="text-[10px] px-1.5 py-0.5">
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Financier *</label>
                  <DropdownSelect
                    value={form.financier}
                    onChange={val => setForm({...form, financier: val})}
                    placeholder="Select Financier"
                    options={financiers.map(f => ({ value: f.name, label: toTitleCase(f.name) }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Repayment Date *</label>
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
                      placeholder="Select Mode"
                      options={paymentModes.map(m => ({ value: m.name, label: m.name }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                  <input type="text" required value={form.amount} onChange={handleAmountChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  {isOverBalance && (
                    <p className="text-red-500 text-xs mt-1">Amount cannot exceed the total outstanding balance of ₹{fmt(totalOutstandingBalance)}.</p>
                  )}
                </div>

                {form.mode === 'Cheque' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cheque Number *</label>
                    <input type="text" required placeholder="e.g. 123456" value={form.chequeNo || ''} onChange={e => setForm({...form, chequeNo: e.target.value.slice(0, 6).replace(/[^0-9]/g, '')})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono" />
                  </div>
                )}

                {/* FIFO Real-Time Loan Allocation Preview */}
                {form.amount && Number(form.amount) > 0 && (
                  <div className="border border-brand-primary/10 rounded-lg p-3 bg-brand-primary/[0.01]">
                    <p className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Real-time Loan FIFO Allocation Preview</p>
                    {fifoAllocations.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No outstanding active loans found for {form.financier}. This will register as an unallocated advance payment.</p>
                    ) : (
                      <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100 pb-1">
                            <th className="text-left font-semibold">Note #</th>
                            <th className="text-right font-semibold">Prev Balance</th>
                            <th className="text-right font-semibold text-brand-primary">Adjusted</th>
                            <th className="text-right font-semibold">New Balance</th>
                            <th className="text-left font-semibold pl-2">New Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fifoAllocations.map((a, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-none py-1">
                              <td className="font-mono text-gray-700 py-1">{a.noteNo}</td>
                              <td className="text-right py-1 font-medium text-gray-600 tabular-nums">₹{fmt(a.prev)}</td>
                              <td className="text-right py-1 font-bold text-green-600 tabular-nums">₹{fmt(a.adjusted)}</td>
                              <td className="text-right py-1 font-medium text-gray-600 tabular-nums">₹{fmt(a.next)}</td>
                              <td className="py-1 pl-2">
                                <Badge variant={a.status === 'Closed' ? 'success' : 'success'} className="text-[10px] px-1.5 py-0.5">
                                  {a.status}
                                </Badge>
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

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isOverBalance} style={{ opacity: isOverBalance ? 0.5 : 1, cursor: isOverBalance ? 'not-allowed' : 'pointer' }} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Confirm & Save' : 'Update Repayment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancierPayments
