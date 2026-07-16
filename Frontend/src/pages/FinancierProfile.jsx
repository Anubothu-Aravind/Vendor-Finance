import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, Plus, ArrowLeft, Building2, X } from 'lucide-react'
import { toInputDate, fromInputDate, getTodayFormatted } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import Skeleton from '../components/ui/Skeleton'

const fmt = (v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, minimumIntegerDigits: 1 }).format(v)

export function FinancierProfile() {
  const toast = useToast()
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState(null)
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [showAddLoanModal, setShowAddLoanModal] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    status: '',
    notes: ''
  })

  // Repayment form state & sub-step
  const [repayStep, setRepayStep] = useState('input') // 'input' | 'preview'
  const [repayForm, setRepayForm] = useState({
    date: getTodayFormatted(),
    amount: '',
    mode: '',
    remarks: '',
    chequeNo: ''
  })

  // Add loan form state
  const [loanForm, setLoanForm] = useState({
    noteNo: '',
    date: getTodayFormatted(),
    amount: '',
    interestRate: '',
    remarks: ''
  })

  const fetchProfileAndLoans = async (signal) => {
    try {
      setLoading(true)
      const [finData, loansData] = await Promise.all([
        api.get(`/financiers/${id}`, { signal }),
        api.get('/loans', { signal })
      ])
      
      if (!signal || !signal.aborted) {
        setProfile({
          ...finData,
          id: finData._id
        })
        
        setEditForm({
          name: finData.name || '',
          phone: finData.phone || '',
          address: finData.address || '',
          status: finData.status || 'Active',
          notes: finData.notes || ''
        })
        
        const finLoans = loansData
          .filter(l => !l.isDeleted && (l.financierId?._id === id || l.financierId === id))
          .map(l => ({
            id: l._id,
            noteNo: l.loanReference,
            date: fromInputDate(l.drawdownDate.split('T')[0]),
            amount: l.principalAmount,
            paid: l.paidPrincipal,
            outstanding: l.outstandingPrincipal,
            status: l.status
          }))
        setLoans(finLoans)
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to load financier profile')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchProfileAndLoans(controller.signal)
    return () => controller.abort()
  }, [id])

  // Totals calculations
  const totals = useMemo(() => {
    const totalLoans = loans.length
    const active = loans.filter(l => String(l.status).toLowerCase() === 'active').length
    const closed = loans.filter(l => String(l.status).toLowerCase() === 'closed' || String(l.status).toLowerCase() === 'settled').length
    const totalLoaned = loans.reduce((s, l) => s + l.amount, 0)
    const totalPaid = loans.reduce((s, l) => s + l.paid, 0)
    const outstanding = loans.reduce((s, l) => s + l.outstanding, 0)
    return { totalLoans, active, closed, totalLoaned, totalPaid, outstanding }
  }, [loans])

  // Handle Edit Save
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/financiers/${id}`, {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        status: editForm.status,
        notes: editForm.notes,
        defaultInterestRate: profile?.defaultInterestRate || 12
      })
      await fetchProfileAndLoans()
      setShowEditModal(false)
    } catch (err) {
      toast(err.message || 'Failed to update financier', 'error')
    }
  }

  // Handle Add Loan Save
  const handleSaveLoan = async (e) => {
    e.preventDefault()
    const amt = Number(loanForm.amount) || 0
    const payload = {
      financierId: id,
      loanReference: loanForm.noteNo,
      drawdownDate: toInputDate(loanForm.date),
      principalAmount: amt,
      interestRate: Number(loanForm.interestRate) || profile?.defaultInterestRate || 12,
      notes: loanForm.remarks,
      status: 'Active'
    }
    try {
      await api.post('/loans', payload)
      await fetchProfileAndLoans()
      setShowAddLoanModal(false)
      setLoanForm({ noteNo: '', date: getTodayFormatted(), amount: '', interestRate: '', remarks: '' })
    } catch (err) {
      toast(err.message || 'Failed to save loan', 'error')
    }
  }

  // FIFO Allocation calculations in real time for Repayment Preview
  const fifoAllocations = useMemo(() => {
    const amt = Number(repayForm.amount) || 0
    let remaining = amt
    const result = []

    for (const l of loans) {
      if (l.outstanding <= 0) continue
      const adjusted = Math.min(l.outstanding, remaining)
      const next = l.outstanding - adjusted
      result.push({
        id: l.id,
        noteNo: l.noteNo,
        prev: l.outstanding,
        adjusted: adjusted,
        next: next,
        status: next === 0 ? 'Closed' : 'Active'
      })
      remaining -= adjusted
      if (remaining <= 0) break
    }
    return result
  }, [loans, repayForm.amount])

  const isOverBalance = Number(repayForm.amount) > totals.outstanding

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12)
    }
    val = parts.join('.')
    setRepayForm(prev => ({ ...prev, amount: val }))
  }

  // Confirm Repayment Save
  const handleConfirmRepayment = async () => {
    if (repayForm.mode === 'Cheque') {
      if (!repayForm.chequeNo || repayForm.chequeNo.length !== 6) {
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
          await api.post(`/loans/${alloc.id}/repayments`, {
            amount: alloc.adjusted,
            repaymentDate: toInputDate(repayForm.date),
            repaymentMode: modeMapping[repayForm.mode] || 'BANK_TRANSFER',
            referenceNumber: 'REP-' + String(Math.floor(100 + Math.random() * 900)),
            chequeNumber: repayForm.mode === 'Cheque' ? repayForm.chequeNo : undefined,
            principalPaid: alloc.adjusted,
            interestPaid: 0
          })
        }
      }
      await fetchProfileAndLoans()
      setShowRepayModal(false)
      setRepayStep('input')
      setRepayForm({ date: getTodayFormatted(), amount: '', mode: '', remarks: '', chequeNo: '' })
    } catch (err) {
      toast(err.message || 'Failed to confirm repayments', 'error')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="search" title="Error Loading Profile" description={error} />
      </div>
    )
  }

  if (loading || !profile) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button onClick={() => navigate('/financiers')} className="flex items-center space-x-1 text-gray-500 hover:text-gray-900 transition-colors text-sm">
          <ArrowLeft size={16} />
          <span>Financiers</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="flex justify-between items-start bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{toTitleCase(profile.name)}</h1>
            <p className="text-sm text-gray-500 font-medium font-sans">Financier profile</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => {
            setEditForm({ name: profile.name, phone: profile.phone, address: profile.address, status: profile.status, notes: profile.notes })
            setShowEditModal(true)
          }} className="flex items-center space-x-1.5 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white transition-colors">
            <Edit2 size={14} />
            <span>Edit</span>
          </button>
          <button onClick={() => {
            setRepayStep('input')
            setShowRepayModal(true)
          }} className="bg-brand-primary hover:bg-brand-primary/95 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Record Repayment
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Loans</p>
          <p className="text-2xl font-bold text-gray-900 break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>{totals.totalLoans}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-blue-600 break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>{totals.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Closed</p>
          <p className="text-2xl font-bold text-gray-500 break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>{totals.closed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Loaned</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>₹{fmt(totals.totalLoaned)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 tabular-nums break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>₹{fmt(totals.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-orange-500 tabular-nums break-all" style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.2rem)', wordBreak: 'break-all' }}>₹{fmt(totals.outstanding)}</p>
        </div>
      </div>

      {/* Contact Details & Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Details</h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 max-w-xl text-sm">
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-400">Phone</span>
            <span className="font-semibold text-gray-900">{profile.phone || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-400">Address</span>
            <span className="font-semibold text-gray-900">{profile.address || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-400">Status</span>
            <span className="font-semibold text-gray-900">{toTitleCase(profile.status)}</span>
          </div>
          {profile.notes && (
            <div className="col-span-2 mt-2">
              <span className="text-gray-400 block mb-1">Notes</span>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">{profile.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Loans Table Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Loans</h3>
          <button onClick={() => setShowAddLoanModal(true)} className="flex items-center space-x-1 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700">
            <Plus size={14} />
            <span>Add Loan</span>
          </button>
        </div>
        {!loans || loans.length === 0 ? (
          <div className="p-6">
            <EmptyState 
              icon="loan" 
              title="No Loans Found" 
              description="Add a loan from this financier to get started" 
              action={{ label: "Add Loan", onClick: () => setShowAddLoanModal(true) }} 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3">NOTE #</th>
                <th className="text-left px-5 py-3">DATE</th>
                <th className="text-right px-5 py-3">LOAN AMOUNT</th>
                <th className="text-right px-5 py-3">PAID</th>
                <th className="text-right px-5 py-3">OUTSTANDING</th>
                <th className="text-left px-5 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loans.map((l, i) => (
                <tr key={l._id || l.id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-gray-700">{l.noteNo}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{l.date}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">₹{fmt(l.amount)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-green-600 text-right tabular-nums">₹{fmt(l.paid)}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-orange-500 text-right tabular-nums">₹{fmt(l.outstanding)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={String(l.status).toLowerCase() === 'active' ? 'success' : 'success'}>
                      {toTitleCase(l.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Edit Financier Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[480px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">Edit Financier</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                <input type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                <textarea rows={2} value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <DropdownSelect
                  value={editForm.status}
                  onChange={val => setEditForm({...editForm, status: val})}
                  placeholder="Select Status"
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {showRepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[500px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                {repayStep === 'input' ? 'Record Financier Repayment' : 'Confirm Repayment'}
              </h2>
              <button onClick={() => setShowRepayModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {repayStep === 'input' ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 italic mb-2">Enter repayment details — preview FIFO loan allocation before saving</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Financier *</label>
                  <input type="text" disabled value={toTitleCase(profile.name)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-gray-50 text-gray-500 font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Repayment Date *</label>
                    <CustomDatePicker
                      value={repayForm.date}
                      onChange={val => setRepayForm({...repayForm, date: val})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode *</label>
                    <DropdownSelect
                      value={repayForm.mode}
                      onChange={val => setRepayForm({...repayForm, mode: val})}
                      placeholder="Select Mode"
                      options={[
                        { value: 'Cash', label: 'Cash' },
                        { value: 'Cheque', label: 'Cheque' },
                        { value: 'NEFT', label: 'NEFT' },
                        { value: 'RTGS', label: 'RTGS' }
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                  <input type="text" required value={repayForm.amount} onChange={handleAmountChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-bold" />
                  {isOverBalance && (
                    <p className="text-red-500 text-xs mt-1">Amount cannot exceed the total outstanding balance of ₹{fmt(totals.outstanding)}.</p>
                  )}
                </div>
                {repayForm.mode === 'Cheque' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cheque Number *</label>
                    <input type="text" required placeholder="e.g. 123456" value={repayForm.chequeNo || ''} onChange={e => setRepayForm({...repayForm, chequeNo: e.target.value.slice(0, 6).replace(/[^0-9]/g, '')})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                  <textarea rows={2} value={repayForm.remarks} onChange={e => setRepayForm({...repayForm, remarks: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShowRepayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={() => {
                    if (repayForm.mode === 'Cheque' && (!repayForm.chequeNo || repayForm.chequeNo.length !== 6)) {
                      toast('Cheque number must be exactly 6 digits', 'error')
                      return
                    }
                    setRepayStep('preview')
                  }} disabled={!repayForm.amount || isOverBalance}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 disabled:opacity-50">
                    Preview Allocation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 italic mb-3">Review FIFO allocation before confirming</p>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-0.5">Repayment Amount</p>
                  <p className="text-2xl font-extrabold text-brand-primary tabular-nums">₹{fmt(Number(repayForm.amount) || 0)}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">FIFO Loan Allocation</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="px-3 py-2 text-left">Note #</th>
                          <th className="px-3 py-2 text-right">Previous Balance</th>
                          <th className="px-3 py-2 text-right text-brand-primary">Adjusted</th>
                          <th className="px-3 py-2 text-right">New Balance</th>
                          <th className="px-3 py-2 text-left pl-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fifoAllocations.map((a, idx) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-mono text-gray-700">{a.noteNo}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.prev)}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-500 tabular-nums">-₹{fmt(a.adjusted)}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">₹{fmt(a.next)}</td>
                            <td className="px-3 py-2 pl-2">
                              <Badge variant={String(a.status).toLowerCase() === 'closed' ? 'success' : 'success'} className="text-[10px] px-1.5 py-0.5">
                                {toTitleCase(a.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {fifoAllocations.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-gray-400 italic">No outstanding loans found to allocate. Amount will register as advance balance.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>            </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setRepayStep('input')} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                  <button type="button" onClick={handleConfirmRepayment} className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary/95 shadow-sm">
                    Confirm Repayment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[480px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">Add Loan</h2>
              <button onClick={() => setShowAddLoanModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note Number *</label>
                <input type="text" required value={loanForm.noteNo} onChange={e => setLoanForm({...loanForm, noteNo: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Loan Date *</label>
                  <CustomDatePicker
                    value={loanForm.date}
                    onChange={val => setLoanForm({...loanForm, date: val})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Interest Rate (%)</label>
                  <input type="number" step="0.01" value={loanForm.interestRate} onChange={e => setLoanForm({...loanForm, interestRate: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none text-right" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                <input type="number" required value={loanForm.amount} onChange={e => setLoanForm({...loanForm, amount: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                <textarea rows={2} value={loanForm.remarks} onChange={e => setLoanForm({...loanForm, remarks: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setShowAddLoanModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary/95 shadow-sm">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancierProfile
