import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { useDashboardAlerts } from '../../hooks/useDashboardAlerts'
import { usePreferences } from '../../hooks/usePreferences'

// Helper for title case conversion
const toTitleCase = (str) => {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export function AlertsWidget() {
  const { alerts, loading } = useDashboardAlerts()
  const { formatDate, formatCurrency } = usePreferences()
  const navigate = useNavigate()

  if (loading || !alerts || alerts.length === 0) return null

  const loanAlerts   = alerts.filter(a => a.metadata?.type === 'loan')
  const chequeAlerts = alerts.filter(a => a.metadata?.type === 'cheque')

  if (loanAlerts.length === 0 && chequeAlerts.length === 0) return null

  const handleRetryPayment = (e, alert) => {
    e.stopPropagation()
    navigate(`/cheques?highlight=${alert.metadata?.chequeId || alert.metadata?.id}`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">

      {/* Maturing Loans Alert Card */}
      {loanAlerts.length > 0 && (
        <div
          className="rounded-xl border p-4 flex flex-col justify-between transition-all duration-200"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                  Maturing Loans
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Credit note drawdowns due shortly</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {loanAlerts.length} Due
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-56 overflow-y-auto pr-1">
              {loanAlerts.map((alert) => (
                <div key={alert.id} className="py-2.5 flex items-center justify-between text-xs transition-colors hover:bg-[var(--color-bg-elevated)]/40 rounded-lg px-2 my-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-[var(--color-text-primary)]">
                      {toTitleCase(alert.metadata?.partyName || 'Unknown Financier')}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {alert.metadata?.loanNo ? `Loan #${alert.metadata.loanNo} · ` : ''}Due: {formatDate(alert.metadata?.date)}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="font-bold tabular-nums text-amber-600 dark:text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>
                      {formatCurrency(alert.metadata?.amount)}
                    </p>
                    <Link
                      to="/loans"
                      className="text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:opacity-80 flex items-center justify-end gap-0.5 mt-0.5 no-underline"
                    >
                      Details <ChevronRight size={10} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[var(--color-border)] flex justify-end">
            <Link
              to="/loans"
              className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 hover:opacity-80 transition-opacity no-underline"
            >
              <span>View Loans Manager</span>
              <ChevronRight size={14} className="ml-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Bounced Cheques Alert Card */}
      {chequeAlerts.length > 0 && (
        <div
          className="rounded-xl border p-4 flex flex-col justify-between transition-all duration-200"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                  Bounced Cheques
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Failed cheque payouts requiring action</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {chequeAlerts.length} Failed
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-56 overflow-y-auto pr-1">
              {chequeAlerts.map((alert) => {
                const m = alert.metadata || {}
                return (
                  <div key={alert.id} className="py-2.5 flex items-center justify-between text-xs transition-colors hover:bg-[var(--color-bg-elevated)]/40 rounded-lg px-2 my-0.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-[var(--color-text-primary)]">
                        {toTitleCase(m.partyName || 'Unknown Party')}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                        Chq #{m.chequeNumber || '—'} · {formatDate(m.bounceDate || m.chequeDate)} · <span className="text-rose-500 font-medium">{m.bounceReason || 'Bounced'}</span>
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="font-bold tabular-nums text-rose-600 dark:text-rose-400" style={{ fontFamily: 'var(--font-display)' }}>
                        {formatCurrency(m.amount)}
                      </p>
                      <button
                        onClick={(e) => handleRetryPayment(e, alert)}
                        className="text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:opacity-80 flex items-center justify-end gap-0.5 mt-0.5 no-underline"
                      >
                        <RefreshCw size={9} /> Resolve <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[var(--color-border)] flex justify-end">
            <Link
              to="/cheques"
              className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 hover:opacity-80 transition-opacity no-underline"
            >
              <span>Go to Cheques Registry</span>
              <ChevronRight size={14} className="ml-0.5" />
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}

export default AlertsWidget
