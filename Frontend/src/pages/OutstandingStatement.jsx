import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, DollarSign, Building2, Landmark, Clock, ArrowRight } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import PartyTypeBadge from '../components/ui/PartyTypeBadge'
import PageHeader from '../components/ui/PageHeader'
import { Card, KpiCard } from '../components/ui/Card'
import FilterToolbar from '../components/ui/FilterToolbar'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'
import api from '../utils/api'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const initials = (name) => (name || '').split(' ').slice(0,2).map(w => w[0] || '').join('').toUpperCase() || '?'
const avatarColors = [
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-amber-50 text-amber-700 border-amber-200'
]

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export function OutstandingStatement() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [kpis, setKpis] = useState({ totalOutstanding: 0, vendorPayables: 0, loanOutstanding: 0, vendorCount: 0, financierCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const fetchData = async (signal) => {
    try {
      setLoading(true)
      const data = await api.get('/reports/outstanding', { signal })
      
      if (!signal || !signal.aborted) {
        setKpis(data.kpis || { totalOutstanding: 0, vendorPayables: 0, loanOutstanding: 0, vendorCount: 0, financierCount: 0 })
        const mapped = (data.parties || []).map((p, idx) => ({
          id: p._id,
          name: p.name || '—',
          type: (p.type || '').toLowerCase(),
          items: p.items || 0,
          total: p.total || 0,
          paid: p.paid || 0,
          outstanding: p.outstanding || 0,
          oldestDue: formatDate(p.oldestDue),
          daysOverdue: p.daysOverdue || null,
          idx,
        }))
        setParties(mapped.filter(p => p.outstanding > 0))
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to load outstanding data')
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

  const tableContainerRef = React.useRef(null)

  const filtered = useMemo(() => {
    return parties.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'ALL' || p.type === typeFilter.toLowerCase()
      return matchSearch && matchType
    })
  }, [parties, search, typeFilter])

  const pagination = usePagination({
    items: filtered,
    moduleKey: 'outstanding',
    initialPageSize: 20,
    filterDependencies: [search, typeFilter],
    containerRef: tableContainerRef
  })

  const handleRowClick = (p) => {
    navigate(`/ledger?party=${p.type}|${p.id}|${encodeURIComponent(p.name)}`)
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Outstanding Statement"
        description="Comprehensive summary of outstanding payables and loan balances across all entities"
        breadcrumbs={[{ label: 'Outstanding' }]}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Outstanding"
          value={loading ? <Skeleton className="h-7 w-28" /> : `₹${fmt(kpis.totalOutstanding)}`}
          subtitle={`${kpis.vendorCount + kpis.financierCount} accounts with pending balance`}
          icon={DollarSign}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40"
        />
        <KpiCard
          title="Vendor Payables"
          value={loading ? <Skeleton className="h-8 w-32" /> : `₹${fmt(kpis.vendorPayables)}`}
          subtitle={`${kpis.vendorCount} vendors awaiting payment`}
          icon={Building2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40"
        />
        <KpiCard
          title="Loan Outstanding"
          value={loading ? <Skeleton className="h-8 w-32" /> : `₹${fmt(kpis.loanOutstanding)}`}
          subtitle={`${kpis.financierCount} financier loan liabilities`}
          icon={Landmark}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40"
        />
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search party name..."
        isFiltered={search !== '' || typeFilter !== 'ALL'}
        onReset={() => { setSearch(''); setTypeFilter('ALL') }}
      >
        <div className="w-48">
          <DropdownSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'All Entities' },
              { value: 'vendor', label: 'Vendors' },
              { value: 'financier', label: 'Financiers' }
            ]}
          />
        </div>
      </FilterToolbar>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8">
            <EmptyState icon="search" title="Error Loading Statement" description={error} />
          </div>
        ) : loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Entity Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Items</th>
                  <th className="px-6 py-3.5 text-right">Total Amount</th>
                  <th className="px-6 py-3.5 text-right">Settled</th>
                  <th className="px-6 py-3.5 text-right">Outstanding</th>
                  <th className="px-6 py-3.5">Oldest Due Date</th>
                  <th className="px-6 py-3.5 text-right">Aging / Overdue</th>
                  <th className="px-6 py-3.5 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={9} widths={["w-36", "w-20", "w-12", "w-20", "w-20", "w-20", "w-24", "w-20", "w-16"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            {parties.length === 0 ? (
              <EmptyState
                icon="ledger"
                title="All Balances Clear"
                description="No outstanding liabilities found across vendors and financiers."
              />
            ) : (
              <EmptyState
                icon="search"
                title="No Matching Records"
                description="Try clearing search or entity filters."
              />
            )}
          </div>
        ) : (
          <>
            <div ref={tableContainerRef} className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Entity Name</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5 text-right">Items</th>
                    <th className="px-6 py-3.5 text-right">Total Amount</th>
                    <th className="px-6 py-3.5 text-right">Settled</th>
                    <th className="px-6 py-3.5 text-right">Outstanding</th>
                    <th className="px-6 py-3.5">Oldest Due Date</th>
                    <th className="px-6 py-3.5 text-right">Aging / Overdue</th>
                    <th className="px-6 py-3.5 text-right">Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pagination.paginatedItems.map((p) => (
                    <tr 
                      key={p.id} 
                      onClick={() => handleRowClick(p)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer h-16"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${avatarColors[p.idx % avatarColors.length]}`}>
                            {initials(p.name)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{toTitleCase(p.name)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PartyTypeBadge type={p.type} />
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{p.items || '—'}</td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-slate-100 font-medium tabular-nums whitespace-nowrap">₹{fmt(p.total)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">₹{fmt(p.paid)}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                        ₹{fmt(p.outstanding)}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.oldestDue}</td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums whitespace-nowrap">
                        {p.daysOverdue ? (
                          <span className="text-rose-600 dark:text-rose-400">{p.daysOverdue}d overdue</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">On time</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-end gap-1">
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
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
    </div>
  )
}

export default OutstandingStatement
