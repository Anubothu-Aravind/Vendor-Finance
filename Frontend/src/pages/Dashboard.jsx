import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Coins,
  CreditCard,
  FileText,
  CheckSquare,
  Building2,
  Landmark,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import { toTitleCase } from '../utils/text'
import { formatDateDisplay } from '../utils/date'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, KpiCard } from '../components/ui/Card'
import api from '../utils/api'
import Skeleton from '../components/ui/Skeleton'
import { AlertsWidget } from '../components/dashboard/AlertsWidget'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// ── Query fetcher (single optimized dashboard endpoint) ──────────────────────
const fetchSummary = () => api.get('/dashboard/summary')

export function Dashboard() {
  const { data: summary, isLoading: loading, isError, error: queryError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
    staleTime: 30_000,
  })

  const error = isError ? (queryError?.message || 'Failed to load dashboard summary') : null

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!summary || !summary.kpis) return []

    const k = summary.kpis
    const todayTotal = k.todayPaymentsTotal ?? 0
    const todayCount = k.todayPaymentsCount ?? 0
    const weekTotal = k.weekPaymentsTotal ?? 0
    const weekCount = k.weekPaymentsCount ?? 0
    const activeLoans = k.activeLoansCount ?? 0
    const upcomingChequesAmt = k.upcomingChequesTotal ?? k.chequesInTransit ?? 0

    return [
      {
        title: 'Financier Outstanding',
        value: `₹${fmt(k.financierOutstanding || 0)}`,
        subtitle: 'Total exposure',
        icon: Landmark,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40',
        link: '/outstanding'
      },
      {
        title: "Today's Payments",
        value: `₹${fmt(todayTotal)}`,
        subtitle: `${todayCount} payments today`,
        icon: CreditCard,
        iconColor: 'text-slate-600 dark:text-slate-300',
        iconBg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        link: '/payments'
      },
      {
        title: "This Week's Payments",
        value: `₹${fmt(weekTotal)}`,
        subtitle: `${weekCount} payments recorded`,
        icon: CreditCard,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
        link: '/payments'
      },
      {
        title: 'Overdue Bills',
        value: `₹${fmt(k.overdueBills || 0)}`,
        subtitle: 'Pending payable bills',
        icon: FileText,
        iconColor: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40',
        link: '/bills'
      },
      {
        title: 'Active Loans',
        value: String(activeLoans),
        subtitle: 'Active accounts',
        icon: Coins,
        iconColor: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/40',
        link: '/loans'
      },
      {
        title: 'Upcoming Cheques',
        value: `₹${fmt(upcomingChequesAmt)}`,
        subtitle: 'In transit / pending',
        icon: CheckSquare,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40',
        link: '/cheques'
      },
    ]
  }, [summary])

  // ── Pie chart data ──────────────────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Vendor Payables', value: summary?.kpis?.vendorOutstanding ?? 0, color: '#00C896' },
    { name: 'Loan Outstanding', value: summary?.kpis?.financierOutstanding ?? 0, color: '#4A9EFF' },
  ], [summary])

  // ── Recent transactions ─────────────────────────────────────────────────────
  const recentTransactions = useMemo(() => {
    const list = summary?.recentTransactions || []
    return list.map(txn => ({
      date:   txn.date ? formatDateDisplay(txn.date) : '—',
      type:   txn.type || 'TRANSACTION',
      party:  txn.vendorId?.name || txn.financierId?.name || txn.party || '—',
      ref:    txn.description || txn.referenceNumber || txn.ref || '—',
      amount: txn.amount || 0,
    }))
  }, [summary])

  // ── Upcoming cheques ────────────────────────────────────────────────────────
  const upcomingCheques = useMemo(() => {
    const list = summary?.upcomingCheques || []
    return list.map(chq => ({
      chqNo:  chq.chequeNumber || chq.chequeNo || '—',
      date:   chq.chequeDate ? formatDateDisplay(chq.chequeDate) : '—',
      party:  chq.vendorId?.name || chq.financierId?.name || chq.partyName || '—',
      amount: chq.amount || 0,
      status: chq.status || 'Pending',
    }))
  }, [summary])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="search" title="Error Loading Dashboard" description={error} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Comprehensive overview of Vastrams cash flow, payables, and loan exposure"
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between h-[125px] shadow-xs">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))
        ) : (
          kpis.map((kpi, idx) => (
            <KpiCard
              key={idx}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              iconColor={kpi.iconColor}
              iconBg={kpi.iconBg}
              link={kpi.link}
            />
          ))
        )}
      </div>

      {/* Active System Alerts */}
      <AlertsWidget />

      {/* Charts & Top Outstandings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Outstanding Breakdown Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Outstanding Breakdown</CardTitle>
              <CardDescription>Vendor Payables vs Loan splits</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 my-8">
                <Skeleton className="h-36 w-36 rounded-full" />
                <Skeleton className="h-4 w-44" />
              </div>
            ) : (
              <>
                <div className="h-48 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`₹${fmt(val)}`, '']}
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          fontSize: '13px',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-around text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Vendor Payables</span>
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      ₹{fmt(summary?.kpis.vendorOutstanding ?? 0)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>Loan Exposure</span>
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      ₹{fmt(summary?.kpis.financierOutstanding ?? 0)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Outstanding Vendors */}
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Top Outstanding Vendors</CardTitle>
              <CardDescription>Vendors with pending invoice balances</CardDescription>
            </div>
            <Link to="/vendors" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : !summary?.topVendors?.length ? (
                <EmptyState icon="vendor" title="No Vendors" description="Add vendors to start recording invoices" />
              ) : (
                summary.topVendors.map((vendor, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{toTitleCase(vendor.name)}</p>
                      <p className="text-xs text-slate-400 truncate">GST: {vendor.gstin || '—'} · {vendor.category || 'Vendor'}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${vendor.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {vendor.outstandingBalance > 0 ? `₹${fmt(vendor.outstandingBalance)}` : 'Clear'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Outstanding Financiers */}
        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Top Outstanding Financiers</CardTitle>
              <CardDescription>Financier loan balances remaining</CardDescription>
            </div>
            <Link to="/financiers" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : !summary?.topFinanciers?.length ? (
                <EmptyState icon="bank" title="No Financiers" description="Add financiers to start managing loans" />
              ) : (
                summary.topFinanciers.map((fin, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{toTitleCase(fin.name)}</p>
                      <p className="text-xs text-slate-400 truncate">Phone: {fin.phone || '—'}</p>
                    </div>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                      ₹{fmt(fin.outstandingBalance)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Transactions + Upcoming Cheques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest cash outflows and invoice activities</CardDescription>
            </div>
            <Link to="/transaction-history" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>View all transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon="receipt" title="No Recent Transactions" description="Transactions will appear here once bills or payments are recorded" />
                </div>
              ) : (
                <>
                  {/* Mobile Cards List (< md) */}
                  <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                    {recentTransactions.map((txn, idx) => (
                      <div key={idx} className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {toTitleCase(txn.party)}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                            ₹{fmt(txn.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={txn.type.includes('PAID') || txn.type.includes('REPAYMENT') ? 'success' : 'info'}
                              dot
                            >
                              {toTitleCase(txn.type.replace(/_/g, ' '))}
                            </Badge>
                            <span className="font-mono text-[11px] text-slate-400">{txn.ref}</span>
                          </div>
                          <span className="whitespace-nowrap">{txn.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <table className="hidden md:table w-full text-left text-sm">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-6 py-3.5">Type</th>
                        <th className="px-6 py-3.5">Party</th>
                        <th className="px-6 py-3.5">Reference</th>
                        <th className="px-6 py-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {recentTransactions.map((txn, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors h-13">
                          <td className="px-6 py-3.5 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{txn.date}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <Badge
                              variant={txn.type.includes('PAID') || txn.type.includes('REPAYMENT') ? 'success' : 'info'}
                              dot
                            >
                              {toTitleCase(txn.type.replace(/_/g, ' '))}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{toTitleCase(txn.party)}</td>
                          <td className="px-6 py-3.5 font-mono text-xs text-slate-400 dark:text-slate-500 font-semibold">{txn.ref}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                            ₹{fmt(txn.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Cheques */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Cheques</CardTitle>
              <CardDescription>Cheques scheduled for clearing</CardDescription>
            </div>
            <Link to="/cheques" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : upcomingCheques.length === 0 ? (
                <EmptyState icon="cheque" title="No Upcoming Cheques" description="Cheques due soon will appear here" />
              ) : (
                upcomingCheques.map((chq, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate font-mono">#{chq.chqNo}</p>
                      <p className="text-xs text-slate-400 truncate">{chq.date} · {toTitleCase(chq.party)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹{fmt(chq.amount)}</p>
                      <Badge variant="warning" dot className="mt-0.5">
                        {toTitleCase(chq.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
