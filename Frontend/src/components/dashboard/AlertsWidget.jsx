import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { useDashboardAlerts } from '../../hooks/useDashboardAlerts'
import { usePreferences } from '../../hooks/usePreferences'

export function AlertsWidget() {
  const { alerts, loading } = useDashboardAlerts()
  const { formatDate, formatCurrency } = usePreferences()

  if (loading || !alerts || alerts.length === 0) {
    return null
  }

  // Filter alerts by category
  const loanAlerts = alerts.filter(a => a.metadata?.type === 'loan')
  const chequeAlerts = alerts.filter(a => a.metadata?.type === 'cheque')

  // If there are no alerts of either type, hide the widget
  if (loanAlerts.length === 0 && chequeAlerts.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      
      {/* Maturing Loans Alert Card */}
      {loanAlerts.length > 0 && (
        <div 
          className="rounded-xl border p-5 flex flex-col justify-between transition-all duration-350 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-bg-surface), rgba(245, 166, 35, 0.03))',
            borderColor: 'var(--color-border)',
            borderLeft: '4px solid var(--color-warning)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-warning)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
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

      {/* Bounced Cheques Alert Card */}
      {chequeAlerts.length > 0 && (
        <div 
          className="rounded-xl border p-5 flex flex-col justify-between transition-all duration-350 hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--color-bg-surface), rgba(232, 69, 69, 0.03))',
            borderColor: 'var(--color-border)',
            borderLeft: '4px solid var(--color-danger)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold tracking-wide text-[var(--color-text-secondary)] uppercase">
                  Bounced Cheques
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Failed cheque payouts requiring actions</p>
              </div>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono"
                style={{ background: 'rgba(232, 69, 69, 0.2)', color: 'var(--color-danger)' }}
              >
                {chequeAlerts.length} Failed
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto overflow-x-hidden pr-1">
              {chequeAlerts.map(alert => (
                <div key={alert.id} className="py-3 flex items-center justify-between text-xs transition-colors hover:bg-[var(--color-bg-elevated)]/30 rounded-lg px-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                      {alert.metadata?.partyName || 'Unknown Party'}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      Bounce Date: {formatDate(alert.metadata?.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0 font-bold tabular-nums text-[var(--color-danger)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(alert.metadata?.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
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
