import React, { useEffect, useState } from 'react'

/**
 * StickySaveBar
 *
 * Floating action bar docked at the bottom of the content area.
 * Renders ONLY when there are unsaved changes or during saving.
 * Dismisses immediately upon save success.
 */
export default function StickySaveBar({
  isDirty,
  isSaving,
  changedFieldCount = 0,
  onSave,
  onDiscard,
  onWhatChanged,
}) {
  const [visible, setVisible] = useState(false)

  // Show bar strictly when dirty or saving
  useEffect(() => {
    if (isDirty || isSaving) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [isDirty, isSaving])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-8 z-40 transition-all duration-200 ease-out"
      style={{
        left: 'auto',
        maxWidth: '560px',
        width: 'calc(100% - 300px)',
        minWidth: '300px',
      }}
    >
      <div
        style={{
          padding: '10px 18px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-surface)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Left: status info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isSaving ? (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Saving changes...
            </span>
          ) : (
            <>
              <span className="truncate" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {changedFieldCount > 0
                  ? `${changedFieldCount} field${changedFieldCount !== 1 ? 's' : ''} modified`
                  : 'Unsaved changes'}
              </span>
              {changedFieldCount > 0 && onWhatChanged && (
                <button
                  type="button"
                  onClick={onWhatChanged}
                  className="shrink-0"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    textDecoration: 'underline',
                  }}
                >
                  Review
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onDiscard}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: (isSaving || !isDirty) ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
              cursor: (isSaving || !isDirty) ? 'not-allowed' : 'pointer',
              opacity: (isSaving || !isDirty) ? 0.5 : 1,
            }}
          >
            Discard
          </button>

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={onSave}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: (isSaving || !isDirty) ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
              color: (isSaving || !isDirty) ? 'var(--color-text-muted)' : '#fff',
              cursor: (isSaving || !isDirty) ? 'not-allowed' : 'pointer',
              opacity: (isSaving || !isDirty) ? 0.5 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
