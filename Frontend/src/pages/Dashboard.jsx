import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { ArrowUpRight, CheckSquare, Coins, CreditCard, FileText, TrendingUp, Users } from 'lucide-react'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import api from '../utils/api'
import Skeleton from '../components/ui/Skeleton'
import { AlertsWidget } from '../components/dashboard/AlertsWidget'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// ── Query fetchers (stable references — defined outside component) ─────────────
const fetchSummary     = () => api.get('/dashboard/summary')
const fetchPayments    = () => api.get('/payments')
const fetchLoans       = () => api.get('/loans')
const fetchCheques     = () => api.get('/cheques')
const fetchLedger      = () => api.get('/ledger')

export function Dashboard() {
  // ── TanStack Query: 5 parallel queries, all cached independently ────────────
  // staleTime=30s → background refresh every 30s when tab is active
  // No useEffect, no manual loading/error state, no race conditions
  const results = useQueries({
    queries: [
      { queryKey: ['dashboard-summary'],  queryFn: fetchSummary },
      { queryKey: ['payments'],           queryFn: fetchPayments },
      { queryKey: ['loans'],              queryFn: fetchLoans },
      { queryKey: ['cheques'],            queryFn: fetchCheques },
      { queryKey: ['ledger'],             queryFn: fetchLedger },
    ],
  })

  const [summaryQ, paymentsQ, loansQ, chequesQ, ledgerQ] = results

  // Derive a single loading flag — true while ANY query is still fetching for the first time
  const loading = results.some(r => r.isLoading)
  const error   = results.find(r => r.isError)?.error?.message

  // Stable data references — undefined until loaded
  const summary      = summaryQ.data
  const payments     = paymentsQ.data  ?? []
  const loans        = loansQ.data     ?? []
  const cheques      = chequesQ.data   ?? []
  const transactions = ledgerQ.data    ?? []

  // ── KPIs: derived in render pass, memoised to prevent re-calc on unrelated renders
  const kpis = useMemo(() => {
    if (!summary) return []

    const todayStr  = new Date().toDateString()
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Inline .filter() — single pass, no separate state (modern pattern)
    const todayPmts  = payments.filter(p => !p.isDeleted && new Date(p.paymentDate || p.date).toDateString() === todayStr)
    const weekPmts   = payments.filter(p => !p.isDeleted && new Date(p.paymentDate || p.date) >= oneWeekAgo)
    const activeLoans = loans.filter(l => !l.isDeleted && String(l.status).toUpperCase() === 'ACTIVE')
    const pendingCheques = cheques.filter(c => !c.isDeleted && String(c.status).toUpperCase() === 'PENDING')

    return [
      { label: 'FINANCIER OUTSTANDING', value: `₹${fmt(summary.kpis.financierOutstanding)}`, change: 'Total financier exposure', color: 'text-blue-600 bg-blue-50 border-blue-100', link: '/outstanding', icon: Coins },
      { label: "TODAY'S PAYMENTS",      value: `₹${fmt(todayPmts.reduce((s,p) => s+p.amount, 0))}`, change: `${todayPmts.length} payments today`, color: 'text-gray-500 bg-gray-50 border-gray-100', link: '/payments', icon: CreditCard },
      { label: "THIS WEEK'S PAYMENTS",  value: `₹${fmt(weekPmts.reduce((s,p) => s+p.amount, 0))}`, change: `${weekPmts.length} payments this week`, color: 'text-green-600 bg-green-50 border-green-100', link: '/payments', icon: CreditCard },
      { label: 'OVERDUE BILLS',         value: `₹${fmt(summary.kpis.overdueBills)}`, change: 'Outstanding overdue payables', color: 'text-red-600 bg-red-50 border-red-100', link: '/bills', icon: FileText },
      { label: 'ACTIVE LOANS',          value: String(activeLoans.length), change: 'Active loan accounts', color: 'text-purple-600 bg-purple-50 border-purple-100', link: '/loans', icon: Coins },
      { label: 'UPCOMING CHEQUES',      value: `₹${fmt(pendingCheques.reduce((s,c) => s+c.amount, 0))}`, change: 'Cheques in transit / pending', color: 'text-amber-600 bg-amber-50 border-amber-100', link: '/cheques', icon: CheckSquare },
    ]
  }, [summary, payments, loans, cheques])

  // ── Pie chart data: derived, not stored ─────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Vendor Payables', value: summary?.kpis.vendorOutstanding ?? 0, color: 'var(--color-primary)' },
    { name: 'Loan Outstanding', value: summary?.kpis.financierOutstanding ?? 0, color: 'var(--color-info)' },
  ], [summary])

  // ── Recent transactions: slice + map — no separate state ────────────────────
  const recentTransactions = useMemo(() =>
    transactions.slice(0, 5).map(txn => ({
      date:   txn.date ? new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      type:   txn.type,
      party:  txn.vendorId?.name || txn.financierId?.name || txn.party || '—',
      ref:    txn.referenceNumber || txn.ref || '—',
      amount: txn.amount,
    })),
  [transactions])

  // ── Upcoming cheques: inline filter — no separate state ─────────────────────
  const upcomingCheques = useMemo(() =>
    cheques
      .filter(c => !c.isDeleted && String(c.status).toUpperCase() === 'PENDING')
      .slice(0, 5)
      .map(chq => ({
        chqNo:  chq.chequeNo || '—',
        date:   chq.chequeDate ? new Date(chq.chequeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        party:  chq.vendorId?.name || chq.financierId?.name || chq.partyName || '—',
        amount: chq.amount,
        status: chq.status || 'Pending',
      })),
  [cheques])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="search" title="Error Loading Dashboard" description={error} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold page-title" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Vastrams Vendor-Finance at a glance</p>
      </div>

      {/* KPI Grid */}
      <div className="flex flex-wrap w-full gap-4" style={{ boxSizing: 'border-box' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 min-w-0 flex-1 min-h-[96px] flex flex-col justify-between">
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))
        ) : (
          kpis.map((kpi, idx) => (
            <Link
              key={idx}
              to={kpi.link}
              className="rounded-xl p-4 flex flex-col justify-between min-w-0 transition-all"
              style={{
                flex: '1 1 0%',
                boxSizing: 'border-box',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-[150px]"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {kpi.label}
                </span>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums stat-value"
                  style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{kpi.value}</p>
                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{kpi.change}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Active System Alerts */}
      <AlertsWidget />

      {/* Charts & Top Outstandings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Breakdown Chart */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Outstanding Breakdown</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Total Payables vs Loan splits</p>
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 my-4">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <>
              <div className="flex justify-center my-4">
                <PieChart width={160} height={160}>
                  <Pie data={pieData} cx={80} cy={80} innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={v => `₹${fmt(v)}`}
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold pb-1.5"
                  style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <span>Category</span><span>Amount</span>
                </div>
                {pieData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }}></span>
                      <span>{d.name}</span>
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(d.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
                  <span>Total Outstanding</span>
                  <span className="tabular-nums">₹{fmt(pieData.reduce((s, r) => s + r.value, 0))}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Top Outstanding Vendors */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Top Outstanding Vendors</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Vendors with largest unpaid balances</p>
          <div className="space-y-3.5">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))
            ) : !summary?.topVendors?.length ? (
              <EmptyState icon="store" title="No Vendors Yet" description="Add vendors to see them appear here" />
            ) : (
              summary.topVendors.map((vendor, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{toTitleCase(vendor.name)}</p>
                    <p className="text-[10px] text-gray-400">GST: {vendor.gstin || '—'} · Category: {vendor.category || '—'}</p>
                  </div>
                  <span className={`text-xs font-bold ${vendor.outstandingBalance > 0 ? 'text-red-500' : 'text-gray-400'} tabular-nums`}>
                    {vendor.outstandingBalance > 0 ? `₹${fmt(vendor.outstandingBalance)}` : 'Clear'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Outstanding Financiers */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Top Outstanding Financiers</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Financier loan balances remaining</p>
          <div className="space-y-3.5">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))
            ) : !summary?.topFinanciers?.length ? (
              <EmptyState icon="bank" title="No Financiers" description="Add financiers to start managing loans" />
            ) : (
              summary.topFinanciers.map((fin, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{toTitleCase(fin.name)}</p>
                    <p className="text-[10px] text-gray-400">Phone: {fin.phone || '—'} · Address: {fin.address || '—'}</p>
                  </div>
                  <span className="text-xs font-bold text-red-500 tabular-nums">₹{fmt(fin.outstandingBalance)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions + Upcoming Cheques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Transactions</h3>
            <Link to="/transaction-history" className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--color-primary)' }}>View All</Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : recentTransactions.length === 0 ? (
              <EmptyState icon="receipt" title="No Recent Transactions" description="Transactions will appear here once bills or payments are recorded" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-left pb-2">DATE</th>
                    <th className="text-left pb-2">TYPE</th>
                    <th className="text-left pb-2">PARTY</th>
                    <th className="text-left pb-2">REFERENCE</th>
                    <th className="text-right pb-2">AMOUNT</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: 'var(--color-border)' }}>
                  {recentTransactions.map((txn, idx) => (
                    <tr key={idx} className="text-xs"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="py-2.5" style={{ color: 'var(--color-text-muted)' }}>{txn.date}</td>
                      <td className="py-2.5">
                        <Badge variant={txn.type.includes('PAID') || txn.type.includes('REPAYMENT') ? 'success' : 'info'} className="text-[10px] px-1.5 py-0.5">
                          {toTitleCase(txn.type.replace(/_/g, ' '))}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>{toTitleCase(txn.party)}</td>
                      <td className="py-2.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{txn.ref}</td>
                      <td className="py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(txn.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming Cheques */}
        <div className="rounded-xl p-5"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Upcoming Cheques</h3>
            <Link to="/cheques" className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--color-primary)' }}>View All</Link>
          </div>
          <div className="space-y-3.5">
            {loading ? (
              Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="space-y-1 text-right flex flex-col items-end">
                    <Skeleton className="h-3.5 w-14" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))
            ) : upcomingCheques.length === 0 ? (
              <EmptyState icon="cheque" title="No Upcoming Cheques" description="Cheques due soon will appear here" />
            ) : (
              upcomingCheques.map((chq, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{chq.chqNo}</p>
                    <p className="text-[10px] text-gray-400">Date: {chq.date} · Party: {toTitleCase(chq.party)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900 tabular-nums">₹{fmt(chq.amount)}</p>
                    <Badge variant="warning" className="text-[9px] px-1 py-0.5">{toTitleCase(chq.status)}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
