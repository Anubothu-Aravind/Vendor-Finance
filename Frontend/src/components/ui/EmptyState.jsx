import React from 'react'
import { Button } from './Button'

export function EmptyState({
  icon = 'document',
  title = "No data found",
  description = "Get started by creating a new record.",
  action // Optional object: { label, onClick }
}) {
  const renderSVG = (iconName) => {
    const commonProps = {
      width: "48",
      height: "48",
      viewBox: "0 0 48 48",
      fill: "none",
      stroke: "var(--color-text-muted)",
      strokeWidth: 1.5,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }

    switch (iconName) {
      case 'receipt':
        return (
          <svg {...commonProps}>
            <path d="M12 8h24v32l-4-2-4 2-4-2-4 2-4-2-4 2V8z" />
            <path d="M18 16h12M18 24h12M18 32h6" />
          </svg>
        )
      case 'store':
        return (
          <svg {...commonProps}>
            <path d="M6 16v24h36V16M4 8l4 8h32l4-8H4z" />
            <path d="M16 26h16v14H16z" />
            <path d="M24 16v10M12 16v4M36 16v4" />
          </svg>
        )
      case 'document':
        return (
          <svg {...commonProps}>
            <path d="M14 6h16l8 8v28H14V6z" />
            <path d="M30 6v8h8" />
            <path d="M20 20h8M20 28h8M20 36h4" />
          </svg>
        )
      case 'wallet':
        return (
          <svg {...commonProps}>
            <path d="M8 12h32v24H8z" />
            <path d="M8 12h26a4 4 0 0 0-4-4H8" />
            <path d="M28 24h12M34 24a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        )
      case 'bank':
        return (
          <svg {...commonProps}>
            <path d="M6 40h36M8 20h4v20H8zm12 0h4v20h-4zm12 0h4v20h-4zM6 20h36L24 8 6 20z" />
          </svg>
        )
      case 'loan':
        return (
          <svg {...commonProps}>
            <path d="M10 6h18l10 10v26H10V6z" />
            <path d="M28 6v10h10" />
            <circle cx="20" cy="28" r="6" />
            <path d="M19 26v4M18 27h4M18 29h4" />
          </svg>
        )
      case 'cheque':
        return (
          <svg {...commonProps}>
            <path d="M4 12h40v24H4z" />
            <path d="M8 18h12M8 24h16M32 18h4v6h-4zm-24 8h24" />
          </svg>
        )
      case 'ledger':
        return (
          <svg {...commonProps}>
            <path d="M6 12h18v28H6zm36 0H24v28h18z" />
            <path d="M24 12v28" />
            <path d="M10 18h8M10 26h8M30 18h8M30 26h8" />
          </svg>
        )
      case 'history':
        return (
          <svg {...commonProps}>
            <circle cx="24" cy="24" r="18" />
            <path d="M24 12v12l8 4" />
            <path d="M24 6a18 18 0 0 1 12 4.5" />
          </svg>
        )
      case 'chart':
        return (
          <svg {...commonProps}>
            <path d="M8 40V8M8 40h32" />
            <path d="M14 34h4V22h-4v12zm10 0h4V14h-4v20zm10 0h4V26h-4v8z" />
          </svg>
        )
      case 'user':
        return (
          <svg {...commonProps}>
            <path d="M24 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-14 20c0-6 6-8 14-8s14 2 14 8" />
          </svg>
        )
      case 'search':
        return (
          <svg {...commonProps}>
            <circle cx="20" cy="20" r="12" />
            <path d="M28 28l14 14" />
          </svg>
        )
      default:
        return (
          <svg {...commonProps}>
            <path d="M14 6h16l8 8v28H14V6z" />
            <path d="M30 6v8h8" />
          </svg>
        )
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 py-12 rounded-lg w-full"
      style={{
        border: `1px dashed var(--color-border)`,
        background: 'var(--color-bg-surface)',
      }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{title}</h3>
      <p className="text-xs max-w-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
      {action && action.label && action.onClick && (
        <Button variant="default" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
