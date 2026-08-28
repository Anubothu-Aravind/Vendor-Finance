import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, History, ArrowDownLeft, ArrowUpRight, DollarSign, Eye } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import PrintPreviewModal from '../components/PrintPreviewModal'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { Card, KpiCard } from '../components/ui/Card'
import FilterToolbar from '../components/ui/FilterToolbar'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'
import api from '../utils/api'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

import { formatDateDisplay } from '../utils/date'

const formatDate = formatDateDisplay

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

const getTxBadgeVariant = (type) => {
  switch (type) {
    case 'BILL_POSTED': return 'info'
    case 'BILL_PAID': return 'success'
    case 'LOAN_DRAWDOWN': return 'purple'
    case 'LOAN_REPAYMENT':
    case 'REPAYMENT_PRINCIPAL':
    case 'REPAYMENT_INTEREST': return 'teal'
    case 'CHEQUE_BOUNCED_REVERSAL': return 'danger'
    default: return 'neutral'
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
  const [partyFilter, setPartyFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
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
          referenceId: t.referenceId
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

  const typeFilterFn = (t) => {
    if (typeFilter === 'ALL') return true
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

  const totalVolume = useMemo(() => filtered.reduce((s, t) => s + (t.amount || 0), 0), [filtered])
  const creditCount = useMemo(() => filtered.filter(t => isPaymentType(t.rawType)).length, [filtered])
  const debitCount = useMemo(() => filtered.filter(t => !isPaymentType(t.rawType)).length, [filtered])

  const tableContainerRef = React.useRef(null)

  const pagination = usePagination({
    items: filtered,
    moduleKey: 'transactions',
    initialPageSize: 20,
    filterDependencies: [search, partyFilter, typeFilter, showDeleted],
    containerRef: tableContainerRef
  })

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Transaction History"
        description="Comprehensive chronological audit trail of all financial movements and entries"
        breadcrumbs={[{ label: 'Transactions' }]}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
        <KpiCard
          title="Total Transaction Volume"
          value={loading ? <Skeleton className="h-8 w-32" /> : `₹${fmt(totalVolume)}`}
          subtitle="Aggregate cash & invoice flow"
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40"
        />
        <KpiCard
          title="Payment Outflows"
          value={loading ? <Skeleton className="h-8 w-16" /> : String(creditCount)}
          subtitle="Vendor & loan settlements"
          icon={ArrowUpRight}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40"
        />
        <KpiCard
          title="Invoices & Liabilities"
          value={loading ? <Skeleton className="h-8 w-16" /> : String(debitCount)}
          subtitle="Bills & loan drawdowns"
          icon={ArrowDownLeft}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40"
        />
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search party, reference #, description..."
        isFiltered={search !== '' || partyFilter !== 'ALL' || typeFilter !== 'ALL' || showDeleted}
        onReset={() => { setSearch(''); setPartyFilter('ALL'); setTypeFilter('ALL'); setShowDeleted(false); }}
      >
        <div className="w-full sm:w-44">
          <DropdownSelect
            value={partyFilter}
            onChange={setPartyFilter}
            options={[
              { value: 'ALL', label: 'All Entities' },
              { value: 'Vendors', label: 'Vendors' },
              { value: 'Financiers', label: 'Financiers' }
            ]}
          />
        </div>
        <div className="w-full sm:w-52">
          <DropdownSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'Bills', label: 'Bills' },
              { value: 'Loans', label: 'Loans' },
              { value: 'Vendor Payments', label: 'Vendor Payments' },
              { value: 'Financier Payments', label: 'Financier Payments' }
            ]}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer pl-1 py-1">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={e => setShowDeleted(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium select-none">Show deleted</span>
        </label>
      </FilterToolbar>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8">
            <EmptyState icon="search" title="Error Loading Transactions" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Party</th>
                  <th className="px-6 py-3.5">Reference</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-24", "w-20", "w-36", "w-20", "w-48", "w-20", "w-16"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            {transactions.length === 0 ? (
              <EmptyState
                icon="history"
                title="No Transactions Found"
                description="Transactions will appear here as bills, payments, and loan activities occur."
              />
            ) : (
              <EmptyState
                icon="search"
                title="No Matching Transactions"
                description="No transactions match your current search and filter criteria."
              />
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
              {pagination.paginatedItems.map((t, i) => (
                <div 
                  key={t.id || i}
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
                  className={`p-4 space-y-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${t.status === 'Deleted' ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">{t.date}</span>
                    <Badge variant={getTxBadgeVariant(t.rawType)} dot>
                      {toTitleCase(t.type)}
                    </Badge>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{toTitleCase(t.party)}</p>
                      <p className="text-xs font-mono text-slate-400 font-semibold">{t.ref}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                        ₹{fmt(t.amount)}
                      </span>
                      <Badge variant={t.status === 'Active' ? 'success' : 'danger'} dot>
                        {toTitleCase(t.status)}
                      </Badge>
                    </div>
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-500 truncate pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      {toTitleCase(t.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div ref={tableContainerRef} className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Party</th>
                    <th className="px-6 py-3.5">Reference</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pagination.paginatedItems.map((t, i) => (
                    <tr 
                      key={t.id || i}
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
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer h-14 ${t.status === 'Deleted' ? 'opacity-50' : ''}`}
                    >
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{t.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getTxBadgeVariant(t.rawType)} dot>
                          {toTitleCase(t.type)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{toTitleCase(t.party)}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-500 font-semibold">{t.ref}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-normal max-w-[320px] truncate">{toTitleCase(t.description)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                        ₹{fmt(t.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={t.status === 'Active' ? 'success' : 'danger'} dot>
                          {toTitleCase(t.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} isLoading={loading} />
          </>
        )}
      </Card>

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
