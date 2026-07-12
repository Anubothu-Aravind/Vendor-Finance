import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import PartyTypeBadge from '../components/ui/PartyTypeBadge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import api from '../utils/api'

const fmt = (v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, minimumIntegerDigits: 1 }).format(v)

const initials = (name) => (name || '').split(' ').slice(0,2).map(w => w[0] || '').join('').toUpperCase() || '?'
const avatarColors = ['bg-red-100 text-red-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700']

// Format date from ISO string to readable
const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export function OutstandingStatement() {
  const [parties, setParties] = useState([])
  const [kpis, setKpis] = useState({ totalOutstanding: 0, vendorPayables: 0, loanOutstanding: 0, vendorCount: 0, financierCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await api.get('/reports/outstanding')
      setKpis(data.kpis || { totalOutstanding: 0, vendorPayables: 0, loanOutstanding: 0, vendorCount: 0, financierCount: 0 })
      const mapped = (data.parties || []).map((p, idx) => ({
        id: p._id,
        name: p.name || '—',
        type: (p.type || '').toLowerCase(), // 'vendor' or 'financier'
        items: p.items || 0,
        total: p.total || 0,
        paid: p.paid || 0,
        outstanding: p.outstanding || 0,
        oldestDue: formatDate(p.oldestDue),
        daysOverdue: p.daysOverdue || null,
        idx,
      }))
      setParties(mapped.filter(p => p.outstanding > 0)) // only show parties with outstanding
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load outstanding data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalOutstanding = kpis.totalOutstanding

  const filtered = parties.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || p.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Outstanding Statement</h1>
        <p className="text-sm text-gray-400 mt-0.5 font-medium">Combined outstanding balances across vendors and financiers</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error} — <button onClick={fetchData} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Hero Banner */}
      {loading ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <div className="rounded-xl p-6" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Outstanding Balance</p>
          <p className="text-4xl font-bold tabular-nums mb-2" style={{ color: 'var(--color-text-inverse)', fontFamily: 'var(--font-display)' }}>₹{fmt(totalOutstanding)}</p>
          <div className="flex items-center gap-6 mt-1">
            <span className="text-sm" style={{ color: 'rgba(0,0,0,0.55)' }}>
              Vendor payables: <span className="font-semibold" style={{ color: 'var(--color-text-inverse)' }}>₹{fmt(kpis.vendorPayables)}</span>
            </span>
            <span className="text-sm" style={{ color: 'rgba(0,0,0,0.55)' }}>
              Loan outstanding: <span className="font-semibold" style={{ color: 'var(--color-text-inverse)' }}>₹{fmt(kpis.loanOutstanding)}</span>
            </span>
            <span className="text-sm" style={{ color: 'rgba(0,0,0,0.55)' }}>
              {kpis.vendorCount + kpis.financierCount} parties with outstanding balances
            </span>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center space-x-3">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search parties..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
          </div>
          <div className="w-48">
            <DropdownSelect
              value={typeFilter}
              onChange={val => setTypeFilter(val)}
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'vendor', label: 'Vendor' },
                { value: 'financier', label: 'Financier' }
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3">NAME</th>
                  <th className="text-left px-5 py-3">TYPE</th>
                  <th className="text-right px-5 py-3">ITEMS</th>
                  <th className="text-right px-5 py-3">TOTAL AMOUNT</th>
                  <th className="text-right px-5 py-3">PAID</th>
                  <th className="text-right px-5 py-3">OUTSTANDING</th>
                  <th className="text-left px-5 py-3">OLDEST DUE</th>
                  <th className="text-right px-5 py-3">DAYS OVERDUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={8} widths={["w-32", "w-16", "w-10", "w-16", "w-16", "w-16", "w-20", "w-10"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {parties.length === 0 ? (
              <EmptyState
                icon="ledger"
                title="No Outstanding Items"
                description="Balances across vendors and financiers are completely clear"
              />
            ) : (
              <EmptyState
                icon="search"
                title="No Matches Found"
                description="No statement records match your search criteria"
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-5 py-3">NAME</th>
                <th className="text-left px-5 py-3">TYPE</th>
                <th className="text-right px-5 py-3">ITEMS</th>
                <th className="text-right px-5 py-3">TOTAL AMOUNT</th>
                <th className="text-right px-5 py-3">PAID</th>
                <th className="text-right px-5 py-3">OUTSTANDING</th>
                <th className="text-left px-5 py-3">OLDEST DUE</th>
                <th className="text-right px-5 py-3">DAYS OVERDUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
              {filtered.map((p, i) => (
                <motion.tr 
                  key={p.id} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColors[p.idx % avatarColors.length]}`}>
                        {initials(p.name)}
                      </div>
                      {p.type === 'financier' ? (
                        <Link to={`/financiers/${p.id}`} className="text-sm font-semibold text-brand-primary no-underline" style={{textDecoration:'none'}}>{toTitleCase(p.name)}</Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{toTitleCase(p.name)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <PartyTypeBadge type={p.type} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 text-right tabular-nums">{p.items > 0 ? p.items : '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 text-right tabular-nums">{p.total > 0 ? `₹${fmt(p.total)}` : '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-green-600 text-right tabular-nums">{p.paid > 0 ? `₹${fmt(p.paid)}` : '—'}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    <span className={`text-sm font-bold ${p.outstanding > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {p.outstanding > 0 ? `₹${fmt(p.outstanding)}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 font-mono">{p.oldestDue}</td>
                  <td className="px-5 py-3.5 text-right">
                    {p.daysOverdue !== null && p.daysOverdue !== undefined && p.daysOverdue !== 0
                      ? <span className="text-sm font-bold text-red-500 tabular-nums">{p.daysOverdue}d</span>
                      : <span className="text-sm text-gray-400">—</span>
                    }
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400">
          1–{filtered.length} of {filtered.length}
        </div>
      </div>
    </div>
  )
}

export default OutstandingStatement
