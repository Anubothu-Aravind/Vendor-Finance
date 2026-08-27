import React, { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'
import { motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, Legend, Cell
} from 'recharts'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import PrintPreviewModal from '../components/PrintPreviewModal'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const tabs = [
  'Outstanding Aging', 
  'Vendor Payments', 
  'Loan Repayments', 
  'Cheque Status', 
  'Monthly Transactions'
]

const toTitleCase = (str) => {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export function Reports() {
  const [activeTab, setActiveTab] = useState('Outstanding Aging')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [printDoc, setPrintDoc] = useState(null)

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

  const parseDdMmYyyy = (str) => {
    if (!str) return null
    const parts = str.split('-')
    if (parts.length !== 3) return null
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
    return isNaN(d.getTime()) ? null : d
  }

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

  // TAB 1: Outstanding Aging
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

  // TAB 2: Vendor Payments
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

  // TAB 3: Loan Repayments
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

  // TAB 4: Cheque Status
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

  // TAB 5: Monthly Transactions
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

  const displayedAgingTable = useMemo(() => {
    if (!selectedAgingBucket) return agingData.tableList
    if (selectedAgingBucket === '0 to 30 Days') return agingData.tableList.filter(i => i.b1 > 0)
    if (selectedAgingBucket === '31 to 60 Days') return agingData.tableList.filter(i => i.b2 > 0)
    if (selectedAgingBucket === '61 to 90 Days') return agingData.tableList.filter(i => i.b3 > 0)
    if (selectedAgingBucket === '90+ Days') return agingData.tableList.filter(i => i.b4 > 0)
    return agingData.tableList
  }, [agingData.tableList, selectedAgingBucket])

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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header with Date Filter */}
      <PageHeader
        title="Reports & Analytics"
        description="Bespoke executive financial intelligence and dynamic interactive graphs"
        breadcrumbs={[{ label: 'Reports' }]}
      >
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-1.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">From:</span>
          <CustomDatePicker value={fromDate} onChange={setFromDate} placeholder="Start date" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To:</span>
          <CustomDatePicker value={toDate} onChange={setToDate} placeholder="End date" align="right" />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate('') }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => handleTabChange(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl p-4 text-xs font-semibold text-rose-700 dark:text-rose-400">
          {error} — <button onClick={fetchData} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Outstanding Aging */}
          {activeTab === 'Outstanding Aging' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Card className="xl:col-span-7 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Aging Distribution</h3>
                    <p className="text-xs text-slate-400">Click any bar to filter unpaid invoices</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={agingData.chartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Outstanding" radius={[4, 4, 0, 0]}>
                      {agingData.chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="#00C896"
                          opacity={!selectedAgingBucket || selectedAgingBucket === entry.name ? 1 : 0.3}
                          onClick={() => setSelectedAgingBucket(prev => prev === entry.name ? null : entry.name)}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="xl:col-span-5 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
                    {selectedAgingBucket ? `Unpaid Invoices (${selectedAgingBucket})` : 'Aging Summary'}
                  </h3>
                  {selectedAgingBucket && (
                    <button onClick={() => setSelectedAgingBucket(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1">
                      {selectedAgingBucket} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  {selectedAgingBucket ? (
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Bill #</th>
                          <th className="pb-2">Vendor</th>
                          <th className="pb-2 text-right">Outstanding</th>
                          <th className="pb-2 text-right">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {agingBillsBreakdown.map((b) => (
                          <tr key={b._id}>
                            <td className="py-2.5 font-mono text-slate-500">{b.billNo || b._id.slice(-6)}</td>
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{toTitleCase(b.vendorId?.name || 'Unknown')}</td>
                            <td className="py-2.5 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">₹{fmt(b.outstandingAmount)}</td>
                            <td className="py-2.5 text-right text-slate-400">{b.dueDate ? b.dueDate.split('T')[0] : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Vendor</th>
                          <th className="pb-2 text-right">0-30D</th>
                          <th className="pb-2 text-right">31-60D</th>
                          <th className="pb-2 text-right">61-90D</th>
                          <th className="pb-2 text-right">90D+</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {displayedAgingTable.map((item, idx) => (
                          <tr key={item.name || idx}>
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right text-slate-500 tabular-nums">{item.b1 > 0 ? `₹${fmt(item.b1)}` : '—'}</td>
                            <td className="py-2.5 text-right text-slate-500 tabular-nums">{item.b2 > 0 ? `₹${fmt(item.b2)}` : '—'}</td>
                            <td className="py-2.5 text-right text-amber-600 tabular-nums">{item.b3 > 0 ? `₹${fmt(item.b3)}` : '—'}</td>
                            <td className="py-2.5 text-right text-rose-600 font-bold tabular-nums">{item.b4 > 0 ? `₹${fmt(item.b4)}` : '—'}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹{fmt(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Vendor Payments */}
          {activeTab === 'Vendor Payments' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Card className="xl:col-span-7 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Top Vendor Payments</h3>
                    <p className="text-xs text-slate-400">Click a bar to inspect vendor payment logs</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={vendorPaymentsSummary.chartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {vendorPaymentsSummary.chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="#00C896"
                          opacity={!selectedVendor || selectedVendor === entry.fullName ? 1 : 0.3}
                          onClick={() => setSelectedVendor(prev => prev === entry.fullName ? null : entry.fullName)}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="xl:col-span-5 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
                    {selectedVendor ? `Payment Logs (${toTitleCase(selectedVendor)})` : 'Vendor Payment Summary'}
                  </h3>
                  {selectedVendor && (
                    <button onClick={() => setSelectedVendor(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1">
                      {toTitleCase(selectedVendor)} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  {selectedVendor ? (
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Ref #</th>
                          <th className="pb-2 text-right">Amount Paid</th>
                          <th className="pb-2 text-right">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {vendorPaymentsBreakdown.map((p) => (
                          <tr key={p._id} onClick={() => setPrintDoc({ type: 'payment', id: p._id })} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                            <td className="py-2.5 text-slate-500">{p.paymentDate ? p.paymentDate.split('T')[0] : '—'}</td>
                            <td className="py-2.5 font-mono text-slate-400">{p.voucherNo || p.referenceNo || p._id.slice(-6)}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₹{fmt(p.amount)}</td>
                            <td className="py-2.5 text-right text-slate-400">{p.paymentMode || 'NEFT'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Vendor</th>
                          <th className="pb-2 text-right">Payments</th>
                          <th className="pb-2 text-right">Total Paid</th>
                          <th className="pb-2 text-right">Last Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {displayedVendorPayments.map((item, idx) => (
                          <tr 
                            key={item.name || idx} 
                            onClick={() => setSelectedVendor(item.name)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
                          >
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right text-slate-500 tabular-nums">{item.count}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₹{fmt(item.amount)}</td>
                            <td className="py-2.5 text-right text-slate-400 tabular-nums">{item.lastDate ? item.lastDate.toISOString().split('T')[0] : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: Loan Repayments */}
          {activeTab === 'Loan Repayments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <Card className="xl:col-span-6 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Financier Loans vs Repayments</h3>
                      <p className="text-xs text-slate-400">Click legend or bars to filter</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={loanRepaymentsSummary.chartData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="Borrowed" fill="#00C896" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Repaid" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="xl:col-span-6 p-5 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>
                      {selectedFinancier ? `Breakdown for ${toTitleCase(selectedFinancier)}` : 'Financier Loan Balances'}
                    </h3>
                    {selectedFinancier && (
                      <button onClick={() => setSelectedFinancier(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1">
                        {toTitleCase(selectedFinancier)} <span>✕</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Financier</th>
                          <th className="pb-2 text-right">Loans</th>
                          <th className="pb-2 text-right">Borrowed</th>
                          <th className="pb-2 text-right">Repaid</th>
                          <th className="pb-2 text-right">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {displayedLoanRepayments.map((item, idx) => (
                          <tr key={item.name || idx} onClick={() => setSelectedFinancier(item.name)} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{toTitleCase(item.name)}</td>
                            <td className="py-2.5 text-right text-slate-500 tabular-nums">{item.count}</td>
                            <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100 tabular-nums">₹{fmt(item.borrowed)}</td>
                            <td className="py-2.5 text-right font-medium text-blue-600 dark:text-blue-400 tabular-nums">₹{fmt(item.repaid)}</td>
                            <td className="py-2.5 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">₹{fmt(item.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Amortized Interest Split Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={filteredInterestSummary} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="principal" name="Principal Allocation" fill="#00C896" stackId="a" />
                      <Bar dataKey="interest" name="Interest Accrued" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-5 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Monthly Interest Accruals</h3>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="pb-2">Month</th>
                          <th className="pb-2 text-right">Principal</th>
                          <th className="pb-2 text-right">Interest</th>
                          <th className="pb-2 text-right">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredInterestSummary.map((item, idx) => (
                          <tr key={item.month || idx}>
                            <td className="py-2.5 font-mono text-slate-500">{item.month}</td>
                            <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">₹{fmt(item.principal)}</td>
                            <td className="py-2.5 text-right text-rose-600 font-semibold tabular-nums">₹{fmt(item.interest)}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹{fmt(item.principal + item.interest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: Cheque Status */}
          {activeTab === 'Cheque Status' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Card className="xl:col-span-7 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Cheque Value Distribution</h3>
                    <p className="text-xs text-slate-400">Click a bar to filter status details</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chequeStatusData.chartData} barSize={38}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                    <Bar dataKey="Amount" radius={[4, 4, 0, 0]}>
                      {chequeStatusData.chartData.map((entry, index) => {
                        const colors = ['#f59e0b', '#10b981', '#ef4444']
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                            opacity={!selectedChequeStatus || selectedChequeStatus === entry.name ? 1 : 0.3}
                            onClick={() => setSelectedChequeStatus(prev => prev === entry.name ? null : entry.name)}
                            style={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="xl:col-span-5 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Cheque Metrics</h3>
                  {selectedChequeStatus && (
                    <button onClick={() => setSelectedChequeStatus(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex items-center gap-1">
                      {selectedChequeStatus} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Count</th>
                        <th className="pb-2 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {displayedChequeStatus.map((item, idx) => (
                        <tr key={item.name || idx}>
                          <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.name === 'Cleared' ? 'bg-emerald-500' : item.name === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                            {item.name}
                          </td>
                          <td className="py-2.5 text-right text-slate-500 tabular-nums">{item.count}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹{fmt(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: Monthly Transactions */}
          {activeTab === 'Monthly Transactions' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Card className="xl:col-span-7 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Cash Flows (Inflow vs Outflow)</h3>
                    <p className="text-xs text-slate-400">Click points to inspect monthly totals</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart 
                    data={monthlyTransactionsData.chartData}
                    onClick={(e) => { if (e?.activeLabel) setSelectedMonth(prev => prev === e.activeLabel ? null : e.activeLabel) }}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C896" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00C896" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="Month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} cursor={{ fill: 'transparent' }} contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="Inflow" name="Inflow (Debits Added)" stroke="#00C896" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Outflow" name="Outflow (Payments)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="xl:col-span-5 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-display)' }}>Flow Summary</h3>
                  {selectedMonth && (
                    <button onClick={() => setSelectedMonth(null)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-1">
                      {selectedMonth} <span>✕</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="pb-2">Month</th>
                        <th className="pb-2 text-right">Inflow</th>
                        <th className="pb-2 text-right">Outflow</th>
                        <th className="pb-2 text-right">Net Flow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {displayedMonthlyTransactions.map((item, idx) => {
                        const net = item.debit - item.credit
                        return (
                          <tr key={item.month || idx}>
                            <td className="py-2.5 font-mono text-slate-500">{item.month}</td>
                            <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">₹{fmt(item.debit)}</td>
                            <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">₹{fmt(item.credit)}</td>
                            <td className={`py-2.5 text-right font-bold tabular-nums ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {net >= 0 ? '+' : ''}₹{fmt(net)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

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

export default Reports
