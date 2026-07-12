import React, { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, HelpCircle, X } from 'lucide-react'
import { ConfirmationDialogContext } from './ConfirmationDialogContext'
import { usePreferences } from '../../hooks/usePreferences'

export function ConfirmationDialogProvider({ children }) {
  const { preferences } = usePreferences()
  const [isOpen, setIsOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [config, setConfig] = useState({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger', // 'danger' | 'warning' | 'info'
  })
  
  const resolverRef = useRef(null)

  const confirm = useCallback((message, options = {}) => {
    setConfig({
      title: options.title || 'Confirm Action',
      message: message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
    })
    setIsOpen(true)
    setExiting(false)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const handleConfirm = () => {
    setExiting(true)
    setTimeout(() => {
      setIsOpen(false)
      resolverRef.current?.(true)
    }, 200)
  }

  const handleCancel = () => {
    setExiting(true)
    setTimeout(() => {
      setIsOpen(false)
      resolverRef.current?.(false)
    }, 200)
  }

  // Handle ESC key press to close the dialog
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Determine theme mode (dark vs light)
  const isDark = (() => {
    if (preferences.theme === 'dark') return true
    if (preferences.theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })()

  // Colors always follow the dark design system
  const colors = {
    bg: 'var(--color-bg-elevated)',
    text: 'var(--color-text-primary)',
    subtext: 'var(--color-text-secondary)',
    border: 'var(--color-border)',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    cancelBg: 'var(--color-bg-surface)',
    cancelText: 'var(--color-text-secondary)',
    cancelHover: 'var(--color-bg-hover)',
  }

  const variantColors = {
    danger: {
      icon: AlertTriangle,
      color: 'var(--color-danger)',
      bg: 'rgba(232, 69, 69, 0.12)',
      btnBg: 'var(--color-danger)',
      btnHover: '#c93333',
    },
    warning: {
      icon: AlertTriangle,
      color: 'var(--color-warning)',
      bg: 'rgba(245, 166, 35, 0.12)',
      btnBg: 'var(--color-warning)',
      btnHover: '#d98e10',
    },
    info: {
      icon: Info,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-muted)',
      btnBg: 'var(--color-primary)',
      btnHover: 'var(--color-primary-hover)',
    },
  }

  const activeVariant = variantColors[config.variant] || variantColors.info
  const Icon = activeVariant.icon

  return (
    <ConfirmationDialogContext.Provider value={confirm}>
      {children}
      {isOpen && createPortal(
        <>
          <style>{`
            @keyframes modal-backdrop-in {
              from { opacity: 0; backdrop-filter: blur(0px); }
              to { opacity: 1; backdrop-filter: blur(4px); }
            }
            @keyframes modal-backdrop-out {
              from { opacity: 1; backdrop-filter: blur(4px); }
              to { opacity: 0; backdrop-filter: blur(0px); }
            }
            @keyframes modal-content-in {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes modal-content-out {
              from { transform: scale(1); opacity: 1; }
              to { transform: scale(0.95); opacity: 0; }
            }
          `}</style>
          
          {/* Backdrop */}
          <div
            onClick={handleCancel}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: colors.backdrop,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: exiting ? 'modal-backdrop-out 200ms ease forwards' : 'modal-backdrop-in 200ms ease forwards',
            }}
          >
            {/* Modal Box */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '400px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                animation: exiting ? 'modal-content-out 200ms ease forwards' : 'modal-content-in 200ms ease forwards',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: activeVariant.bg,
                    color: activeVariant.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} />
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: colors.text,
                    letterSpacing: '-0.01em',
                  }}>
                    {config.title}
                  </h3>
                </div>
                <button
                  onClick={handleCancel}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.subtext,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.7,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Message */}
              <p style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 500,
                color: colors.subtext,
                lineHeight: 1.5,
              }}>
                {config.message}
              </p>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '8px 14px',
                    background: colors.cancelBg,
                    border: 'none',
                    borderRadius: '8px',
                    color: colors.cancelText,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => e.target.style.background = colors.cancelHover}
                  onMouseLeave={(e) => e.target.style.background = colors.cancelBg}
                >
                  {config.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    padding: '8px 14px',
                    background: activeVariant.btnBg,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => e.target.style.background = activeVariant.btnHover}
                  onMouseLeave={(e) => e.target.style.background = activeVariant.btnBg}
                >
                  {config.confirmText}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </ConfirmationDialogContext.Provider>
  )
}

export default ConfirmationDialogProvider
