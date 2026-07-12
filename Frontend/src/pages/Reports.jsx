import React, { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'
import { motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, Legend, Cell
} from 'recharts'
import DropdownSelect from '../components/ui/DropdownSelect'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
const initials = (n) => (n || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'

const avatarColors = [
  'bg-red-100 text-red-700', 
  'bg-blue-100 text-blue-700', 
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700', 
  'bg-yellow-100 text-yellow-700'
]

const tabs = [
  'Outstanding Aging', 
  'Vendor Payments', 
  'Loan Repayments', 
  'Cheque Status', 
  'Monthly Transactions'
]

// Helper for title case conversion
const toTitleCase = (str) => {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export function Reports() {
  const [activeTab, setActiveTab] = useState('Outstanding Aging')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Data states
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [repayments, setRepayments] = useState([])
  const [cheques, setCheques] = useState([])
  const [ledger, setLedger] = useState([])
  const [interestData, setInterestData] = useState({ summary: [], loans: [] })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async (signal) => {
    try {
      setLoading(true)
      const [billsData, paymentsData, repaymentsData, chequesData, ledgerData, interestStatements] = await Promise.all([
        api.get('/bills', { signal }),
        api.get('/payments', { signal }),
        api.get('/loans/repayments/all', { signal }),
        api.get('/cheques', { signal }),
        api.get('/ledger', { signal }),
        api.get('/reports/interest-statements', { signal })
      ])

      if (!signal || !signal.aborted) {
        setBills(billsData)
        setPayments(paymentsData)
        setRepayments(repaymentsData)
        setCheques(chequesData)
        setLedger(ledgerData)
        setInterestData(interestStatements)
        setError(null)
      }
    } catch (err) {
      if (!signal || !signal.aborted) {
        setError(err.message || 'Failed to load reports data')
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

  useEffect(() => {
    const handleDataChanged = () => {
      fetchData()
    }
    window.addEventListener('api-data-changed', handleDataChanged)
    return () => window.removeEventListener('api-data-changed', handleDataChanged)
  }, [])

  // ── DATE RANGE FILTERING LOGIC ──────────────────────────────────────────────
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (!b.billDate) return true
      const date = new Date(b.billDate)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [bills, fromDate, toDate])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.paymentDate) return true
      const date = new Date(p.paymentDate)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [payments, fromDate, toDate])

  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      if (!r.repaymentDate) return true
      const date = new Date(r.repaymentDate)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [repayments, fromDate, toDate])

  const filteredCheques = useMemo(() => {
    return cheques.filter(c => {
      if (!c.chequeDate) return true
      const date = new Date(c.chequeDate)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [cheques, fromDate, toDate])

  const filteredLedger = useMemo(() => {
    return ledger.filter(t => {
      if (!t.date) return true
      const date = new Date(t.date)
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [ledger, fromDate, toDate])

  // ── TAB 1: OUTSTANDING AGING REPORT ──────────────────────────────────────────
  const agingData = useMemo(() => {
    let b1 = 0 // 0-30
    let b2 = 0 // 31-60
    let b3 = 0 // 61-90
    let b4 = 0 // 90+
    const vendorAging = {}

    filteredBills.forEach(b => {
      if (b.isDeleted || b.outstandingAmount <= 0) return
      const vendorName = b.vendorId?.name || 'Unknown'
      
      const due = b.dueDate ? new Date(b.dueDate) : new Date(b.billDate)
      const diffTime = new Date() - due
      const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

      if (!vendorAging[vendorName]) {
        vendorAging[vendorName] = { name: vendorName, b1: 0, b2: 0, b3: 0, b4: 0, total: 0 }
      }

      if (daysOverdue <= 30) {
        b1 += b.outstandingAmount
        vendorAging[vendorName].b1 += b.outstandingAmount
      } else if (daysOverdue <= 60) {
        b2 += b.outstandingAmount
        vendorAging[vendorName].b2 += b.outstandingAmount
      } else if (daysOverdue <= 90) {
        b3 += b.outstandingAmount
        vendorAging[vendorName].b3 += b.outstandingAmount
      } else {
        b4 += b.outstandingAmount
        vendorAging[vendorName].b4 += b.outstandingAmount
      }
      vendorAging[vendorName].total += b.outstandingAmount
    })

    const chartData = [
      { name: '0-30 Days', Outstanding: b1 },
      { name: '31-60 Days', Outstanding: b2 },
      { name: '61-90 Days', Outstanding: b3 },
      { name: '90+ Days', Outstanding: b4 }
    ]

    const tableList = Object.values(vendorAging).sort((a, b) => b.total - a.total)

    return { chartData, tableList, total: b1 + b2 + b3 + b4 }
  }, [filteredBills])

  // ── TAB 2: VENDOR PAYMENT SUMMARY ──────────────────────────────────────────
  const vendorPaymentsSummary = useMemo(() => {
    const summary = {}
    filteredPayments.forEach(p => {
      if (p.isDeleted) return
      const vName = p.vendorId?.name || 'Unknown'
      if (!summary[vName]) {
        summary[vName] = { name: vName, amount: 0, count: 0, lastDate: null }
      }
      summary[vName].amount += p.amount
      summary[vName].count += 1
      const payDate = new Date(p.paymentDate)
      if (!summary[vName].lastDate || payDate > summary[vName].lastDate) {
        summary[vName].lastDate = payDate
      }
    })

    const list = Object.values(summary).sort((a, b) => b.amount - a.amount)
    const chartData = list.slice(0, 10).map(item => ({
      name: item.name.length > 12 ? item.name.slice(0, 10) + '..' : item.name,
      Amount: item.amount
    }))

    return { list, chartData }
  }, [filteredPayments])

  // ── TAB 3: LOAN REPAYMENT SUMMARY ──────────────────────────────────────────
  const loanRepaymentsSummary = useMemo(() => {
    const summary = {}
    
    // Group active loans
    bills.filter(b => b.paymentType === 'Loan' && !b.isDeleted).forEach(l => {
      const fName = l.vendor || 'Unknown'
      if (!summary[fName]) {
        summary[fName] = { name: fName, borrowed: 0, repaid: 0, outstanding: 0, count: 0 }
      }
      summary[fName].borrowed += l.amount
      summary[fName].outstanding += l.outstandingAmount
      summary[fName].repaid += (l.amount - l.outstandingAmount)
      summary[fName].count += 1
    })

    const list = Object.values(summary).sort((a, b) => b.borrowed - a.borrowed)
    const chartData = list.map(item => ({
      name: item.name.length > 12 ? item.name.slice(0, 10) + '..' : item.name,
      Borrowed: item.borrowed,
      Repaid: item.repaid
    }))

    return { list, chartData }
  }, [bills])

  // Filter interest summary by date range
  const filteredInterestSummary = useMemo(() => {
    return (interestData.summary || []).filter(entry => {
      if (!entry.month) return true
      const date = new Date(entry.month + '-01')
      if (fromDate && date < new Date(fromDate)) return false
      if (toDate && date > new Date(toDate)) return false
      return true
    })
  }, [interestData, fromDate, toDate])

  // ── TAB 4: CHEQUE STATUS REPORT ──────────────────────────────────────────────
  const chequeStatusData = useMemo(() => {
    const summary = {
      PENDING: { name: 'Pending', count: 0, amount: 0 },
      CLEARED: { name: 'Cleared', count: 0, amount: 0 },
      BOUNCED: { name: 'Bounced', count: 0, amount: 0 }
    }

    filteredCheques.forEach(c => {
      if (c.isDeleted) return
      const statusKey = (c.status || 'PENDING').toUpperCase()
      if (summary[statusKey]) {
        summary[statusKey].count += 1
        summary[statusKey].amount += c.amount
      }
    })

    const list = Object.values(summary)
    const chartData = list.map(item => ({
      name: item.name,
      Amount: item.amount
    }))

    return { list, chartData }
  }, [filteredCheques])

  // ── TAB 5: MONTHLY TRANSACTION OVERVIEW ─────────────────────────────────────
  const monthlyTransactionsData = useMemo(() => {
    const summary = {}

    filteredLedger.forEach(t => {
      if (t.isDeleted || !t.date) return
      const monthLabel = t.date.substring(0, 7) // 'YYYY-MM'
      if (!summary[monthLabel]) {
        summary[monthLabel] = { month: monthLabel, debit: 0, credit: 0, debitCount: 0, creditCount: 0 }
      }

      // debit = liability added (bill posted / loan drawdown)
      // credit = payment made (bill paid / repayment)
      const isCredit = ['BILL_PAID', 'LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'].includes(t.type)
      if (isCredit) {
        summary[monthLabel].credit += t.amount
        summary[monthLabel].creditCount += 1
      } else {
        summary[monthLabel].debit += t.amount
        summary[monthLabel].debitCount += 1
      }
    })

    const list = Object.values(summary).sort((a, b) => a.month.localeCompare(b.month))
    const chartData = list.map(item => ({
      Month: item.month,
      Outflow: item.credit,
      Inflow: item.debit
    }))

    return { list, chartData }
  }, [filteredLedger])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">Bespoke financial summaries and dynamic data graphs</p>
        </div>

        {/* Global Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 mb-1">FROM DATE</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary text-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 mb-1">TO DATE</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary text-gray-800 dark:text-white"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate('') }}
              className="mt-4 px-2.5 py-1.5 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error} — <button onClick={fetchData} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex gap-4">
            {[0, 1, 2].map(i => <Skeleton key={i} className="flex-1 h-[80px] rounded-xl" />)}
          </div>
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Outstanding Aging */}
          {activeTab === 'Outstanding Aging' && (
            <>
              <div className="flex flex-wrap gap-4 w-full">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Total Outstanding Payables</p>
                  <p className="text-2xl font-bold stat-value">₹{fmt(agingData.total)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Aging Distribution</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={agingData.chartData} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Bar dataKey="Outstanding" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 overflow-hidden flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Aging summary</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                          <th className="text-left pb-2">VENDOR</th>
                          <th className="text-right pb-2">0-30D</th>
                          <th className="text-right pb-2">31-60D</th>
                          <th className="text-right pb-2">61-90D</th>
                          <th className="text-right pb-2">90D+</th>
                          <th className="text-right pb-2">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {agingData.tableList.map((item, idx) => (
                          <tr key={item.name || idx} className="hover:bg-slate-55 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white max-w-[80px] truncate">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-500">{item.b1 > 0 ? `₹${fmt(item.b1)}` : '—'}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-550">{item.b2 > 0 ? `₹${fmt(item.b2)}` : '—'}</td>
                            <td className="py-2.5 text-right tabular-nums text-orange-400">{item.b3 > 0 ? `₹${fmt(item.b3)}` : '—'}</td>
                            <td className="py-2.5 text-right tabular-nums text-red-500 font-semibold">{item.b4 > 0 ? `₹${fmt(item.b4)}` : '—'}</td>
                            <td className="py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">₹{fmt(item.total)}</td>
                          </tr>
                        ))}
                        {agingData.tableList.length === 0 && (
                          <tr><td colSpan={6} className="py-4 text-center text-gray-400">No outstanding invoices.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Vendor Payments */}
          {activeTab === 'Vendor Payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Top Vendor Payments</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={vendorPaymentsSummary.chartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Bar dataKey="Amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Payment Summary</h3>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                        <th className="text-left pb-2">VENDOR</th>
                        <th className="text-right pb-2">PAYMENTS</th>
                        <th className="text-right pb-2">TOTAL PAID</th>
                        <th className="text-right pb-2">LAST DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                      {vendorPaymentsSummary.list.map((item, idx) => (
                        <tr key={item.name || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">{toTitleCase(item.name)}</td>
                          <td className="py-2.5 text-right tabular-nums text-gray-500">{item.count}</td>
                          <td className="py-2.5 text-right font-bold tabular-nums text-green-600 dark:text-green-400">₹{fmt(item.amount)}</td>
                          <td className="py-2.5 text-right tabular-nums text-gray-400">{item.lastDate ? item.lastDate.toISOString().split('T')[0] : '—'}</td>
                        </tr>
                      ))}
                      {vendorPaymentsSummary.list.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-gray-400">No payment logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Loan Repayments */}
          {activeTab === 'Loan Repayments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financier Summary Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Financier Loans vs Repayments</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={loanRepaymentsSummary.chartData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="Borrowed" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Repaid" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Financier Balances</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                          <th className="text-left pb-2">FINANCIER</th>
                          <th className="text-right pb-2">LOANS</th>
                          <th className="text-right pb-2">BORROWED</th>
                          <th className="text-right pb-2">REPAID</th>
                          <th className="text-right pb-2">BALANCE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {loanRepaymentsSummary.list.map((item, idx) => (
                          <tr key={item.name || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-500">{item.count}</td>
                            <td className="py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">₹{fmt(item.borrowed)}</td>
                            <td className="py-2.5 text-right tabular-nums text-blue-600">₹{fmt(item.repaid)}</td>
                            <td className="py-2.5 text-right font-bold tabular-nums text-orange-500">₹{fmt(item.outstanding)}</td>
                          </tr>
                        ))}
                        {loanRepaymentsSummary.list.length === 0 && (
                          <tr><td colSpan={5} className="py-4 text-center text-gray-400">No loan records.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Monthly Interest Statement Sub-section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Interest Statement Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Amortized Interest Split Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={filteredInterestSummary} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="principal" name="Principal Allocation" fill="var(--color-primary)" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="interest" name="Interest Accrued" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Monthly Interest Accruals</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                          <th className="text-left pb-2">MONTH</th>
                          <th className="text-right pb-2">PRINCIPAL</th>
                          <th className="text-right pb-2">INTEREST</th>
                          <th className="text-right pb-2">CUMULATIVE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {filteredInterestSummary.map((item, idx) => (
                          <tr key={item.month || idx} className="hover:bg-slate-55 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white font-mono">{item.month}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">₹{fmt(item.principal)}</td>
                            <td className="py-2.5 text-right tabular-nums text-red-500 font-semibold">₹{fmt(item.interest)}</td>
                            <td className="py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">₹{fmt(item.principal + item.interest)}</td>
                          </tr>
                        ))}
                        {filteredInterestSummary.length === 0 && (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-400">No future interest allocations computed.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Cheque Status */}
          {activeTab === 'Cheque Status' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Cheque Value distribution</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chequeStatusData.chartData} barSize={38}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {chequeStatusData.chartData.map((entry, index) => {
                        const colors = ['#f5a623', '#22c55e', '#ef4444']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Cheque Metrics</h3>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                        <th className="text-left pb-2">STATUS</th>
                        <th className="text-right pb-2">COUNT</th>
                        <th className="text-right pb-2">TOTAL VALUE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                      {chequeStatusData.list.map((item, idx) => (
                        <tr key={item.name || idx} className="hover:bg-slate-55 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-semibold text-gray-900 dark:text-white">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              item.name === 'Cleared' ? 'bg-green-500' : item.name === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></span>
                            {item.name}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-gray-500">{item.count}</td>
                          <td className="py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white">₹{fmt(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Monthly Transactions */}
          {activeTab === 'Monthly Transactions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Cash Flows (Inflow vs Outflow)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyTransactionsData.chartData}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="Month" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="Inflow" name="Inflow (Debits Added)" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Outflow" name="Outflow (Payments)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Flow Summary</h3>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                        <th className="text-left pb-2">MONTH</th>
                        <th className="text-right pb-2">INFLOW</th>
                        <th className="text-right pb-2">OUTFLOW</th>
                        <th className="text-right pb-2">NET FLOW</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                      {monthlyTransactionsData.list.map((item, idx) => {
                        const net = item.debit - item.credit
                        return (
                          <tr key={item.month || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 font-medium text-gray-900 dark:text-white font-mono">{item.month}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">₹{fmt(item.debit)}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">₹{fmt(item.credit)}</td>
                            <td className={`py-2.5 text-right font-bold tabular-nums ${
                              net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                            }`}>
                              {net >= 0 ? '+' : ''}₹{fmt(net)}
                            </td>
                          </tr>
                        )
                      })}
                      {monthlyTransactionsData.list.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-gray-400">No transactions recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Reports
