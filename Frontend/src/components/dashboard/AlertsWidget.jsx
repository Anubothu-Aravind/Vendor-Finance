import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, RefreshCw, Hash, Calendar, Building2, AlertCircle } from 'lucide-react'
import { useDashboardAlerts } from '../../hooks/useDashboardAlerts'
import { usePreferences } from '../../hooks/usePreferences'

export function AlertsWidget() {
  const { alerts, loading } = useDashboardAlerts()
  const { formatDate, formatCurrency } = usePreferences()
  const navigate = useNavigate()

  if (loading || !alerts || alerts.length === 0) return null

  const loanAlerts   = alerts.filter(a => a.metadata?.type === 'loan')
  const chequeAlerts = alerts.filter(a => a.metadata?.type === 'cheque')

  if (loanAlerts.length === 0 && chequeAlerts.length === 0) return null

  // Map cheque type to human label
  const chequeTypeLabel = (t) => {
    if (!t) return 'Cheque'
    const map = {
      ISSUED_VENDOR: 'Vendor Payment',
      ISSUED_FINANCIER: 'Financier Payment',
      RECEIVED_FINANCIER: 'Received from Financier',
      OTHER: 'Other'
    }
    return map[t] || t
  }

  const handleRetryPayment = (e, alert) => {
    e.stopPropagation()
    navigate(`/cheques?highlight=${alert.metadata?.chequeId || alert.metadata?.id}`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

      {/* Maturing Loans Alert Card */}
      {loanAlerts.length > 0 && (
        <div
          className="rounded-xl border p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-bg-surface), rgba(245, 166, 35, 0.03))',
            borderColor: 'var(--color-border)',
            borderLeft: '4px solid var(--color-warning)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-warning)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold tracking-wide text-[var(--color-text-secondary)] uppercase">
                  Maturing Loans
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Credit note drawdowns due shortly</p>
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono"
                style={{ background: 'rgba(245, 166, 35, 0.2)', color: 'var(--color-warning)' }}
              >
                {loanAlerts.length} Due
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto overflow-x-hidden pr-1">
              {loanAlerts.map(alert => (
                <div key={alert.id} className="py-3 flex items-center justify-between text-xs transition-colors hover:bg-[var(--color-bg-elevated)]/30 rounded-lg px-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                      {alert.metadata?.partyName || 'Unknown Financier'}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      Matures: {formatDate(alert.metadata?.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0 font-bold tabular-nums text-[var(--color-warning)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(alert.metadata?.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <Link
              to="/loans"
              className="flex items-center justify-end text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-warning)' }}
            >
              <span>View Loans Manager</span>
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Bounced Cheques Alert Card — detailed */}
      {chequeAlerts.length > 0 && (
        <div
          className="rounded-xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-bg-surface), rgba(232, 69, 69, 0.03))',
            borderColor: 'var(--color-border)',
            borderLeft: '4px solid var(--color-danger)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          {/* Card Header */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold tracking-wide text-[var(--color-text-secondary)] uppercase">
                  Bounced Cheques
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Failed cheque payouts requiring action</p>
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono"
                style={{ background: 'rgba(232, 69, 69, 0.2)', color: 'var(--color-danger)' }}
              >
                {chequeAlerts.length} Failed
              </span>
            </div>
          </div>

          {/* Detailed rows per bounced cheque */}
          <div className="divide-y divide-[var(--color-border)] max-h-80 overflow-y-auto">
            {chequeAlerts.map(alert => {
              const m = alert.metadata || {}
              return (
                <div key={alert.id} className="px-5 py-4 space-y-3">

                  {/* Party name + amount */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--color-text-primary)] truncate" style={{ fontFamily: 'var(--font-display)' }}>
                        {m.partyName || 'Unknown Party'}
                      </p>
                      {m.partyAddress && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{m.partyAddress}</p>
                      )}
                      {m.partyGstin && (
                        <p className="text-[10px] font-mono text-[var(--color-text-muted)]">GSTIN: {m.partyGstin}</p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Failed Amount</p>
                      <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-display)' }}>
                        {formatCurrency(m.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Detail grid: cheque #, type, dates */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center space-x-2">
                      <Hash size={11} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <p className="text-[9px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Cheque No.</p>
                        <p className="text-xs font-mono font-bold text-[var(--color-text-primary)]">#{m.chequeNumber || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Building2 size={11} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <p className="text-[9px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Type</p>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{chequeTypeLabel(m.chequeType)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar size={11} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <p className="text-[9px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Cheque Date</p>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{formatDate(m.chequeDate) || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar size={11} className="text-[var(--color-text-muted)] shrink-0" />
                      <div>
                        <p className="text-[9px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Bounce Date</p>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{formatDate(m.bounceDate) || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Why failed */}
                  <div
                    className="flex items-start space-x-2 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(232, 69, 69, 0.08)', border: '1px solid rgba(232,69,69,0.2)' }}
                  >
                    <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-danger)' }}>Reason for Failure</p>
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] mt-0.5">{m.bounceReason || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={e => handleRetryPayment(e, alert)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(232, 69, 69, 0.12)', color: 'var(--color-danger)', border: '1px solid rgba(232,69,69,0.25)' }}
                    >
                      <RefreshCw size={11} />
                      <span>Retry Payment</span>
                    </button>
                    <Link
                      to={`/cheques`}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      <span>View in Registry</span>
                      <ChevronRight size={11} />
                    </Link>
                  </div>

                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--color-border)]">
            <Link
              to="/cheques"
              className="flex items-center justify-end text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-danger)' }}
            >
              <span>Go to Cheques Registry</span>
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}

export default AlertsWidget
