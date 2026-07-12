import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Edit2, Eye, X, Building2 } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

export function Financiers() {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [financiers, setFinanciers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'preview'
  const [selectedFin, setSelectedFin] = useState(null)

  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    status: '',
    notes: '',
    defaultInterestRate: 12
  }
  const [form, setForm] = useState(emptyForm)

  const fetchFinanciers = async (signal) => {
    try {
      setLoading(true)
      const data = await api.get('/financiers', { signal })
      if (!signal || !signal.aborted) {
        setFinanciers(data.map(f => ({
          ...f,
          id: f._id,
          outstanding: f.outstandingBalance
        })))
        setLoading(false)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to fetch financiers')
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchFinanciers(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleDataChanged = () => {
      fetchFinanciers()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setModalMode('add')
    setShowModal(true)
  }

  const handleOpenPreview = (fin) => {
    setSelectedFin(fin)
    setModalMode('preview')
    setShowModal(true)
  }

  const handleOpenEdit = (fin) => {
    setSelectedFin(fin)
    setForm({ ...fin })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      phone: form.phone,
      address: form.address,
      status: form.status || 'Active',
      notes: form.notes,
      defaultInterestRate: Number(form.defaultInterestRate) || 12
    }

    try {
      if (modalMode === 'add') {
        await api.post('/financiers', payload)
      } else {
        await api.put(`/financiers/${selectedFin.id}`, payload)
      }
      await fetchFinanciers()
      setShowModal(false)
    } catch (err) {
      toast(err.message || 'Failed to save financier', 'error')
    }
  }

  const handleDelete = async (id) => {
    const financier = financiers.find(f => f.id === id)
    const name = financier ? financier.name : ''
    if (await confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`, { title: 'Delete Financier' })) {
      try {
        await api.delete(`/financiers/${id}`)
        await fetchFinanciers()
      } catch (err) {
        toast(err.message || 'Failed to delete financier', 'error')
      }
    }
  }

  const filtered = financiers.filter(f =>
    (f.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.notes && f.notes.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-400 mt-0.5">{financiers.length} financiers registered</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-1.5 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/95 transition-all shadow-sm">
          <Plus size={16} />
          <span>Add Finance</span>
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Total Financiers</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-gray-900">{financiers.length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Active Accounts</p>
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-gray-900">{financiers.filter(f => f.status === 'Active').length}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-0" style={{ flex: '1 1 0%', boxSizing: 'border-box' }}>
          <p className="text-xs text-gray-400 mb-1">Outstanding Exposure</p>
          {loading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold text-red-500">₹{fmt(financiers.reduce((s,f) => s + f.outstanding, 0))}</p>}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search financiers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <EmptyState icon="search" title="Error Loading Financiers" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3">NAME</th>
                  <th className="text-left px-5 py-3">PHONE</th>
                  <th className="text-left px-5 py-3">ADDRESS</th>
                  <th className="text-right px-5 py-3">ACTIVE LOANS</th>
                  <th className="text-right px-5 py-3">OUTSTANDING</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-32", "w-24", "w-40", "w-16", "w-16", "w-12", "w-8"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {financiers.length === 0 ? (
              <EmptyState 
                icon="bank" 
                title="No Financiers Found" 
                description="Add your first financier to start managing loans" 
                action={{ label: "Add Financier", onClick: handleOpenAdd }} 
              />
            ) : (
              <EmptyState 
                icon="search" 
                title="No Results" 
                description="No financiers match your search. Try different keywords." 
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-5 py-3">NAME</th>
                <th className="text-left px-5 py-3">PHONE</th>
                <th className="text-left px-5 py-3">ADDRESS</th>
                <th className="text-right px-5 py-3">ACTIVE LOANS</th>
                <th className="text-right px-5 py-3">OUTSTANDING</th>
                <th className="text-left px-5 py-3">STATUS</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((f, i) => (
                <motion.tr 
                  key={f._id || f.id} 
                  onClick={() => navigate(`/financiers/${f.id}`)} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <Link to={`/financiers/${f.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-brand-primary no-underline block" style={{textDecoration: 'none'}} onMouseEnter={e => e.currentTarget.style.textDecoration='underline'} onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>{toTitleCase(f.name)}</Link>
                        {f.notes && <p className="text-xs text-gray-400 truncate max-w-[180px]">{f.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 font-mono">{f.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 truncate max-w-[200px]">{f.address || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-900 text-right tabular-nums font-semibold">{f.loansCount}</td>
                  <td className="px-5 py-3.5 text-sm text-red-500 text-right font-bold tabular-nums">₹{fmt(f.outstanding)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={String(f.status).toLowerCase() === 'active' ? 'success' : 'danger'}>
                      {toTitleCase(f.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/financiers/${f.id}`); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Eye size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(f); }} className="text-gray-400 hover:text-brand-primary p-1">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="text-gray-400 hover:text-red-500 p-1">
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
          <div className="bg-white w-[480px] rounded-xl border border-gray-200 shadow-xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                {modalMode === 'add' ? 'Add Finance' : modalMode === 'edit' ? 'Edit Finance' : 'Finance Details'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {modalMode === 'preview' ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Name</label>
                    <p className="font-bold text-gray-900 text-base">{toTitleCase(selectedFin?.name)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold">Phone</label>
                    <p className="text-gray-900">{selectedFin?.phone || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Address</label>
                    <p className="text-gray-900">{selectedFin?.address || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Status</label>
                    <Badge variant={String(selectedFin?.status).toLowerCase() === 'active' ? 'success' : 'danger'}>
                      {toTitleCase(selectedFin?.status)}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{selectedFin?.notes || '—'}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-brand-primary text-white text-sm rounded-lg hover:bg-brand-primary/95">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                  <textarea rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
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
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90">
                    {modalMode === 'add' ? 'Save Financier' : 'Update Financier'}
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

export default Financiers
