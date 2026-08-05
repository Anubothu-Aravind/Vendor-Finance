import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function SaveConfirmationModal({
  isOpen,
  title = 'Save changes',
  message = 'Are you sure you want to save your changes?',
  onConfirm,
  onCancel,
  onContinueEditing,
  isSaving = false,
}) {
  const saveBtnRef = useRef(null)
  const modalRef = useRef(null)

  const handleClose = () => {
    if (onCancel) onCancel()
    else if (onContinueEditing) onContinueEditing()
  }

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => {
      saveBtnRef.current?.focus()
    }, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (!isSaving && onConfirm) onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onConfirm])

  if (!isOpen) return null

  return createPortal(
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      style={{ fontFamily: 'var(--font-body, sans-serif)' }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-confirm-title"
        aria-describedby="save-confirm-desc"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl transition-all flex flex-col"
        style={{
          background: 'var(--color-bg-surface, #ffffff)',
          border: '1px solid var(--color-border, #e2e8f0)',
          color: 'var(--color-text-primary, #0f172a)',
        }}
      >
        {/* Title */}
        <div className="flex items-start justify-between mb-2">
          <h2
            id="save-confirm-title"
            className="text-base font-bold"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display, sans-serif)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Close
          </button>
        </div>

        {/* Simple Message */}
        <p id="save-confirm-desc" className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Buttons: Cancel & Save Changes */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
            }}
          >
            Cancel
          </button>

          <button
            ref={saveBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold transition-all text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-primary, #00C896)' }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SaveConfirmationModal
