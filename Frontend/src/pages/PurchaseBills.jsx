import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X } from 'lucide-react'
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

export function PurchaseBills() {
  const toast = useToast()
  const confirm = useConfirm()
  const [bills, setBills] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    date: '29-06-2026',
    dueDate: '29-07-2026',
    amount: '',
    remarks: '',
  }
  const [form, setForm] = useState(emptyForm)

  const fetchBillsAndVendors = async (signal) => {
    try {
      setLoading(true)
      const [billsData, vendorsData] = await Promise.all([
        api.get('/bills', { signal }),
        api.get('/vendors', { signal })
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
        setBills(mapped)
        setVendors(vendorsData)
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch bills')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchBillsAndVendors(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchBillsAndVendors()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  const vendorListOptions = useMemo(() => {
    return vendors.map(v => ({ value: v._id, label: toTitleCase(v.name) }))
  }, [vendors])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (bill) => {
    setSelectedBill(bill)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (bill) => {
    setSelectedBill(bill)
    setForm({
      ...bill,
      vendor: bill.vendorId || bill.vendor,
      customPaymentType: ['Credit', 'cash'].includes(bill.paymentType) ? '' : bill.paymentType,
      paymentType: ['Credit', 'cash'].includes(bill.paymentType) ? bill.paymentType : 'custom'
    })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
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
    } catch (err) {
      toast(err.message || 'Failed to save bill', 'error')
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[500px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                {modalMode === 'add' ? 'Add Purchase Bill' : modalMode === 'edit' ? 'Edit Purchase Bill' : 'Purchase Bill Preview'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
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
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Save Bill' : 'Update Bill'}
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

export default PurchaseBills
