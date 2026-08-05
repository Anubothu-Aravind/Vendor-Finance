import React from 'react'

/**
 * ProfileCompletionCard
 *
 * Displays a completion score progress bar and missing fields list.
 * Clean, icon-free design.
 */
export default function ProfileCompletionCard({
  completion,
  onFieldClick,
}) {
  if (!completion) return null

  const { score = 0, missing = [] } = completion

  const FIELD_LABELS = {
    businessName: 'Business Name',
    ownerName:    'Owner Name',
    email:        'Email Address',
    phone:        'Phone Number',
    address:      'Corporate Address',
    gstin:        'GSTIN Number',
    website:      'Official Website',
    logo:         'Company Logo',
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Top row: title & percentage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          Profile Completion
        </span>
        <span style={{ fontSize: '18px', fontWeight: 800, color: score === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
          {score}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', width: '100%', background: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden', marginBottom: '14px' }}>
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: score === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-primary)',
            borderRadius: '99px',
            transition: 'width 400ms ease-out',
          }}
        />
      </div>

      {/* Checklist status */}
      {missing.length === 0 ? (
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-success, #22c55e)' }}>
          All profile fields are complete.
        </p>
      ) : (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Missing Info ({missing.length}):
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {missing.map((field) => (
              <li key={field}>
                <button
                  type="button"
                  onClick={() => onFieldClick?.(field)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{FIELD_LABELS[field] || field}</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-primary)' }}>Fill in →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
