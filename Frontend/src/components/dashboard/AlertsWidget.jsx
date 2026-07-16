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
          className="rounded-xl border p-5 flex flex-col justify-between transition-all border-t-2"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-warning)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div 
                  className="p-2 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245, 166, 35, 0.12)', color: 'var(--color-warning)' }}
                >
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  Maturing Loans
                </h3>
              </div>
              <span 
                className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono"
                style={{ background: 'rgba(245, 166, 35, 0.2)', color: 'var(--color-warning)' }}
              >
                {loanAlerts.length}
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto pr-1">
              {loanAlerts.map(alert => (
                <div key={alert.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {alert.metadata?.partyName || 'Unknown Financier'}
                    </p>
                    <p className="mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Matures: {formatDate(alert.metadata?.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0 font-semibold font-mono" style={{ color: 'var(--color-warning)' }}>
                    {formatCurrency(alert.metadata?.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <Link 
              to="/loans" 
              className="flex items-center justify-end text-xs font-semibold hover:underline"
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
          className="rounded-xl border p-5 flex flex-col justify-between transition-all border-t-2"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-danger)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div 
                  className="p-2 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(232, 69, 69, 0.12)', color: 'var(--color-danger)' }}
                >
                  <XCircle size={18} />
                </div>
                <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  Bounced Cheques
                </h3>
              </div>
              <span 
                className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono"
                style={{ background: 'rgba(232, 69, 69, 0.2)', color: 'var(--color-danger)' }}
              >
                {chequeAlerts.length}
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto pr-1">
              {chequeAlerts.map(alert => (
                <div key={alert.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {alert.metadata?.partyName || 'Unknown Party'}
                    </p>
                    <p className="mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Bounce Date: {formatDate(alert.metadata?.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0 font-semibold font-mono" style={{ color: 'var(--color-danger)' }}>
                    {formatCurrency(alert.metadata?.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <Link 
              to="/cheques" 
              className="flex items-center justify-end text-xs font-semibold hover:underline"
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
