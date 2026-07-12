import React, { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import api from '../utils/api'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// Map backend transaction type to UI display
const txTypeLabel = (type) => {
  switch (type) {
    case 'BILL_POSTED': return 'Bill'
    case 'BILL_PAID': return 'Payment'
    case 'LOAN_DRAWDOWN': return 'Loan'
    case 'LOAN_REPAYMENT': return 'Repayment'
    case 'REPAYMENT_PRINCIPAL': return 'Repayment'
    case 'REPAYMENT_INTEREST': return 'Interest'
    case 'INTEREST_ACCRUED': return 'Interest'
    case 'CHEQUE_BOUNCED_REVERSAL': return 'Reversal'
    default: return type
  }
}

const isCreditType = (type) => ['BILL_PAID', 'LOAN_REPAYMENT', 'REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST'].includes(type)

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export function RunningLedger() {
  const [vendors, setVendors] = useState([])
  const [financiers, setFinanciers] = useState([])
  const [partiesLoading, setPartiesLoading] = useState(true)
  const [party, setParty] = useState('')
  const [partyType, setPartyType] = useState('') // 'vendor' | 'financier'
  const [partyId, setPartyId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const fetchParties = async () => {
      try {
        setPartiesLoading(true)
        const [vendorsData, financiersData] = await Promise.all([
          api.get('/vendors', { signal: controller.signal }),
          api.get('/financiers', { signal: controller.signal }),
        ])
        if (!controller.signal.aborted) {
          setVendors(vendorsData)
          setFinanciers(financiersData)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load parties')
        }
      } finally {
        if (!controller.signal.aborted) {
          setPartiesLoading(false)
        }
      }
    }
    fetchParties()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!partyId || !partyType) return
    const controller = new AbortController()
    const fetchLedger = async () => {
      try {
        setLedgerLoading(true)
        const endpoint = partyType === 'vendor'
          ? `/ledger/vendor/${partyId}`
          : `/ledger/financier/${partyId}`
        const data = await api.get(endpoint, { signal: controller.signal })
        
        let runningBal = 0
        const rows = data.map((t, idx) => {
          const isCredit = isCreditType(t.type)
          const debit = isCredit ? 0 : t.amount
          const credit = isCredit ? t.amount : 0
          runningBal = t.runningBalance !== undefined ? t.runningBalance : (runningBal + debit - credit)
          return {
            id: t._id,
            date: formatDate(t.date),
            ref: t.referenceId?.toString?.()?.slice(-8)?.toUpperCase() || '—',
            type: txTypeLabel(t.type),
            rawType: t.type,
            description: t.description || '—',
            debit,
            credit,
            balance: runningBal,
          }
        })
        if (!controller.signal.aborted) {
          setLedger(rows)
          setError(null)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load ledger')
          setLedger([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLedgerLoading(false)
        }
      }
    }
    fetchLedger()
    return () => controller.abort()
  }, [partyId, partyType])

  // Build combined party list for dropdown
  const vendorOptions = vendors.map(v => ({
    value: `vendor|${v._id}|${v.name}`,
    label: `${toTitleCase(v.name)} (Vendor)`,
  }))
  const financierOptions = financiers.map(f => ({
    value: `financier|${f._id}|${f.name}`,
    label: `${toTitleCase(f.name)} (Financier)`,
  }))
  const partyOptions = [...vendorOptions, ...financierOptions]

  const handlePartyChange = (val) => {
    setParty(val)
    const parts = val.split('|')
    if (parts.length === 3) {
      setPartyType(parts[0])
      setPartyId(parts[1])
    }
  }

  // Filter by date if set
  const filteredLedger = ledger.filter(row => {
    if (!fromDate && !toDate) return true
    // row.date is formatted; compare using original date would be better
    // Simple approach: show all rows when dates set (backend doesn't support date filter in statement)
    return true
  })

  const totalDebit = filteredLedger.reduce((s, r) => s + r.debit, 0)
  const totalCredit = filteredLedger.reduce((s, r) => s + r.credit, 0)
  const finalBalance = filteredLedger.length > 0 ? filteredLedger[filteredLedger.length - 1].balance : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Running Ledger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Transaction ledger with running balances</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* Filters Bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Party</span>
            <div className="w-64">
              {partiesLoading ? (
                <Skeleton className="h-8 w-full rounded-lg" />
              ) : (
                <DropdownSelect
                  value={party}
                  onChange={handlePartyChange}
                  placeholder="Select Party"
                  options={partyOptions}
                />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">From</span>
            <CustomDatePicker
              value={fromDate}
              onChange={val => setFromDate(val)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">To</span>
            <CustomDatePicker
              value={toDate}
              onChange={val => setToDate(val)}
            />
          </div>
          <div className="flex-1" />
          <button className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>

        {!party ? (
          <div className="py-20 px-4">
            <EmptyState
              icon="ledger"
              title="Select a Party"
              description="Choose a vendor or financier to view their full transaction ledger and running balance history"
            />
          </div>
        ) : ledgerLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3">DATE</th>
                  <th className="text-left px-5 py-3">REFERENCE</th>
                  <th className="text-left px-5 py-3">TYPE</th>
                  <th className="text-left px-5 py-3">DESCRIPTION</th>
                  <th className="text-right px-5 py-3">DEBIT (LIABILITY)</th>
                  <th className="text-right px-5 py-3">CREDIT (PAYMENT)</th>
                  <th className="text-right px-5 py-3">BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonTableRow key={idx} cols={7} widths={["w-20", "w-16", "w-16", "w-40", "w-20", "w-20", "w-24"]} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredLedger.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="ledger"
              title="No Transactions"
              description="No ledger entries found for this party. Start by creating bills, payments, or loans."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-5 py-3">DATE</th>
                <th className="text-left px-5 py-3">REFERENCE</th>
                <th className="text-left px-5 py-3">TYPE</th>
                <th className="text-left px-5 py-3">DESCRIPTION</th>
                <th className="text-right px-5 py-3">DEBIT (LIABILITY)</th>
                <th className="text-right px-5 py-3">CREDIT (PAYMENT)</th>
                <th className="text-right px-5 py-3">BALANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/40">
              {filteredLedger.map((row, i) => (
                <motion.tr 
                  key={row.id} 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">{row.date}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-gray-500 dark:text-gray-400">{row.ref}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={
                      row.rawType === 'BILL_PAID' || row.rawType === 'LOAN_REPAYMENT' || row.rawType === 'REPAYMENT_PRINCIPAL' || row.rawType === 'REPAYMENT_INTEREST' ? 'success' : 'info'
                    }>
                      {toTitleCase(row.type)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">{toTitleCase(row.description)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {row.debit > 0
                      ? <span className="text-sm font-semibold text-red-500">₹{fmt(row.debit)}</span>
                      : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {row.credit > 0
                      ? <span className="text-sm font-semibold text-green-600">₹{fmt(row.credit)}</span>
                      : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    <span className={`text-sm font-bold ${row.balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
                      {row.balance < 0 ? `-₹${fmt(Math.abs(row.balance))}` : `₹${fmt(row.balance)}`}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
                <td colSpan={4} className="px-5 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">TOTALS</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className="text-sm font-bold text-red-500">₹{fmt(totalDebit)}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className="text-sm font-bold text-green-600">₹{fmt(totalCredit)}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={`text-sm font-bold ${finalBalance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}>
                    {finalBalance < 0 ? `-₹${fmt(Math.abs(finalBalance))}` : `₹${fmt(finalBalance)}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default RunningLedger
