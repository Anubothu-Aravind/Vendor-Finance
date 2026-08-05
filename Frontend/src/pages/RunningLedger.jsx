import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Search, X } from 'lucide-react'
import PrintPreviewModal from '../components/PrintPreviewModal'
import * as XLSX from 'xlsx'
import DropdownSelect from '../components/ui/DropdownSelect'
import CustomDatePicker from '../components/ui/CustomDatePicker'
import { toTitleCase } from '../utils/text'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton, SkeletonTableRow } from '../components/ui/Skeleton'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'
import api from '../utils/api'
import { useToast } from '../hooks/useToast'

const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)

// Parse DD-MMM-YYYY (the formatted date) back to a Date for range comparison
const parseFormattedDate = (str) => {
  if (!str || str === '—') return null
  try {
    return new Date(str)
  } catch { return null }
}

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
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [printDoc, setPrintDoc] = useState(null)
  const [vendors, setVendors] = useState([])
  const [financiers, setFinanciers] = useState([])
  const [partiesLoading, setPartiesLoading] = useState(true)
  const [party, setParty] = useState('')
  const [partyType, setPartyType] = useState('') // 'vendor' | 'financier'
  const [partyId, setPartyId] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const partyParam = searchParams.get('party')
    if (partyParam && partyParam !== party) {
      setParty(partyParam)
      const parts = partyParam.split('|')
      if (parts.length === 3) {
        setPartyType(parts[0])
        setPartyId(parts[1])
      }
    }
    const fromParam = searchParams.get('from') || ''
    if (fromParam !== fromDate) {
      setFromDate(fromParam)
    }
    const toParam = searchParams.get('to') || ''
    if (toParam !== toDate) {
      setToDate(toParam)
    }
  }, [searchParams])

  const handlePartyChange = (val) => {
    setParty(val)
    const parts = val.split('|')
    if (parts.length === 3) {
      setPartyType(parts[0])
      setPartyId(parts[1])
    }
    const newParams = new URLSearchParams(searchParams)
    newParams.set('party', val)
    setSearchParams(newParams)
  }

  const handleFromDateChange = (val) => {
    setFromDate(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('from', val)
    } else {
      newParams.delete('from')
    }
    setSearchParams(newParams)
  }

  const handleToDateChange = (val) => {
    setToDate(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('to', val)
    } else {
      newParams.delete('to')
    }
    setSearchParams(newParams)
  }

  const handleClearDates = () => {
    setFromDate('')
    setToDate('')
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('from')
    newParams.delete('to')
    setSearchParams(newParams)
  }

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
            referenceId: t.referenceId,
            rawDate: t.date, // keep ISO for filtering
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



  // Filter by date range and search term
  const filteredLedger = ledger.filter(row => {
    if (search) {
      const s = search.toLowerCase()
      const matchSearch =
        (row.type || '').toLowerCase().includes(s) ||
        (row.ref || '').toLowerCase().includes(s) ||
        (row.description || '').toLowerCase().includes(s)
      if (!matchSearch) return false
    }
    if (!fromDate && !toDate) return true
    const rowDate = row.rawDate ? new Date(row.rawDate) : null
    if (!rowDate) return true
    const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate())
    if (fromDate) {
      // fromDate is in dd-MM-yyyy format from CustomDatePicker
      const [fd, fm, fy] = fromDate.split('-').map(Number)
      const from = new Date(fy, fm - 1, fd)
      if (rowDay < from) return false
    }
    if (toDate) {
      const [td, tm, ty] = toDate.split('-').map(Number)
      const to = new Date(ty, tm - 1, td)
      if (rowDay > to) return false
    }
    return true
  })

  const handleExport = () => {
    if (!filteredLedger.length) {
      toast('No data to export', 'error')
      return
    }
    try {
      const rawPartyName = party ? party.split('|')[2] || 'Statement' : 'Statement'
      const cleanParty = rawPartyName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
      const todayStr = new Date().toISOString().split('T')[0]
      let dateSegment = todayStr
      if (startDate && endDate) {
        dateSegment = `${startDate}_to_${endDate}`
      } else if (startDate) {
        dateSegment = `from_${startDate}`
      } else if (endDate) {
        dateSegment = `until_${endDate}`
      }
      const fileName = `Ledger_${cleanParty}_${dateSegment}.xlsx`

      const exportData = filteredLedger.map(row => ({
        Date: row.date,
        Reference: row.ref,
        Type: row.type,
        Description: row.description,
        'Debit (Liability)': row.debit > 0 ? row.debit : '',
        'Credit (Payment)': row.credit > 0 ? row.credit : '',
        'Running Balance': row.balance,
      }))

      // Add totals row
      exportData.push({
        Date: 'TOTALS',
        Reference: '',
        Type: '',
        Description: '',
        'Debit (Liability)': filteredLedger.reduce((s, r) => s + r.debit, 0),
        'Credit (Payment)': filteredLedger.reduce((s, r) => s + r.credit, 0),
        'Running Balance': filteredLedger[filteredLedger.length - 1]?.balance ?? 0,
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger')
      XLSX.writeFile(wb, fileName)
      toast('Ledger exported successfully')
    } catch (err) {
      toast('Export failed: ' + err.message, 'error')
    }
  }

  const totalDebit = filteredLedger.reduce((s, r) => s + r.debit, 0)
  const totalCredit = filteredLedger.reduce((s, r) => s + r.credit, 0)
  const finalBalance = filteredLedger.length > 0 ? filteredLedger[filteredLedger.length - 1].balance : 0

  const tableContainerRef = React.useRef(null)

  const pagination = usePagination({
    items: filteredLedger,
    moduleKey: 'ledger',
    initialPageSize: 20,
    filterDependencies: [party, fromDate, toDate, search],
    containerRef: tableContainerRef
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Running Ledger</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Transaction ledger with running balances per party</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-5 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        {/* Filters Bar */}
        <div className="px-5 py-3 flex items-center space-x-3 flex-wrap gap-y-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search ledger..." value={search} onChange={e => setSearch(e.target.value)}
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
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Party</span>
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
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>From</span>
            <CustomDatePicker
              value={fromDate}
              onChange={handleFromDateChange}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>To</span>
            <CustomDatePicker
              value={toDate}
              onChange={handleToDateChange}
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={handleClearDates}
              className="text-xs font-semibold text-brand-primary hover:opacity-80 transition-opacity"
            >
              Clear
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleExport}
            disabled={!party || filteredLedger.length === 0}
            className="flex items-center space-x-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: (!party || filteredLedger.length === 0) ? 'var(--color-bg-elevated)' : 'var(--gradient-primary)',
              color: (!party || filteredLedger.length === 0) ? 'var(--color-text-muted)' : '#fff',
              border: '1px solid var(--color-border)',
              cursor: (!party || filteredLedger.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!party || filteredLedger.length === 0) ? 0.6 : 1,
            }}
          >
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
          <>
            <div ref={tableContainerRef} className="overflow-x-auto">
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
                  {pagination.paginatedItems.map((row, i) => (
                    <motion.tr 
                      key={row.id} 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      onClick={() => {
                        if (!row.referenceId) return
                        let docType = 'bill'
                        if (row.rawType === 'BILL_POSTED') docType = 'bill'
                        else if (row.rawType === 'BILL_PAID') docType = 'payment'
                        else if (row.rawType === 'LOAN_DRAWDOWN') docType = 'loan'
                        else docType = 'repayment'
                        setPrintDoc({ type: docType, id: row.referenceId })
                      }}
                      className={`transition-colors ${row.referenceId ? 'cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700/20'}`}
                    >
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">{row.date}</td>
                      <td className="px-5 py-3.5 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {row.ref}
                      </td>
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
            <Pagination {...pagination} isLoading={ledgerLoading} />
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

export default RunningLedger
