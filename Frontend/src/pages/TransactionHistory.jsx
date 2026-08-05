import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Trash2, X } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import PrintPreviewModal from '../components/PrintPreviewModal'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'
import api from '../utils/api'

const fmt = (v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, minimumIntegerDigits: 1 }).format(v)

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

// Map backend transaction type → UI type label
const txTypeLabel = (type) => {
  switch (type) {
    case 'BILL_POSTED': return 'Bill'
    case 'BILL_PAID': return 'Payment'
    case 'LOAN_DRAWDOWN': return 'Loan'
    case 'LOAN_REPAYMENT':
    case 'REPAYMENT_PRINCIPAL':
    case 'REPAYMENT_INTEREST': return 'Repayment'
    case 'INTEREST_ACCRUED': return 'Interest'
    case 'CHEQUE_BOUNCED_REVERSAL': return 'Reversal'
    default: return toTitleCase(type)
  }
}

const isFinancierType = (type) => ['LOAN_DRAWDOWN', 'LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'INTEREST_ACCRUED'].includes(type)
const isPaymentType = (type) => ['BILL_PAID', 'LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'].includes(type)

export function TransactionHistory() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [printDoc, setPrintDoc] = useState(null)
  const [search, setSearch] = useState('')
  const [partyFilter, setPartyFilter] = useState('All Parties')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showDeleted, setShowDeleted] = useState(false)

  const fetchData = async (includeDeleted = false, signal) => {
    try {
      setLoading(true)
      const params = includeDeleted ? '?showDeleted=true' : ''
      const data = await api.get(`/ledger${params}`, { signal })

      const mapped = data.map((t, idx) => {
        const party = t.vendorId?.name || t.financierId?.name || '—'
        const partyId = t.financierId?._id || t.vendorId?._id || null
        return {
          id: t._id,
          date: formatDate(t.date),
          type: txTypeLabel(t.type),
          rawType: t.type,
          party,
          partyId,
          isFinancier: !!t.financierId || isFinancierType(t.type),
          ref: (t.referenceId?.toString?.()?.slice(-8)?.toUpperCase()) || `TXN-${idx + 1}`,
          description: t.description || '—',
          amount: t.amount,
          status: t.isDeleted ? 'Deleted' : 'Active',
          mongoId: t._id,
        }
      })
      if (!signal || !signal.aborted) {
        setTransactions(mapped)
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to load transactions')
      }
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchData(showDeleted, controller.signal)
    return () => controller.abort()
  }, [showDeleted])

  // Map user-facing type display names to internal types
  const typeFilterFn = (t) => {
    if (typeFilter === 'All Types') return true
    if (typeFilter === 'Bills') return t.rawType === 'BILL_POSTED'
    if (typeFilter === 'Loans') return t.rawType === 'LOAN_DRAWDOWN'
    if (typeFilter === 'Vendor Payments') return t.rawType === 'BILL_PAID'
    if (typeFilter === 'Financier Payments') return ['LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'].includes(t.rawType)
    return true
  }

  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch =
      (t.party || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.ref || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())

    const matchType = typeFilterFn(t)

    let matchParty = true
    if (partyFilter === 'Vendors') matchParty = !t.isFinancier
    else if (partyFilter === 'Financiers') matchParty = t.isFinancier

    const matchDeleted = showDeleted || t.status !== 'Deleted'
    return matchSearch && matchType && matchParty && matchDeleted
  }), [transactions, search, typeFilter, partyFilter, showDeleted])

  const tableContainerRef = React.useRef(null)

  const pagination = usePagination({
    items: filtered,
    moduleKey: 'transactions',
    initialPageSize: 20,
    filterDependencies: [search, partyFilter, typeFilter, showDeleted],
    containerRef: tableContainerRef
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Transaction History</h1>
        <p className="text-sm text-gray-400 mt-0.5 font-medium">Complete audit trail of all financial transactions</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error} — <button onClick={() => fetchData(showDeleted)} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Party Filter */}
          <div className="w-48">
            <DropdownSelect
              value={partyFilter}
              onChange={val => setPartyFilter(val)}
              options={[
                { value: 'All Parties', label: 'All Parties' },
                { value: 'Vendors', label: 'Vendors' },
                { value: 'Financiers', label: 'Financiers' }
              ]}
            />
          </div>

          {/* Type Filter */}
          <div className="w-52">
            <DropdownSelect
              value={typeFilter}
              onChange={val => setTypeFilter(val)}
              options={[
                { value: 'All Types', label: 'All Types' },
                { value: 'Bills', label: 'Bills' },
                { value: 'Loans', label: 'Loans' },
                { value: 'Vendor Payments', label: 'Vendor Payments' },
                { value: 'Financier Payments', label: 'Financier Payments' }
              ]}
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer pl-2">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded text-brand-primary focus:ring-brand-primary" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium select-none">Show deleted</span>
          </label>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3">DATE</th>
                  <th className="text-left px-5 py-3">TYPE</th>
                  <th className="text-left px-5 py-3">PARTY</th>
                  <th className="text-left px-5 py-3">REFERENCE</th>
                  <th className="text-left px-5 py-3">DESCRIPTION</th>
                  <th className="text-right px-5 py-3">AMOUNT</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-20", "w-16", "w-32", "w-16", "w-40", "w-16", "w-12"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            {transactions.length === 0 ? (
              <EmptyState
                icon="history"
                title="No Transactions Found"
                description="Transaction history will populate as bills, payments, loans, and repayments are registered"
              />
            ) : (
              <EmptyState
                icon="search"
                title="No Results Found"
                description="No transactions match your current search and filter settings"
              />
            )}
          </div>
        ) : (
          <>
            <div ref={tableContainerRef} className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">DATE</th>
                    <th className="text-left px-5 py-3">TYPE</th>
                    <th className="text-left px-5 py-3">PARTY</th>
                    <th className="text-left px-5 py-3">REFERENCE</th>
                    <th className="text-left px-5 py-3">DESCRIPTION</th>
                    <th className="text-right px-5 py-3">AMOUNT</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                  {pagination.paginatedItems.map((t, i) => (
                    <motion.tr 
                      key={t.id} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      onClick={() => {
                        if (t.isFinancier && t.partyId) {
                          navigate(`/financiers/${t.partyId}`)
                        } else if (t.referenceId) {
                          let docType = 'payment'
                          if (t.rawType === 'BILL_POSTED') docType = 'bill'
                          else if (t.rawType === 'LOAN_DRAWDOWN') docType = 'loan'
                          else if (t.rawType === 'LOAN_REPAYMENT' || t.rawType === 'REPAYMENT_PRINCIPAL' || t.rawType === 'REPAYMENT_INTEREST') docType = 'repayment'
                          setPrintDoc({ type: docType, id: t.referenceId })
                        }
                      }}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer ${t.status === 'Deleted' ? 'opacity-55' : ''}`}
                    >
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">{t.date}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={isPaymentType(t.rawType) ? 'success' : 'info'}>
                          {toTitleCase(t.type)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {t.isFinancier && t.partyId ? (
                          <span className="text-sm font-semibold" style={{color: 'var(--color-primary)'}}>{toTitleCase(t.party)}</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{toTitleCase(t.party)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400 dark:text-gray-500">{t.ref}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{toTitleCase(t.description)}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right tabular-nums">₹{fmt(t.amount)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={t.status === 'Active' ? 'success' : 'danger'}>
                          {toTitleCase(t.status)}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} isLoading={loading} />
          </>
        )}
      </div>

      {printDoc && (
        <PrintPreviewModal
          type={printDoc.type}
          id={printDoc.id}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  )
}

export default TransactionHistory
