import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, Eye, X } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
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

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const toCamelCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s+/g, '')
}

export function Vendors() {
  const toast = useToast()
  const confirm = useConfirm()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedVendor, setSelectedVendor] = useState(null)

  const emptyForm = {
    name: '',
    type: '',
    customType: '',
    gstin: '',
    phone: '',
    address: '',
    bankName: '',
    accountNo: '',
    confirmAccountNo: '',
    ifsc: '',
    confirmIfsc: '',
    category: '',
    openingBalance: 0,
    status: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const fetchVendors = async (signal) => {
    try {
      setLoading(true)
      const data = await api.get('/vendors', { signal })
      if (!signal || !signal.aborted) {
        setVendors(data.map(v => ({
          ...v,
          id: v._id,
          outstanding: v.outstandingBalance
        })))
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch vendors')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchVendors(controller.signal)
    return () => controller.abort()
  }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setFormErrors({})
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (vendor) => {
    setSelectedVendor(vendor)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (vendor) => {
    setSelectedVendor(vendor)
    setForm({
      ...vendor,
      confirmAccountNo: vendor.accountNo || '',
      confirmIfsc: vendor.ifsc || '',
      type: vendor.type || 'largeVendor'
    })
    setFormErrors({})
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    // Validate confirm fields
    const errors = {}
    if (form.accountNo && form.accountNo !== form.confirmAccountNo) {
      errors.confirmAccountNo = 'Account numbers do not match'
    }
    if (form.ifsc && form.ifsc !== form.confirmIfsc) {
      errors.confirmIfsc = 'IFSC codes do not match'
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const payload = {
      name: form.name,
      type: form.type || 'largeVendor',
      gstin: form.gstin,
      phone: form.phone,
      address: form.address,
      bankName: form.bankName,
      accountNo: form.accountNo,
      ifsc: form.ifsc,
      category: form.category,
      openingBalance: Number(form.openingBalance) || 0,
      status: form.status || 'Active'
    }

    try {
      if (modalMode === 'add') {
        await api.post('/vendors', payload)
      } else {
        await api.put(`/vendors/${selectedVendor.id}`, payload)
      }
      await fetchVendors()
      setShowModal(false)
    } catch (err) {
      toast(err.message || 'Failed to save vendor', 'error')
    }
  }

  const handleDelete = async (id) => {
    const vendor = vendors.find(v => v.id === id)
    const name = vendor ? vendor.name : ''
    if (await confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`, { title: 'Delete Vendor' })) {
      try {
        await api.delete(`/vendors/${id}`)
        await fetchVendors()
      } catch (err) {
        toast(err.message || 'Failed to delete vendor', 'error')
      }
    }
  }

  const filtered = vendors.filter(v =>
    (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.gstin || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-400 mt-0.5">{vendors.length} vendors in system</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Total Vendors</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Active Accounts</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-gray-900">{vendors.filter(v => v.status === 'Active').length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Total Payables Outstanding</p>
          {loading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold text-red-500">₹{fmt(vendors.reduce((s,v) => s + v.outstanding, 0))}</p>}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState icon="search" title="Error Loading Vendors" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">VENDOR NAME</th>
                  <th className="text-left px-5 py-3">TYPE</th>
                  <th className="text-left px-5 py-3">PHONE</th>
                  <th className="text-left px-5 py-3">CATEGORY</th>
                  <th className="text-right px-5 py-3">OUTSTANDING</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-32", "w-16", "w-24", "w-20", "w-16", "w-12", "w-8"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {vendors.length === 0 ? (
              <EmptyState 
                icon="store" 
                title="No Vendors Found" 
                description="Add your first vendor to get started" 
                action={{ label: "Add Vendor", onClick: handleOpenAdd }} 
              />
            ) : (
              <EmptyState 
                icon="search" 
                title="No Results" 
                description="No vendors match your search. Try different keywords." 
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3">VENDOR NAME</th>
                <th className="text-left px-5 py-3">TYPE</th>
                <th className="text-left px-5 py-3">PHONE</th>
                <th className="text-left px-5 py-3">CATEGORY</th>
                <th className="text-right px-5 py-3">OUTSTANDING</th>
                <th className="text-left px-5 py-3">STATUS</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((v, i) => (
                <motion.tr 
                  key={v._id || v.id} 
                  onClick={() => handleOpenPreview(v)} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                        {initials(v.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{toTitleCase(v.name)}</p>
                        <p className="text-xs text-gray-400">GST: {v.gstin || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <Badge variant="neutral">{toTitleCase(v.type)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{v.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{toTitleCase(v.category)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">₹{fmt(v.outstanding)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={String(v.status).toLowerCase() === 'active' ? 'success' : 'danger'}>
                      {toTitleCase(v.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenPreview(v); }} title="Preview" className="text-gray-400 hover:text-brand-primary transition-colors p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(v); }} title="Edit" className="text-gray-400 hover:text-brand-primary transition-colors p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} title="Delete" className="text-gray-400 hover:text-red-500 transition-colors p-1">
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
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-800 w-[540px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-6 overflow-y-auto max-h-[90vh] relative z-10"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  {modalMode === 'add' ? 'Add Vendor' : modalMode === 'edit' ? 'Edit Vendor' : 'Vendor Preview'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
              </div>

              {modalMode === 'preview' ? (
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Vendor Name</label>
                      <p className="font-bold text-gray-900 dark:text-white text-base">{toTitleCase(selectedVendor?.name)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Type</label>
                      <Badge variant="neutral">{toTitleCase(selectedVendor?.type)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 dark:border-slate-700/50">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Phone</label>
                      <p className="font-medium text-gray-950 dark:text-white font-mono">{selectedVendor?.phone || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Email</label>
                      <p className="font-medium text-gray-950 dark:text-white truncate">{selectedVendor?.email || '—'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-50 dark:border-slate-700/50">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Address</label>
                    <p className="font-medium text-gray-950 dark:text-white">{selectedVendor?.address || '—'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 dark:border-slate-700/50">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">GSTIN</label>
                      <p className="font-medium text-gray-950 dark:text-white font-mono">{selectedVendor?.gstin || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Item Category</label>
                      <p className="font-medium text-gray-950 dark:text-white">{toTitleCase(selectedVendor?.category)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-50 dark:border-slate-700/50">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Bank Name</label>
                      <p className="font-medium text-gray-950 dark:text-white">{selectedVendor?.bankName || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Account Number</label>
                      <p className="font-medium text-gray-950 dark:text-white font-mono">{selectedVendor?.accountNo || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">IFSC Code</label>
                      <p className="font-medium text-gray-950 dark:text-white font-mono">{selectedVendor?.ifsc || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 dark:border-slate-700/50">
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Opening Balance</label>
                      <p className="font-medium text-gray-950 dark:text-white tabular-nums">₹{fmt(selectedVendor?.openingBalance || 0)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase font-semibold">Current Outstanding</label>
                      <p className="font-bold text-red-500 tabular-nums">₹{fmt(selectedVendor?.outstanding || 0)}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/95">Close Preview</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Vendor Name *</label>
                      <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Vendor Type *</label>
                      <DropdownSelect
                        value={form.type}
                        onChange={val => setForm({...form, type: val})}
                        placeholder="Select Vendor Type"
                        options={[
                          { value: 'smallVendor', label: 'Small Vendor' },
                          { value: 'largeVendor', label: 'Big Vendor' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                      <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">GSTIN</label>
                      <input type="text" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Address</label>
                    <textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Bank Name</label>
                      <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Account Number</label>
                      <input type="text" value={form.accountNo} onChange={e => setForm({...form, accountNo: e.target.value, confirmAccountNo: form.confirmAccountNo})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Confirm Account No.</label>
                      <input type="text" value={form.confirmAccountNo} onChange={e => { setForm({...form, confirmAccountNo: e.target.value}); setFormErrors({...formErrors, confirmAccountNo: undefined}) }}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none font-mono ${formErrors.confirmAccountNo ? 'border-red-400' : 'border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white'}`} />
                      {formErrors.confirmAccountNo && <p className="text-xs text-red-500 mt-1">{formErrors.confirmAccountNo}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">IFSC Code</label>
                      <input type="text" value={form.ifsc} onChange={e => setForm({...form, ifsc: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Confirm IFSC Code</label>
                      <input type="text" value={form.confirmIfsc} onChange={e => { setForm({...form, confirmIfsc: e.target.value}); setFormErrors({...formErrors, confirmIfsc: undefined}) }}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none font-mono ${formErrors.confirmIfsc ? 'border-red-400' : 'border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white'}`} />
                      {formErrors.confirmIfsc && <p className="text-xs text-red-500 mt-1">{formErrors.confirmIfsc}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Item Category</label>
                      <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Opening Balance</label>
                      <input type="number" value={form.openingBalance} onChange={e => setForm({...form, openingBalance: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Status</label>
                      <DropdownSelect
                        value={form.status}
                        onChange={val => setForm({...form, status: val})}
                        placeholder="Select Status"
                        options={[
                          { value: 'Active', label: 'Active' },
                          { value: 'Inactive', label: 'Inactive' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                      {modalMode === 'add' ? 'Save Vendor' : 'Update Vendor'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Vendors
