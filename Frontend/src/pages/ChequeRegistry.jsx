import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toInputDate, fromInputDate } from '../utils/date'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import PartyTypeBadge from '../components/ui/PartyTypeBadge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'

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
    date: '',
    amount: '',
    bank: '',
    partyType: '',
    party: '',
    partyId: '',
    status: '',
    remarks: ''
  }
  const [form, setForm] = useState(emptyForm)

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

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (c) => {
    setSelectedCheque(c)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (c) => {
    setSelectedCheque(c)
    setForm({ ...c })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount) || 0

    const partyOptions = form.partyType === 'Vendor' ? vendors : financiers
    const partyRecord = partyOptions.find(p => p.name === form.party || p._id === form.partyId)

    const payload = {
      chequeNumber: form.chequeNo,
      type: BE_TYPE_MAP[form.partyType] || 'OTHER',
      partyName: form.party,
      amount: amt,
      chequeDate: toInputDate(form.date),
      vendorId: form.partyType === 'Vendor' ? (partyRecord?._id || null) : null,
      financierId: form.partyType === 'Financier' ? (partyRecord?._id || null) : null,
    }

    try {
      if (modalMode === 'add') {
        await api.post('/cheques', payload)
      } else {
        // Update status only via PATCH /cheques/:id/status
        const beStatus = FE_STATUS_MAP[form.status] || 'PENDING'
        await api.patch(`/cheques/${selectedCheque.id}/status`, { status: beStatus })
      }
      await fetchData()
      setShowModal(false)
    } catch (err) {
      toast(err.message || 'Failed to save cheque', 'error')
    }
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

  const filtered = cheques.filter(c => {
    const matchSearch = c.chequeNo.includes(search) || (c.party || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All Status' || c.status === statusFilter
    return matchSearch && matchStatus
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
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
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
              {filtered.map((c, i) => (
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
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(c); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-gray-400 hover:text-red-500 p-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-[480px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {modalMode === 'add' ? 'Add Cheque' : modalMode === 'edit' ? 'Update Cheque Status' : 'Cheque Details Preview'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Cheque Number</label>
                    <p className="font-mono text-gray-900 dark:text-white font-bold">{selectedCheque?.chequeNo}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Cheque Date</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedCheque?.date}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Amount</label>
                    <p className="text-brand-primary font-bold tabular-nums">₹{fmt(selectedCheque?.amount || 0)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Bank Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedCheque?.bank !== '—' ? toTitleCase(selectedCheque?.bank) : '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Party Type</label>
                    <PartyTypeBadge type={selectedCheque?.partyType} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Party Name</label>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm mt-0.5">{toTitleCase(selectedCheque?.party)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Status</label>
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
                    <label className="text-xs text-gray-400 uppercase font-semibold">Remarks</label>
                    <p className="text-gray-900 dark:text-white">{selectedCheque?.remarks || '—'}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary/95">Close</button>
                </div>
              </div>
            ) : modalMode === 'edit' ? (
              /* Edit mode — only allow updating status */
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Cheque <span className="font-mono font-bold">{selectedCheque?.chequeNo}</span> — ₹{fmt(selectedCheque?.amount || 0)} — {toTitleCase(selectedCheque?.party)}</p>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Update Status</label>
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
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">Update Status</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Cheque Number * (6 digits)</label>
                    <input type="text" required pattern="\d{6}" maxLength={6} value={form.chequeNo} onChange={e => setForm({...form, chequeNo: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Cheque Date *</label>
                    <CustomDatePicker
                      value={form.date}
                      onChange={val => setForm({...form, date: val})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Amount *</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Bank Name</label>
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
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Party Type</label>
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
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Party Name</label>
                    <DropdownSelect
                      value={form.party}
                      onChange={val => setForm({...form, party: val})}
                      placeholder="Select Party"
                      options={partyOptions}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    Save Cheque
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

export default ChequeRegistry
