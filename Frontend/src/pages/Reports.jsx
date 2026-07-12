import React, { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'
import { motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import DropdownSelect from '../components/ui/DropdownSelect'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

const initials = (n) => (n || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
const avatarColors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700']

const tabs = ['Vendor Outstanding', 'Financier Outstanding', 'Payments Summary', 'Overdue Bills', 'Monthly Trends', 'Yearly Trends']

export function Reports() {
  const [activeTab, setActiveTab] = useState('Vendor Outstanding')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  // Data states
  const [outstandingData, setOutstandingData] = useState({ kpis: {}, parties: [] })
  const [payments, setPayments] = useState([])
  const [repayments, setRepayments] = useState([])
  const [bills, setBills] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [outstanding, paymentsData, repaymentsData, billsData] = await Promise.all([
        api.get('/reports/outstanding'),
        api.get('/payments'),
        api.get('/loans/repayments/all'),
        api.get('/bills')
      ])
      setOutstandingData(outstanding)
      setPayments(paymentsData)
      setRepayments(repaymentsData)
      setBills(billsData)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load reports data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculate distinct years present across bills, payments, and repayments
  const availableYears = useMemo(() => {
    const years = new Set()
    
    // Add current year as a default fallback
    years.add(new Date().getFullYear())

    bills.forEach(b => {
      if (b.billDate || b.date) {
        years.add(new Date(b.billDate || b.date).getFullYear())
      }
    })
    payments.forEach(p => {
      if (p.paymentDate || p.date) {
        years.add(new Date(p.paymentDate || p.date).getFullYear())
      }
    })
    repayments.forEach(r => {
      if (r.repaymentDate || r.date) {
        years.add(new Date(r.repaymentDate || r.date).getFullYear())
      }
    })

    // Sort descending
    return Array.from(years).sort((a, b) => b - a).map(y => ({
      value: String(y),
      label: String(y)
    }))
  }, [bills, payments, repayments])

  // Sync selectedYear to ensure it is in the list of available years
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.some(y => y.value === selectedYear)) {
      setSelectedYear(availableYears[0].value)
    }
  }, [availableYears, selectedYear])

  // 1. Vendor Outstanding Tab Data
  const vendorData = useMemo(() => {
    return (outstandingData.parties || [])
      .filter(p => p.type === 'Vendor')
      .map(p => ({
        id: p._id,
        vendor: p.name,
        totalBills: p.items || 0,
        totalAmount: p.total || 0,
        paid: p.paid || 0,
        outstanding: p.outstanding || 0,
        status: 'Active'
      }))
  }, [outstandingData])

  // 2. Financier Outstanding Tab Data
  const financierData = useMemo(() => {
    return (outstandingData.parties || [])
      .filter(p => p.type === 'Financier')
      .map(p => ({
        id: p._id,
        financier: p.name,
        loans: p.items || 0,
        active: p.items || 0,
        principal: p.total || 0,
        repaid: p.paid || 0,
        outstanding: p.outstanding || 0
      }))
  }, [outstandingData])

  // 3. Overdue Bills calculations
  const overdueBillsInfo = useMemo(() => {
    const today = new Date()
    const overdueList = bills.filter(b => {
      if (b.isDeleted) return false
      if (['PAID', 'SETTLED'].includes(b.status.toUpperCase())) return false
      if (!b.dueDate) return false
      return new Date(b.dueDate) < today
    }).map(b => ({
      id: b._id,
      vendor: b.vendorId?.name || '—',
      billNo: b.billNumber,
      dueDate: b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      amount: b.amount,
      outstanding: b.outstandingAmount ?? b.amount
    }))

    const totalOverdueAmount = overdueList.reduce((sum, b) => sum + b.outstanding, 0)
    return {
      list: overdueList,
      total: totalOverdueAmount
    }
  }, [bills])

  // 4. Monthly Trend Data (Last 6 Months)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = []

    // Construct last 6 months
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthLabel = months[d.getMonth()]
      const yearVal = d.getFullYear()
      const monthIndex = d.getMonth()

      // Sum active vendor payments in this month/year
      const vendorPaymentsSum = payments.reduce((sum, p) => {
        if (p.isDeleted) return sum
        const pDate = new Date(p.paymentDate || p.date)
        if (pDate.getFullYear() === yearVal && pDate.getMonth() === monthIndex) {
          return sum + p.amount
        }
        return sum
      }, 0)

      // Sum active financier repayments in this month/year
      const financierRepaymentsSum = repayments.reduce((sum, r) => {
        if (r.isDeleted) return sum
        const rDate = new Date(r.repaymentDate || r.date)
        if (rDate.getFullYear() === yearVal && rDate.getMonth() === monthIndex) {
          return sum + r.amount
        }
        return sum
      }, 0)

      result.push({
        month: `${monthLabel} ${String(yearVal).slice(-2)}`,
        vendor: vendorPaymentsSum,
        financier: financierRepaymentsSum
      })
    }
    return result
  }, [payments, repayments])

  // 5. Payments Summary calculations
  const paymentsSummary = useMemo(() => {
    const totalVendorPayments = payments.reduce((sum, p) => p.isDeleted ? sum : sum + p.amount, 0)
    const countVendorPayments = payments.filter(p => !p.isDeleted).length

    const totalFinancierRepayments = repayments.reduce((sum, r) => r.isDeleted ? sum : sum + r.amount, 0)
    const countFinancierRepayments = repayments.filter(r => !r.isDeleted).length

    return {
      vendorTotal: totalVendorPayments,
      vendorCount: countVendorPayments,
      financierTotal: totalFinancierRepayments,
      financierCount: countFinancierRepayments,
      grandTotal: totalVendorPayments + totalFinancierRepayments,
      grandCount: countVendorPayments + countFinancierRepayments
    }
  }, [payments, repayments])

  // 6. Yearly Trends calculations based on selectedYear
  const yearlyData = useMemo(() => {
    const targetYear = parseInt(selectedYear)

    // Filter bills and payments by year
    const yearBills = bills.filter(b => !b.isDeleted && new Date(b.billDate || b.date).getFullYear() === targetYear)
    const yearPayments = payments.filter(p => !p.isDeleted && new Date(p.paymentDate || p.date).getFullYear() === targetYear)

    const totalBilled = yearBills.reduce((sum, b) => sum + b.amount, 0)
    const totalPaid = yearPayments.reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = Math.max(0, totalBilled - totalPaid)

    // Helper to group by quarters
    const getQuarter = (dateStr) => {
      const month = new Date(dateStr).getMonth()
      if (month <= 2) return 'Q1' // Jan - Mar
      if (month <= 5) return 'Q2' // Apr - Jun
      if (month <= 8) return 'Q3' // Jul - Sep
      return 'Q4' // Oct - Dec
    }

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const chartData = quarters.map(q => {
      const qBills = yearBills.filter(b => getQuarter(b.billDate || b.date) === q)
      const qPayments = yearPayments.filter(p => getQuarter(p.paymentDate || p.date) === q)

      return {
        quarter: q,
        billed: qBills.reduce((sum, b) => sum + b.amount, 0),
        paid: qPayments.reduce((sum, p) => sum + p.amount, 0)
      }
    })

    return {
      title: `FY ${targetYear}-${String(targetYear + 1).slice(-2)}`,
      totalBills: `₹${(totalBilled / 100000).toFixed(1)}L`,
      totalPayments: `₹${(totalPaid / 100000).toFixed(1)}L`,
      pending: `₹${(pendingAmount / 100000).toFixed(1)}L`,
      chartData
    }
  }, [bills, payments, selectedYear])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5 font-medium">Tabular summaries and interactive visualizations</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}>
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

      {/* Vendor Outstanding Tab */}
      {activeTab === 'Vendor Outstanding' && (
        <>
          {loading ? (
            <div className="flex gap-4">
              {[0, 1].map(i => <Skeleton key={i} className="flex-1 h-[72px] rounded-xl" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 w-full">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Vendors with Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{outstandingData.kpis?.vendorCount ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Vendor Payables</p>
                <p className="text-2xl font-bold text-orange-500">₹{fmt(outstandingData.kpis?.vendorPayables || 0)}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Vendor-wise Outstanding Summary</h3>
            </div>
            {loading ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left px-5 py-3">VENDOR</th>
                      <th className="text-right px-5 py-3">TOTAL BILLS</th>
                      <th className="text-right px-5 py-3">TOTAL AMOUNT</th>
                      <th className="text-right px-5 py-3">PAID</th>
                      <th className="text-right px-5 py-3">OUTSTANDING</th>
                      <th className="text-left px-5 py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} cols={6} widths={["w-32", "w-10", "w-16", "w-16", "w-16", "w-12"]} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : vendorData.length === 0 ? (
              <div className="p-6"><EmptyState icon="store" title="No Vendor Data" description="Add vendors and bills to see outstanding summary" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">VENDOR</th>
                    <th className="text-right px-5 py-3">TOTAL BILLS</th>
                    <th className="text-right px-5 py-3">TOTAL AMOUNT</th>
                    <th className="text-right px-5 py-3">PAID</th>
                    <th className="text-right px-5 py-3">OUTSTANDING</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                  {vendorData.map((v, i) => (
                    <motion.tr 
                      key={v.id || v.vendor} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                            {initials(v.vendor)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{toTitleCase(v.vendor)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 text-right tabular-nums">{v.totalBills > 0 ? v.totalBills : '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 text-right tabular-nums">{v.totalAmount > 0 ? `₹${fmt(v.totalAmount)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-green-600 dark:text-green-400 text-right tabular-nums">{v.paid > 0 ? `₹${fmt(v.paid)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <span className={`text-sm font-bold ${v.outstanding > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {v.outstanding > 0 ? `₹${fmt(v.outstanding)}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 font-medium">{v.status || '—'}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Financier Outstanding Tab */}
      {activeTab === 'Financier Outstanding' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Financier Outstanding Report</h3>
            </div>
            {loading ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left px-5 py-3">FINANCIER</th>
                      <th className="text-right px-5 py-3">LOANS</th>
                      <th className="text-right px-5 py-3">ACTIVE</th>
                      <th className="text-right px-5 py-3">TOTAL LOANED</th>
                      <th className="text-right px-5 py-3">PAID</th>
                      <th className="text-right px-5 py-3">OUTSTANDING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} cols={6} widths={["w-32", "w-10", "w-10", "w-16", "w-16", "w-16"]} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : financierData.length === 0 ? (
              <div className="p-6"><EmptyState icon="bank" title="No Financier Data" description="Add financiers and loans to see outstanding report" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">FINANCIER</th>
                    <th className="text-right px-5 py-3">LOANS</th>
                    <th className="text-right px-5 py-3">ACTIVE</th>
                    <th className="text-right px-5 py-3">TOTAL LOANED</th>
                    <th className="text-right px-5 py-3">PAID</th>
                    <th className="text-right px-5 py-3">OUTSTANDING</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                  {financierData.map((f, i) => (
                    <motion.tr 
                      key={f.id || f.financier} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link to={`/financiers/${f.id}`} className="text-sm font-semibold" style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>{toTitleCase(f.financier)}</Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 text-right tabular-nums">{f.loans || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 text-right tabular-nums">{f.active || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 text-right tabular-nums">{f.principal > 0 ? `₹${fmt(f.principal)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-green-600 dark:text-green-400 text-right tabular-nums">{f.repaid > 0 ? `₹${fmt(f.repaid)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-red-500 dark:text-red-400 text-right tabular-nums">{f.outstanding > 0 ? `₹${fmt(f.outstanding)}` : '—'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Payments Summary Tab */}
      {activeTab === 'Payments Summary' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex gap-4">
              {[0, 1, 2].map(i => <Skeleton key={i} className="flex-1 h-[72px] rounded-xl" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 w-full">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Vendor Payments Total</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">₹{fmt(paymentsSummary.vendorTotal)}</p>
                <p className="text-xs text-gray-400 font-medium mt-1">{paymentsSummary.vendorCount} transactions</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Financier Repayments Total</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">₹{fmt(paymentsSummary.financierTotal)}</p>
                <p className="text-xs text-gray-400 font-medium mt-1">{paymentsSummary.financierCount} transactions</p>
              </div>
              <div className="rounded-xl p-5 shadow-sm flex-1 min-w-0" style={{ background: 'var(--color-primary-muted)', border: '1px solid rgba(0,200,150,0.25)' }}>
                <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-primary)' }}>Grand Total</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--color-text-primary)' }}>₹{fmt(paymentsSummary.grandTotal)}</p>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-muted)' }}>{paymentsSummary.grandCount} total transactions</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Payments Trend</h3>
            {loading ? (
              <Skeleton className="h-[240px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barGap={4} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => `₹${fmt(v)}`} />
                  <Bar dataKey="vendor" name="Vendor" fill="#00C896" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="financier" name="Financier" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Overdue Bills Tab */}
      {activeTab === 'Overdue Bills' && (
        <div className="space-y-6">
          {loading ? (
            <Skeleton className="h-[72px] w-full rounded-xl" />
          ) : (
            <div className="flex flex-wrap gap-6 w-full">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm border-red-100 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 flex-1 min-w-0">
                <p className="text-xs font-bold text-red-500 uppercase mb-1">Total Overdue</p>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 tabular-nums">₹{fmt(overdueBillsInfo.total)}</p>
                <p className="text-xs text-gray-400 mt-1">Outstanding overdue invoices</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Overdue Bills List</h3>
            </div>
            {loading ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left px-5 py-3">VENDOR</th>
                      <th className="text-left px-5 py-3">BILL #</th>
                      <th className="text-left px-5 py-3">DUE DATE</th>
                      <th className="text-right px-5 py-3">AMOUNT</th>
                      <th className="text-right px-5 py-3">OUTSTANDING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} cols={5} widths={["w-32", "w-16", "w-20", "w-16", "w-16"]} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : overdueBillsInfo.list.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="ledger" title="No Overdue Bills" description="Excellent! No invoices are currently past their due date." />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-5 py-3">VENDOR</th>
                    <th className="text-left px-5 py-3">BILL #</th>
                    <th className="text-left px-5 py-3">DUE DATE</th>
                    <th className="text-right px-5 py-3">AMOUNT</th>
                    <th className="text-right px-5 py-3">OUTSTANDING</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                  {overdueBillsInfo.list.map((b, i) => (
                    <motion.tr 
                      key={b.id} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{toTitleCase(b.vendor)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 font-mono">{b.billNo}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 font-mono">{b.dueDate}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 text-right tabular-nums">₹{fmt(b.amount)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-red-500 text-right tabular-nums">₹{fmt(b.outstanding)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Monthly Trends Tab */}
      {activeTab === 'Monthly Trends' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Outflow Trend</h3>
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => `₹${fmt(v)}`} />
                <Line type="monotone" dataKey="vendor" name="Vendor" stroke="#00C896" strokeWidth={2.5} dot={{ r: 4, fill: '#00C896' }} />
                <Line type="monotone" dataKey="financier" name="Financier" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3, fill: '#94a3b8' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Yearly Trends Tab */}
      {activeTab === 'Yearly Trends' && (() => {
        const currentYearData = yearlyData
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Yearly Summary ({currentYearData.title})</h3>
              <div className="w-36">
                <DropdownSelect
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={availableYears}
                />
              </div>
            </div>
            {loading ? (
              <div className="space-y-6">
                <div className="flex gap-4">
                  {[0, 1, 2].map(i => <Skeleton key={i} className="flex-1 h-[72px] rounded-xl" />)}
                </div>
                <Skeleton className="h-[240px] w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 w-full mb-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Total Billed</p>
                    <p className="text-2xl font-bold tabular-nums stat-value">{currentYearData.totalBills}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{currentYearData.totalPayments}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4 flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Pending Outflow</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{currentYearData.pending}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={currentYearData.chartData} barGap={4} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `₹${v / 100000}L`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `₹${fmt(v)}`} />
                    <Bar dataKey="billed" name="Billed" fill="#00C896" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default Reports
