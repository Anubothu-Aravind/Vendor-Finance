import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" fill="currentColor" opacity=".15" />
    <path d="M4 7.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ErrorIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" fill="currentColor" opacity=".15" />
    <path d="M5 5l5 5M10 5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" fill="currentColor" opacity=".15" />
    <path d="M7.5 6.5v4M7.5 4.5v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const WarningIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5L13.5 13H1.5L7.5 1.5Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M7.5 5.5v3.5M7.5 10.5v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const CloseIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_CONFIG = {
  success: { Icon: CheckIcon, color: 'var(--color-success)', bg: 'rgba(0, 200, 150, 0.08)', border: 'rgba(0, 200, 150, 0.20)' },
  error:   { Icon: ErrorIcon, color: 'var(--color-danger)',  bg: 'rgba(232, 69, 69, 0.08)',  border: 'rgba(232, 69, 69, 0.20)' },
  info:    { Icon: InfoIcon,  color: 'var(--color-info)',    bg: 'rgba(74, 158, 255, 0.08)', border: 'rgba(74, 158, 255, 0.20)' },
  warning: { Icon: WarningIcon, color: 'var(--color-warning)', bg: 'rgba(245, 166, 35, 0.08)', border: 'rgba(245, 166, 35, 0.20)' },
}

const DURATION = 4000

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({ id, message, type = 'success', onRemove }) {
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.success
  const { Icon } = cfg
  const [exiting, setExiting] = React.useState(false)
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onRemove(id), 300)
  }, [id, onRemove, exiting])

  React.useEffect(() => {
    timerRef.current = setTimeout(dismiss, DURATION)
    return () => clearTimeout(timerRef.current)
  }, [dismiss])

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '11px 13px 11px 16px',
        borderRadius: '10px',
        border: `1px solid ${cfg.border}`,
        background: '#16213a',
        boxShadow: '0 8px 30px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.25)',
        minWidth: '270px',
        maxWidth: '360px',
        overflow: 'hidden',
        animation: exiting
          ? 'toast-out 300ms cubic-bezier(0.4,0,1,1) forwards'
          : 'toast-in 320ms cubic-bezier(0,0,0.2,1) forwards',
        willChange: 'transform, opacity',
      }}
    >
      {/* Accent strip */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '3px', borderRadius: '10px 0 0 10px',
        backgroundColor: cfg.color,
      }} />

      {/* Icon */}
      <span style={{ color: cfg.color, marginTop: '1px', flexShrink: 0 }}>
        <Icon />
      </span>

      {/* Message */}
      <p style={{
        flex: 1, margin: 0, fontSize: '13px', fontWeight: 500,
        color: '#e2e8f0', lineHeight: 1.5, letterSpacing: '-0.01em',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {message}
      </p>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#475569', padding: '2px', borderRadius: '4px',
          display: 'flex', alignItems: 'center', flexShrink: 0,
          marginTop: '1px', transition: 'color 120ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
      >
        <CloseIcon />
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%', backgroundColor: cfg.color, opacity: 0.45,
          animation: `toast-progress ${DURATION}ms linear forwards`,
          transformOrigin: 'left',
        }} />
      </div>
    </div>
  )
}

// ─── Provider ──────────────────────────────────────────────────────────────────

import ToastContext from './ToastContext'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      return next.length > 5 ? next.slice(-5) : next
    })
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <>
          <style>{`
            @keyframes toast-in {
              from { transform: translateX(calc(100% + 20px)); opacity: 0; }
              to   { transform: translateX(0); opacity: 1; }
            }
            @keyframes toast-out {
              from { transform: translateX(0); opacity: 1; max-height: 80px; margin-bottom: 8px; }
              to   { transform: translateX(calc(100% + 20px)); opacity: 0; max-height: 0; margin-bottom: 0; }
            }
            @keyframes toast-progress {
              from { transform: scaleX(1); }
              to   { transform: scaleX(0); }
            }
            @media (prefers-reduced-motion: reduce) {
              @keyframes toast-in  { from { opacity: 0; } to { opacity: 1; } }
              @keyframes toast-out { from { opacity: 1; } to { opacity: 0; } }
            }
          `}</style>
          <div
            aria-label="Notifications"
            style={{
              position: 'fixed', bottom: '20px', right: '20px',
              zIndex: 9999, display: 'flex', flexDirection: 'column',
              gap: '8px', alignItems: 'flex-end', pointerEvents: 'none',
            }}
          >
            {toasts.map(t => (
              <div key={t.id} style={{ pointerEvents: 'all' }}>
                <ToastItem {...t} onRemove={remove} />
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export default ToastProvider


