import React, { useState } from 'react'

/**
 * CopyButton
 *
 * Micro-component providing one-click clipboard copy with plain text state.
 */
export default function CopyButton({
  value,
  label = 'Copy',
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback if clipboard API restricted
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: copied ? 'var(--color-success, #22c55e)' : 'var(--color-text-muted)',
        background: 'transparent',
        border: 'none',
        padding: '0 4px',
        cursor: 'pointer',
        transition: 'color 120ms',
      }}
      title={label}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
