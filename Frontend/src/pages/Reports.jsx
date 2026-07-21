import React, { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'
import { motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, Legend, Cell
} from 'recharts'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'

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
  const [fromDate, setFromDate] = useState('')  // DD-MM-YYYY (CustomDatePicker format)
  const [toDate, setToDate] = useState('')      // DD-MM-YYYY (CustomDatePicker format)

  // Interactive graph selection states
  const [selectedAgingBucket, setSelectedAgingBucket] = useState(null)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [selectedFinancier, setSelectedFinancier] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [selectedChequeStatus, setSelectedChequeStatus] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedAgingBucket(null)
    setSelectedVendor(null)
    setSelectedFinancier(null)
    setSelectedMetric(null)
    setSelectedChequeStatus(null)
    setSelectedMonth(null)
  }

  // Parse DD-MM-YYYY string from CustomDatePicker into a JS Date (midnight local)
  const parseDdMmYyyy = (str) => {
    if (!str) return null
    const parts = str.split('-')
    if (parts.length !== 3) return null
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
    return isNaN(d.getTime()) ? null : d
  }

  // Data states
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [repayments, setRepayments] = useState([])
  const [cheques, setCheques] = useState([])
  const [ledger, setLedger] = useState([])
  const [interestData, setInterestData] = useState({ summary: [], loans: [] })
  const [loans, setLoans] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async (signal) => {
    try {
      setLoading(true)
      const [billsData, paymentsData, repaymentsData, chequesData, ledgerData, interestStatements, loansData] = await Promise.all([
        api.get('/bills', { signal }),
        api.get('/payments', { signal }),
        api.get('/loans/repayments', { signal }),
        api.get('/cheques', { signal }),
        api.get('/ledger', { signal }),
        api.get('/reports/interest-statements', { signal }),
        api.get('/loans', { signal }),
      ])
      setBills(billsData || [])
      setPayments(paymentsData || [])
      setRepayments(repaymentsData || [])
      setCheques(chequesData || [])
      setLedger(ledgerData || [])
      setInterestData(interestStatements || { summary: [], loans: [] })
      setLoans(loansData || [])
      setError(null)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      console.error('Failed to fetch report data:', err)
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [])

  // ── DATE RANGE FILTERING LOGIC ──────────────────────────────────────────────
  const filteredBills = useMemo(() => {
    const from = parseDdMmYyyy(fromDate)
    const to = parseDdMmYyyy(toDate)
    return bills.filter(b => {
      if (!b.billDate) return true
      const date = new Date(b.billDate)
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [bills, fromDate, toDate])

  const filteredPayments = useMemo(() => {
    const from = parseDdMmYyyy(fromDate)
    const to = parseDdMmYyyy(toDate)
    return payments.filter(p => {
      if (!p.paymentDate) return true
      const date = new Date(p.paymentDate)
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [payments, fromDate, toDate])

  const filteredCheques = useMemo(() => {
    const from = parseDdMmYyyy(fromDate)
    const to = parseDdMmYyyy(toDate)
    return cheques.filter(c => {
      if (!c.chequeDate) return true
      const date = new Date(c.chequeDate)
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [cheques, fromDate, toDate])

  const filteredLedger = useMemo(() => {
    const from = parseDdMmYyyy(fromDate)
    const to = parseDdMmYyyy(toDate)
    return ledger.filter(t => {
      if (!t.date) return true
      const date = new Date(t.date)
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [ledger, fromDate, toDate])

  const filteredLoans = useMemo(() => {
    const from = parseDdMmYyyy(fromDate)
    const to = parseDdMmYyyy(toDate)
    return loans.filter(l => {
      if (!l.drawdownDate) return true
      const date = new Date(l.drawdownDate)
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [loans, fromDate, toDate])

  // ── TAB 1: OUTSTANDING AGING REPORT ──────────────────────────────────────────
  const agingData = useMemo(() => {
    let b1 = 0, b2 = 0, b3 = 0, b4 = 0
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

      if (daysOverdue <= 30) { b1 += b.outstandingAmount; vendorAging[vendorName].b1 += b.outstandingAmount }
      else if (daysOverdue <= 60) { b2 += b.outstandingAmount; vendorAging[vendorName].b2 += b.outstandingAmount }
      else if (daysOverdue <= 90) { b3 += b.outstandingAmount; vendorAging[vendorName].b3 += b.outstandingAmount }
      else { b4 += b.outstandingAmount; vendorAging[vendorName].b4 += b.outstandingAmount }
      vendorAging[vendorName].total += b.outstandingAmount
    })

    const chartData = [
      { name: '0 to 30 Days', Outstanding: b1 },
      { name: '31 to 60 Days', Outstanding: b2 },
      { name: '61 to 90 Days', Outstanding: b3 },
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
      if (!summary[vName]) summary[vName] = { name: vName, amount: 0, count: 0, lastDate: null }
      summary[vName].amount += p.amount
      summary[vName].count += 1
      const payDate = new Date(p.paymentDate)
      if (!summary[vName].lastDate || payDate > summary[vName].lastDate) summary[vName].lastDate = payDate
    })
    const list = Object.values(summary).sort((a, b) => b.amount - a.amount)
    const chartData = list.slice(0, 10).map(item => ({ fullName: item.name, name: item.name.length > 14 ? item.name.slice(0, 12) + '…' : item.name, Amount: item.amount }))
    return { list, chartData }
  }, [filteredPayments])

  // ── TAB 3: LOAN REPAYMENT SUMMARY ──────────────────────────────────────────
  const loanRepaymentsSummary = useMemo(() => {
    const summary = {}
    filteredLoans.forEach(l => {
      const fName = l.financierId?.name || 'Unknown'
      if (!summary[fName]) summary[fName] = { name: fName, borrowed: 0, repaid: 0, outstanding: 0, count: 0 }
      summary[fName].borrowed += l.principalAmount || 0
      summary[fName].outstanding += l.outstandingPrincipal || 0
      summary[fName].repaid += l.paidPrincipal || 0
      summary[fName].count += 1
    })
    const list = Object.values(summary).sort((a, b) => b.borrowed - a.borrowed)
    const chartData = list.map(item => ({ fullName: item.name, name: item.name.length > 14 ? item.name.slice(0, 12) + '…' : item.name, Borrowed: item.borrowed, Repaid: item.repaid }))
    return { list, chartData }
  }, [filteredLoans])

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
    const summary = { PENDING: { name: 'Pending', count: 0, amount: 0 }, CLEARED: { name: 'Cleared', count: 0, amount: 0 }, BOUNCED: { name: 'Bounced', count: 0, amount: 0 } }
    filteredCheques.forEach(c => {
      if (c.isDeleted) return
      const statusKey = (c.status || 'PENDING').toUpperCase()
      if (summary[statusKey]) { summary[statusKey].count += 1; summary[statusKey].amount += c.amount }
    })
    const list = Object.values(summary)
    const chartData = list.map(item => ({ name: item.name, Amount: item.amount }))
    return { list, chartData }
  }, [filteredCheques])

  // ── TAB 5: MONTHLY TRANSACTION OVERVIEW ─────────────────────────────────────
  const monthlyTransactionsData = useMemo(() => {
    const summary = {}
    filteredLedger.forEach(t => {
      if (t.isDeleted || !t.date) return
      const monthLabel = t.date.substring(0, 7)
      if (!summary[monthLabel]) summary[monthLabel] = { month: monthLabel, debit: 0, credit: 0, debitCount: 0, creditCount: 0 }
      const isCredit = ['BILL_PAID', 'LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'].includes(t.type)
      if (isCredit) { summary[monthLabel].credit += t.amount; summary[monthLabel].creditCount += 1 } 
      else { summary[monthLabel].debit += t.amount; summary[monthLabel].debitCount += 1 }
    })
    const list = Object.values(summary).sort((a, b) => a.month.localeCompare(b.month))
    const chartData = list.map(item => ({ Month: item.month, Outflow: item.credit, Inflow: item.debit }))
    return { list, chartData }
  }, [filteredLedger])

  // Filtered lists for table display based on interactive graph selections
  const displayedAgingTable = useMemo(() => {
    if (!selectedAgingBucket) return agingData.tableList
    if (selectedAgingBucket === '0 to 30 Days') return agingData.tableList.filter(i => i.b1 > 0)
    if (selectedAgingBucket === '31 to 60 Days') return agingData.tableList.filter(i => i.b2 > 0)
    if (selectedAgingBucket === '61 to 90 Days') return agingData.tableList.filter(i => i.b3 > 0)
    if (selectedAgingBucket === '90+ Days') return agingData.tableList.filter(i => i.b4 > 0)
    return agingData.tableList
  }, [agingData.tableList, selectedAgingBucket])

  // ── ITEM-LEVEL BREAKDOWN FOR INTERACTIVE FILTERS ───────────────────────────
  const financierLoansBreakdown = useMemo(() => {
    if (!selectedFinancier) return []
    return filteredLoans.filter(l => 
      !l.isDeleted && (l.financierId?.name || '').toLowerCase() === selectedFinancier.toLowerCase()
    )
  }, [filteredLoans, selectedFinancier])

  const financierRepaymentsBreakdown = useMemo(() => {
    if (!selectedFinancier) return []
    return repayments.filter(r => {
      if (r.isDeleted) return false
      const fName = r.loanId?.financierId?.name || r.financierName || ''
      return fName.toLowerCase() === selectedFinancier.toLowerCase()
    })
  }, [repayments, selectedFinancier])

  const vendorPaymentsBreakdown = useMemo(() => {
    if (!selectedVendor) return []
    return filteredPayments.filter(p => 
      !p.isDeleted && (p.vendorId?.name || '').toLowerCase() === selectedVendor.toLowerCase()
    )
  }, [filteredPayments, selectedVendor])

  const agingBillsBreakdown = useMemo(() => {
    if (!selectedAgingBucket) return []
    return filteredBills.filter(b => {
      if (b.isDeleted || b.outstandingAmount <= 0) return false
      const due = b.dueDate ? new Date(b.dueDate) : new Date(b.billDate)
      const daysOverdue = Math.max(0, Math.ceil((new Date() - due) / (1000 * 60 * 60 * 24)))
      if (selectedAgingBucket === '0 to 30 Days') return daysOverdue <= 30
      if (selectedAgingBucket === '31 to 60 Days') return daysOverdue > 30 && daysOverdue <= 60
      if (selectedAgingBucket === '61 to 90 Days') return daysOverdue > 60 && daysOverdue <= 90
      if (selectedAgingBucket === '90+ Days') return daysOverdue > 90
      return true
    })
  }, [filteredBills, selectedAgingBucket])

  const displayedVendorPayments = useMemo(() => {
    if (!selectedVendor) return vendorPaymentsSummary.list
    return vendorPaymentsSummary.list.filter(i => i.name === selectedVendor)
  }, [vendorPaymentsSummary.list, selectedVendor])

  const displayedLoanRepayments = useMemo(() => {
    if (!selectedFinancier) return loanRepaymentsSummary.list
    return loanRepaymentsSummary.list.filter(i => i.name === selectedFinancier)
  }, [loanRepaymentsSummary.list, selectedFinancier])

  const displayedChequeStatus = useMemo(() => {
    if (!selectedChequeStatus) return chequeStatusData.list
    return chequeStatusData.list.filter(i => i.name === selectedChequeStatus)
  }, [chequeStatusData.list, selectedChequeStatus])

  const displayedMonthlyTransactions = useMemo(() => {
    if (!selectedMonth) return monthlyTransactionsData.list
    return monthlyTransactionsData.list.filter(i => i.month === selectedMonth)
  }, [monthlyTransactionsData.list, selectedMonth])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>Reports</h1>
          <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Bespoke financial summaries and dynamic interactive data graphs</p>
        </div>

        {/* Global Date Range Filter */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '8px 12px' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>From</span>
            <CustomDatePicker value={fromDate} onChange={setFromDate} placeholder="Start date" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>To</span>
            <CustomDatePicker value={toDate} onChange={setToDate} placeholder="End date" align="right" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }} className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--color-primary)' }}>Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl p-1 w-fit" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => handleTabChange(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab ? 'bg-brand-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
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
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>Aging Distribution</h3>
                    <span className="text-[11px] text-gray-400">Click bars to filter details</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={agingData.chartData} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Bar dataKey="Outstanding" radius={[4, 4, 0, 0]}>
                        {agingData.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill="var(--color-primary)"
                            opacity={!selectedAgingBucket || selectedAgingBucket === entry.name ? 1 : 0.3}
                            onClick={() => setSelectedAgingBucket(prev => prev === entry.name ? null : entry.name)}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="xl:col-span-5 rounded-xl p-5 flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>
                      {selectedAgingBucket ? `Unpaid Invoices (${selectedAgingBucket})` : 'Aging Summary'}
                    </h3>
                    {selectedAgingBucket && (
                      <button onClick={() => setSelectedAgingBucket(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                        {selectedAgingBucket} <span>✕</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto flex-1">
                    {selectedAgingBucket ? (
                      <table className="w-full min-w-[380px] table-responsive-clean text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <th className="text-left pb-2 px-2">BILL #</th>
                            <th className="text-left pb-2 px-2">VENDOR</th>
                            <th className="text-right pb-2 px-2">OUTSTANDING</th>
                            <th className="text-right pb-2 px-2">DUE DATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agingBillsBreakdown.map((b) => (
                            <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td className="py-2 px-2 font-mono text-gray-400">{b.billNo || b._id.slice(-6)}</td>
                              <td className="py-2 px-2 font-medium truncate max-w-[110px]" style={{ color: 'var(--color-text-primary)' }}>{toTitleCase(b.vendorId?.name || 'Unknown')}</td>
                              <td className="py-2 px-2 text-right font-bold text-orange-400 tabular-nums">₹{fmt(b.outstandingAmount)}</td>
                              <td className="py-2 px-2 text-right text-gray-400 tabular-nums">{b.dueDate ? b.dueDate.split('T')[0] : '—'}</td>
                            </tr>
                          ))}
                          {agingBillsBreakdown.length === 0 && (
                            <tr><td colSpan={4} className="py-4 text-center text-gray-400">No invoices found for this aging bucket.</td></tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[420px] table-responsive-clean text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <th className="text-left pb-2 px-2">VENDOR</th>
                            <th className={`text-right pb-2 px-2 ${selectedAgingBucket === '0 to 30 Days' ? 'text-emerald-500 font-bold' : ''}`}>0-30D</th>
                            <th className={`text-right pb-2 px-2 ${selectedAgingBucket === '31 to 60 Days' ? 'text-emerald-500 font-bold' : ''}`}>31-60D</th>
                            <th className={`text-right pb-2 px-2 ${selectedAgingBucket === '61 to 90 Days' ? 'text-emerald-500 font-bold' : ''}`}>61-90D</th>
                            <th className={`text-right pb-2 px-2 ${selectedAgingBucket === '90+ Days' ? 'text-emerald-500 font-bold' : ''}`}>90D+</th>
                            <th className="text-right pb-2 px-2">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAgingTable.map((item, idx) => (
                            <tr key={item.name || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td className="py-2.5 px-2 font-medium max-w-[100px] truncate" style={{ color: 'var(--color-text-primary)' }}>{toTitleCase(item.name)}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums ${selectedAgingBucket === '0 to 30 Days' ? 'font-bold text-emerald-400' : ''}`} style={{ color: 'var(--color-text-muted)' }}>{item.b1 > 0 ? `₹${fmt(item.b1)}` : '—'}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums ${selectedAgingBucket === '31 to 60 Days' ? 'font-bold text-emerald-400' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>{item.b2 > 0 ? `₹${fmt(item.b2)}` : '—'}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums ${selectedAgingBucket === '61 to 90 Days' ? 'font-bold text-emerald-400' : 'text-orange-400'}`}>{item.b3 > 0 ? `₹${fmt(item.b3)}` : '—'}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums ${selectedAgingBucket === '90+ Days' ? 'font-bold text-emerald-400' : 'text-red-500 font-semibold'}`}>{item.b4 > 0 ? `₹${fmt(item.b4)}` : '—'}</td>
                              <td className="py-2.5 px-2 text-right font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(item.total)}</td>
                            </tr>
                          ))}
                          {displayedAgingTable.length === 0 && (
                            <tr><td colSpan={6} className="py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No outstanding invoices.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Vendor Payments */}
          {activeTab === 'Vendor Payments' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Top Vendor Payments</h3>
                  <span className="text-[11px] text-gray-400">Click a bar to view vendor details</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={vendorPaymentsSummary.chartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {vendorPaymentsSummary.chartData.map((entry, index) => {
                        const isSelected = selectedVendor === entry.fullName
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill="var(--color-primary)"
                            opacity={!selectedVendor || isSelected ? 1 : 0.3}
                            onClick={() => setSelectedVendor(prev => prev === entry.fullName ? null : entry.fullName)}
                            style={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="xl:col-span-5 rounded-xl border p-5 flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>
                    {selectedVendor ? `Payment Logs for ${toTitleCase(selectedVendor)}` : 'Payment Summary'}
                  </h3>
                  {selectedVendor && (
                    <button onClick={() => setSelectedVendor(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                      {toTitleCase(selectedVendor)} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  {selectedVendor ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="text-left pb-2">DATE</th>
                          <th className="text-left pb-2">REF #</th>
                          <th className="text-right pb-2">AMOUNT PAID</th>
                          <th className="text-right pb-2">MODE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {vendorPaymentsBreakdown.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2 text-gray-400">{p.paymentDate ? p.paymentDate.split('T')[0] : '—'}</td>
                            <td className="py-2 font-mono text-gray-400">{p.voucherNo || p.referenceNo || p._id.slice(-6)}</td>
                            <td className="py-2 text-right font-bold text-green-500 tabular-nums">₹{fmt(p.amount)}</td>
                            <td className="py-2 text-right text-gray-400">{p.paymentMode || 'NEFT'}</td>
                          </tr>
                        ))}
                        {vendorPaymentsBreakdown.length === 0 && (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-400">No payment logs found for this vendor.</td></tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="text-left pb-2">VENDOR</th>
                          <th className="text-right pb-2">PAYMENTS</th>
                          <th className="text-right pb-2">TOTAL PAID</th>
                          <th className="text-right pb-2">LAST DATE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {displayedVendorPayments.map((item, idx) => (
                          <tr 
                            key={item.name || idx} 
                            onClick={() => setSelectedVendor(item.name)}
                            style={{ cursor: 'pointer' }}
                            className={`hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all ${selectedVendor === item.name ? 'bg-emerald-500/10 font-bold' : ''}`}
                          >
                            <td style={{ color: 'var(--color-text-primary)' }} className="font-semibold text-emerald-500">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-500">{item.count}</td>
                            <td className="py-2.5 text-right font-bold tabular-nums text-green-600 dark:text-green-400">₹{fmt(item.amount)}</td>
                            <td className="py-2.5 text-right tabular-nums text-gray-400">{item.lastDate ? item.lastDate.toISOString().split('T')[0] : '—'}</td>
                          </tr>
                        ))}
                        {displayedVendorPayments.length === 0 && (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-400">No payment logs found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Loan Repayments */}
          {activeTab === 'Loan Repayments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-6 rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>Financier Loans vs Repayments</h3>
                    <span className="text-[11px] text-gray-400">Click Legend or Bars to filter details</span>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={loanRepaymentsSummary.chartData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        onClick={(e) => setSelectedMetric(prev => prev === e.dataKey ? null : e.dataKey)}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      <Bar 
                        dataKey="Borrowed" 
                        fill="var(--color-primary)" 
                        radius={[3, 3, 0, 0]}
                      >
                        {loanRepaymentsSummary.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-b-${index}`}
                            opacity={(!selectedFinancier || selectedFinancier === entry.fullName) && (!selectedMetric || selectedMetric === 'Borrowed') ? 1 : 0.25}
                            onClick={() => setSelectedFinancier(prev => prev === entry.fullName ? null : entry.fullName)}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="Repaid" 
                        fill="#3b82f6" 
                        radius={[3, 3, 0, 0]}
                      >
                        {loanRepaymentsSummary.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-r-${index}`}
                            opacity={(!selectedFinancier || selectedFinancier === entry.fullName) && (!selectedMetric || selectedMetric === 'Repaid') ? 1 : 0.25}
                            onClick={() => setSelectedFinancier(prev => prev === entry.fullName ? null : entry.fullName)}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="xl:col-span-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                      {selectedFinancier ? `Itemized Breakdown for ${toTitleCase(selectedFinancier)}` : 'Financier Balances'}
                    </h3>
                    <div className="flex gap-1">
                      {selectedFinancier && (
                        <button onClick={() => setSelectedFinancier(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                          {toTitleCase(selectedFinancier)} <span>✕</span>
                        </button>
                      )}
                      {selectedMetric && (
                        <button onClick={() => setSelectedMetric(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all flex items-center gap-1">
                          {selectedMetric} <span>✕</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    {selectedFinancier ? (
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-emerald-500">
                            Loans ({financierLoansBreakdown.length}):
                          </span>
                          <table className="w-full min-w-[440px] table-responsive-clean text-xs">
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th className="text-left pb-2 px-2">LOAN NO</th>
                                <th className="text-right pb-2 px-2">BORROWED</th>
                                <th className="text-right pb-2 px-2">REPAID</th>
                                <th className="text-right pb-2 px-2">OUTSTANDING</th>
                                <th className="text-right pb-2 px-2">STATUS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                              {financierLoansBreakdown.map((l) => (
                                <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                  <td className="py-2 px-2 font-mono text-gray-500 dark:text-gray-300">{l.loanNo || l._id.slice(-6)}</td>
                                  <td className="py-2 px-2 text-right tabular-nums font-semibold" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(l.principalAmount)}</td>
                                  <td className="py-2 px-2 text-right tabular-nums text-blue-500 font-semibold">₹{fmt(l.paidPrincipal)}</td>
                                  <td className="py-2 px-2 text-right tabular-nums font-bold text-orange-500">₹{fmt(l.outstandingPrincipal)}</td>
                                  <td className="py-2 px-2 text-right">
                                    <Badge variant={l.status === 'SETTLED' ? 'success' : 'warning'}>
                                      {l.status || 'ACTIVE'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                              {financierLoansBreakdown.length === 0 && (
                                <tr><td colSpan={5} className="py-3 text-center text-gray-400">No active loans found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {financierRepaymentsBreakdown.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-blue-400">
                              Recent Repayments ({financierRepaymentsBreakdown.length}):
                            </span>
                            <table className="w-full min-w-[380px] table-responsive-clean text-xs">
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                  <th className="text-left pb-2 px-2">DATE</th>
                                  <th className="text-left pb-2 px-2">REF #</th>
                                  <th className="text-right pb-2 px-2">REPAID</th>
                                  <th className="text-right pb-2 px-2">MODE</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                                {financierRepaymentsBreakdown.map((r) => (
                                  <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                    <td className="py-1.5 px-2 text-gray-400">{r.repaymentDate ? r.repaymentDate.split('T')[0] : '—'}</td>
                                    <td className="py-1.5 px-2 font-mono text-gray-400">{r.referenceNumber || r.repaymentNo || r._id.slice(-6)}</td>
                                    <td className="py-1.5 px-2 text-right font-bold text-green-500 tabular-nums">₹{fmt(r.amount)}</td>
                                    <td className="py-1.5 px-2 text-right text-gray-400">{r.repaymentMode || 'NEFT'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <table className="w-full min-w-[480px] table-responsive-clean text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <th className="text-left pb-2 px-2">FINANCIER</th>
                            <th className="text-right pb-2 px-2">LOANS</th>
                            <th className={`text-right pb-2 px-2 ${selectedMetric === 'Borrowed' ? 'text-emerald-500 font-bold' : ''}`}>BORROWED</th>
                            <th className={`text-right pb-2 px-2 ${selectedMetric === 'Repaid' ? 'text-blue-500 font-bold' : ''}`}>REPAID</th>
                            <th className="text-right pb-2 px-2">BALANCE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                          {displayedLoanRepayments.map((item, idx) => (
                            <tr 
                              key={item.name || idx} 
                              onClick={() => setSelectedFinancier(item.name)}
                              style={{ cursor: 'pointer' }}
                              className={`hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all ${selectedFinancier === item.name ? 'bg-emerald-500/10 font-semibold' : ''}`}
                            >
                              <td style={{ color: 'var(--color-text-primary)' }} className="py-2.5 px-2 font-semibold text-emerald-500 max-w-[140px] truncate">{toTitleCase(item.name)}</td>
                              <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{item.count}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums ${selectedMetric === 'Borrowed' ? 'font-bold text-emerald-500' : ''}`} style={{ color: 'var(--color-text-primary)' }}>₹{fmt(item.borrowed)}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums text-blue-600 ${selectedMetric === 'Repaid' ? 'font-bold text-blue-500' : ''}`}>₹{fmt(item.repaid)}</td>
                              <td className="py-2.5 px-2 text-right font-bold tabular-nums text-orange-500">₹{fmt(item.outstanding)}</td>
                            </tr>
                          ))}
                          {displayedLoanRepayments.length === 0 && (
                            <tr><td colSpan={5} className="py-4 text-center text-gray-400">No loan records.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>Amortized Interest Split Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={filteredInterestSummary} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="principal" name="Principal Allocation" fill="var(--color-primary)" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="interest" name="Interest Accrued" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>Monthly Interest Accruals</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full min-w-[420px] table-responsive-clean text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="text-left pb-2 px-2">MONTH</th>
                          <th className="text-right pb-2 px-2">PRINCIPAL</th>
                          <th className="text-right pb-2 px-2">INTEREST</th>
                          <th className="text-right pb-2 px-2">CUMULATIVE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                        {filteredInterestSummary.map((item, idx) => (
                          <tr key={item.month || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 px-2 font-mono" style={{ color: 'var(--color-text-primary)' }}>{item.month}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>₹{fmt(item.principal)}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-red-500 font-semibold">₹{fmt(item.interest)}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums font-semibold" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(item.principal + item.interest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Cheque Status */}
          {activeTab === 'Cheque Status' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Cheque Value distribution</h3>
                  <span className="text-[11px] text-gray-400">Click a bar to filter status details</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chequeStatusData.chartData} barSize={38}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {chequeStatusData.chartData.map((entry, index) => {
                        const colors = ['#f5a623', '#22c55e', '#ef4444']
                        const isSelected = selectedChequeStatus === entry.name
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            opacity={!selectedChequeStatus || isSelected ? 1 : 0.3}
                            onClick={() => setSelectedChequeStatus(prev => prev === entry.name ? null : entry.name)}
                            style={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="xl:col-span-5 rounded-xl border p-5 flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>Cheque Metrics</h3>
                  {selectedChequeStatus && (
                    <button onClick={() => setSelectedChequeStatus(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all flex items-center gap-1">
                      {selectedChequeStatus} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[360px] table-responsive-clean text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th className="text-left pb-2 px-2">STATUS</th>
                        <th className="text-right pb-2 px-2">COUNT</th>
                        <th className="text-right pb-2 px-2">TOTAL VALUE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                      {displayedChequeStatus.map((item, idx) => (
                        <tr key={item.name || idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 ${selectedChequeStatus === item.name ? 'bg-amber-500/10 font-bold' : ''}`}>
                          <td className="py-2.5 px-2 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.name === 'Cleared' ? 'bg-green-500' : item.name === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                            {item.name}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{item.count}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(item.amount)}</td>
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
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>Cash Flows (Inflow vs Outflow)</h3>
                  <span className="text-[11px] text-gray-400">Click graph point to filter month</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart 
                    data={monthlyTransactionsData.chartData}
                    onClick={(e) => { if (e?.activeLabel) setSelectedMonth(prev => prev === e.activeLabel ? null : e.activeLabel) }}
                    style={{ cursor: 'pointer' }}
                  >
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
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="Inflow" name="Inflow (Debits Added)" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Outflow" name="Outflow (Payments)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="xl:col-span-5 rounded-xl border p-5 flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}>Flow Summary</h3>
                  {selectedMonth && (
                    <button onClick={() => setSelectedMonth(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all flex items-center gap-1">
                      {selectedMonth} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-[420px] table-responsive-clean text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th className="text-left pb-2 px-2">MONTH</th>
                        <th className="text-right pb-2 px-2">INFLOW</th>
                        <th className="text-right pb-2 px-2">OUTFLOW</th>
                        <th className="text-right pb-2 px-2">NET FLOW</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                      {displayedMonthlyTransactions.map((item, idx) => {
                        const net = item.debit - item.credit
                        return (
                          <tr key={item.month || idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 ${selectedMonth === item.month ? 'bg-blue-500/10 font-bold' : ''}`}>
                            <td className="py-2.5 px-2 font-mono" style={{ color: 'var(--color-text-primary)' }}>{item.month}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>₹{fmt(item.debit)}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>₹{fmt(item.credit)}</td>
                            <td className={`py-2.5 px-2 text-right font-bold tabular-nums ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                              {net >= 0 ? '+' : ''}₹{fmt(net)}
                            </td>
                          </tr>
                        )
                      })}
                      {displayedMonthlyTransactions.length === 0 && (
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
