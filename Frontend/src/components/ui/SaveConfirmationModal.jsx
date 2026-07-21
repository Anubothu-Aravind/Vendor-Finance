import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Save, Edit3, X } from 'lucide-react'

export function SaveConfirmationModal({
  isOpen,
  title = 'Confirm Changes',
  message = 'You are about to save the following changes.',
  changesSummary = [],
  onConfirm,
  onCancel,
  onContinueEditing,
  isSaving = false,
}) {
  const saveBtnRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      saveBtnRef.current?.focus()
    }, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (onContinueEditing) onContinueEditing()
        else if (onCancel) onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, onContinueEditing])

  if (!isOpen) return null

  return createPortal(
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      style={{ fontFamily: 'var(--font-body, sans-serif)' }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-confirm-title"
        aria-describedby="save-confirm-desc"
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border transition-all animate-scaleUp"
        style={{
          background: 'var(--color-bg-elevated, #1e293b)',
          borderColor: 'var(--color-border, #334155)',
          color: 'var(--color-text-primary, #f8fafc)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-3 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-muted, rgba(0, 200, 150, 0.15))', color: 'var(--color-primary, #00C896)' }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <h2
              id="save-confirm-title"
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--font-display, sans-serif)' }}
            >
              {title}
            </h2>
            <p id="save-confirm-desc" className="text-xs text-gray-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel || onContinueEditing}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Changes Summary Diff Box */}
        {changesSummary && changesSummary.length > 0 ? (
          <div className="my-4 p-3.5 rounded-xl bg-black/20 border border-white/10 space-y-2 max-h-48 overflow-y-auto text-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Modified Fields ({changesSummary.length}):
            </span>
            <div className="divide-y divide-white/5 space-y-2">
              {changesSummary.map((item, idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex flex-col gap-0.5">
                  <span className="font-semibold text-amber-400">{item.label}</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="line-through text-red-400/80 truncate max-w-[180px]">
                      {String(item.oldValue ?? 'Empty')}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-green-400 truncate max-w-[180px]">
                      {String(item.newValue ?? 'Empty')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="my-4 p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-gray-300">
            Form inputs have been modified and are ready to be saved.
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-end">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: 'var(--color-border, #334155)', color: 'var(--color-text-secondary, #94a3b8)' }}
          >
            Cancel
          </button>

          <button
            onClick={onContinueEditing}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white/5 flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ borderColor: 'var(--color-border, #334155)', color: 'var(--color-text-primary, #f8fafc)' }}
          >
            <Edit3 size={14} />
            <span>Continue Editing</span>
          </button>

          <button
            ref={saveBtnRef}
            onClick={onConfirm}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-white shadow-md hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary, #00C896)' }}
          >
            {isSaving ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save size={14} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
