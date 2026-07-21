import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Save, Trash2, XCircle } from 'lucide-react'
import { useDirtyStateContext } from '../../context/DirtyStateContext'

export function UnsavedChangesDialog() {
  const { dialogConfig, handleDialogAction } = useDirtyStateContext()
  const primaryBtnRef = useRef(null)
  const dialogRef = useRef(null)

  // Initial focus and focus trap
  useEffect(() => {
    if (!dialogConfig) return
    
    // Focus initial element
    setTimeout(() => {
      primaryBtnRef.current?.focus()
    }, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleDialogAction('cancel')
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogConfig, handleDialogAction])

  if (!dialogConfig) return null

  const isMultiple = dialogConfig.dirtyForms && dialogConfig.dirtyForms.length > 1
  const saveText = isMultiple ? 'Save All' : 'Save Changes'
  const discardText = isMultiple ? 'Discard All' : 'Discard Changes'

  return createPortal(
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      style={{ fontFamily: 'var(--font-body, sans-serif)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all animate-scaleUp"
        style={{
          background: 'var(--color-bg-elevated, #1e293b)',
          borderColor: 'var(--color-border, #334155)',
          color: 'var(--color-text-primary, #f8fafc)',
        }}
      >
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-3 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(245, 166, 35, 0.15)', color: 'var(--color-warning, #f5a623)' }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2
              id="unsaved-dialog-title"
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--font-display, sans-serif)' }}
            >
              {dialogConfig.title}
            </h2>
            <p id="unsaved-dialog-desc" className="text-xs text-gray-400 mt-1 leading-relaxed">
              {dialogConfig.message}
            </p>
          </div>
        </div>

        {/* List of Modified Forms if Multiple */}
        {isMultiple && (
          <div className="my-4 p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 max-h-32 overflow-y-auto text-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Modified Forms:
            </span>
            {dialogConfig.dirtyForms.map(form => (
              <div key={form.id} className="flex items-center gap-2 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                <span className="font-medium truncate">{form.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* 2 Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-end">
          {/* Continue Editing */}
          <button
            ref={primaryBtnRef}
            onClick={() => handleDialogAction('cancel')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--color-border, #334155)', color: 'var(--color-text-secondary, #94a3b8)' }}
          >
            Continue Editing
          </button>

          {/* Discard Changes */}
          <button
            onClick={() => handleDialogAction('discard')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 hover:bg-red-500/20 text-red-400 border border-red-500/30"
          >
            <Trash2 size={14} />
            <span>{discardText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
