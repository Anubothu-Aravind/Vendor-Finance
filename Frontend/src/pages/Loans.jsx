import React, { useState, useEffect } from 'react'
import { Plus, X, Edit2, Eye, Trash2 } from 'lucide-react'
import { toInputDate, fromInputDate } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const statusStyle = {
  Active: 'text-blue-600 bg-blue-50 border-blue-200',
  Closed: 'text-gray-500 bg-gray-50 border-gray-200',
  Overdue: 'text-red-600 bg-red-50 border-red-200',
}

export function Loans() {
  const toast = useToast()
  const confirm = useConfirm()
  const [loans, setLoans] = useState([])
  const [financiers, setFinanciers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedLoan, setSelectedLoan] = useState(null)

  const emptyForm = {
    financier: '',
    noteNo: '',
    loanDate: '29-06-2026',
    amount: '',
    rate: '',
    remarks: '',
  }
  const [form, setForm] = useState(emptyForm)

  const fetchLoansAndFinanciers = async (signal) => {
    try {
      setLoading(true)
      const [loansData, financiersData] = await Promise.all([
        api.get('/loans', { signal }),
        api.get('/financiers', { signal })
      ])

      const mappedLoans = loansData.map(l => {
        const drawdownDateStr = l.drawdownDate ? fromInputDate(l.drawdownDate.split('T')[0]) : ''
        
        let displayStatus = 'Active'
        if (l.status === 'SETTLED') displayStatus = 'Closed'
        else if (l.status === 'OVERDUE') displayStatus = 'Overdue'

        return {
          id: l._id,
          noteNo: l.loanReference,
          financier: l.financierId?.name || '—',
          financierId: l.financierId?._id || l.financierId || '',
          loanDate: drawdownDateStr,
          amount: l.principalAmount,
          rate: String(l.interestRate),
          repaid: l.paidPrincipal,
          pending: l.outstandingPrincipal,
          remarks: l.notes || '',
          status: displayStatus,
          progress: Math.min(100, Math.round(((l.paidPrincipal || 0) / (l.principalAmount || 1)) * 100))
        }
      })

      if (!signal || !signal.aborted) {
        setLoans(mappedLoans)
        setFinanciers(financiersData)
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch loans')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchLoansAndFinanciers(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchLoansAndFinanciers()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (loan) => {
    setSelectedLoan(loan)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (loan) => {
    setSelectedLoan(loan)
    setForm({ ...loan })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount) || 0
    const selectedFinancierObj = financiers.find(f => f.name === form.financier)
    if (!selectedFinancierObj) {
      toast('Selected financier not found', 'error')
      return
    }

    const drawdown = new Date(toInputDate(form.loanDate))
    const maturity = new Date(drawdown)
    maturity.setMonth(maturity.getMonth() + 12) // Default to 12 months tenure

    const payload = {
      loanReference: form.noteNo,
      financierId: selectedFinancierObj._id,
      drawdownDate: toInputDate(form.loanDate),
      maturityDate: maturity.toISOString().split('T')[0],
      principalAmount: amt,
      interestRate: Number(form.rate) || selectedFinancierObj.defaultInterestRate || 12,
      notes: form.remarks,
      status: 'ACTIVE'
    }

    try {
      if (modalMode === 'add') {
        await api.post('/loans', payload)
      } else {
        await api.put(`/loans/${selectedLoan.id}`, {
          noteNumber: form.noteNo,
          amount: amt,
          date: toInputDate(form.loanDate),
          notes: form.remarks
        })
      }
      await fetchLoansAndFinanciers()
      setShowModal(false)
    } catch (err) {
      toast(err.message || 'Failed to save loan', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this loan entry? This action cannot be undone.', { title: 'Delete Loan' })) {
      try {
        await api.delete(`/loans/${id}`)
        await fetchLoansAndFinanciers()
      } catch (err) {
        toast(err.message || 'Failed to delete loan', 'error')
      }
    }
  }

  const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue')
  const totalExposure = activeLoans.reduce((s, l) => s + l.pending, 0)

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Loans</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeLoans.length} active loans · ₹{(totalExposure/100000).toFixed(1)}L total pending</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Add Loan</span>
        </button>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <EmptyState icon="search" title="Error Loading Loans" description={error} />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonCard key={idx} className="h-44" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <EmptyState 
            icon="loan" 
            title="No Loans Found" 
            description="Record a loan from settings or financier profile to begin tracking" 
            action={{ label: "Add Loan", onClick: handleOpenAdd }} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map((loan, i) => (
            <motion.div 
              key={loan._id || loan.id} 
              onClick={() => handleOpenPreview(loan)} 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:scale-[1.02] hover:shadow-md transition-all relative group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[11px] font-mono text-gray-400">Note #: {loan.noteNo || '—'}</p>
                  <h3 className="text-base font-semibold text-gray-900 mt-0.5">{toTitleCase(loan.financier)}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{loan.rate}% p.a. · Issued: {loan.loanDate}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={loan.status === 'Overdue' ? 'warning' : 'success'}>
                    {toTitleCase(loan.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Principal</p>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">₹{fmt(loan.amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Repaid</p>
                  <p className="text-sm font-semibold text-green-600 tabular-nums">₹{fmt(loan.repaid)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Pending</p>
                  <p className={`text-sm font-semibold tabular-nums ${loan.pending > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {loan.pending > 0 ? `₹${fmt(loan.pending)}` : 'Nil'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Repayment Progress</span>
                  <span className="font-medium text-gray-700">{loan.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${loan.progress}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-400 truncate max-w-[200px]" title={loan.remarks}>{loan.remarks || '—'}</span>
                <div className="flex items-center space-x-1">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(loan); }} className="text-gray-400 hover:text-brand-primary p-1 rounded hover:bg-gray-50">
                    <Eye size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(loan); }} className="text-gray-400 hover:text-brand-primary p-1 rounded hover:bg-gray-50">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(loan.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      {/* Add Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[500px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                {modalMode === 'add' ? 'Add Loan' : modalMode === 'edit' ? 'Edit Loan Details' : 'Loan Preview'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Financier</label>
                    <p className="font-bold text-gray-900">{toTitleCase(selectedLoan?.financier)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Note Number</label>
                    <p className="font-mono text-gray-900 font-semibold">{selectedLoan?.noteNo || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Loan Date</label>
                    <p className="text-gray-900">{selectedLoan?.loanDate}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Amount</label>
                    <p className="text-gray-900 font-bold tabular-nums">₹{fmt(selectedLoan?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Interest Rate (%)</label>
                    <p className="text-gray-900">{selectedLoan?.rate}% p.a.</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Pending Balance</label>
                    <p className="text-red-500 font-bold tabular-nums">₹{fmt(selectedLoan?.pending || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Remarks</label>
                    <p className="text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{selectedLoan?.remarks || '—'}</p>
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Note Number</label>
                    <input type="text" value={form.noteNo} onChange={e => setForm({...form, noteNo: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none font-mono" />
                  </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Loan Date *</label>
                  <CustomDatePicker
                    value={form.loanDate}
                    onChange={val => setForm({...form, loanDate: val})}
                  />
                </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Amount *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Interest Rate (%)</label>
                    <input type="number" step="0.01" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
                  <textarea rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Save Loan' : 'Update Loan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Loans
