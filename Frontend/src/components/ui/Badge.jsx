import React from 'react'
import { cn } from '@/utils/cn'

// Maps variant name → CSS variable pairs for bg, text, border
const VARIANT_STYLES = {
  success: {
    bg:     'rgba(0, 200, 150, 0.12)',
    text:   'var(--color-success)',
    border: 'rgba(0, 200, 150, 0.28)',
  },
  warning: {
    bg:     'rgba(245, 166, 35, 0.12)',
    text:   'var(--color-warning)',
    border: 'rgba(245, 166, 35, 0.28)',
  },
  danger: {
    bg:     'rgba(232, 69, 69, 0.12)',
    text:   'var(--color-danger)',
    border: 'rgba(232, 69, 69, 0.28)',
  },
  destructive: {
    bg:     'rgba(232, 69, 69, 0.12)',
    text:   'var(--color-danger)',
    border: 'rgba(232, 69, 69, 0.28)',
  },
  info: {
    bg:     'rgba(74, 158, 255, 0.12)',
    text:   'var(--color-info)',
    border: 'rgba(74, 158, 255, 0.28)',
  },
  blue: {
    bg:     'rgba(74, 158, 255, 0.12)',
    text:   'var(--color-info)',
    border: 'rgba(74, 158, 255, 0.28)',
  },
  purple: {
    bg:     'rgba(139, 92, 246, 0.12)',
    text:   '#a78bfa',
    border: 'rgba(139, 92, 246, 0.28)',
  },
  neutral: {
    bg:     'var(--color-bg-elevated)',
    text:   'var(--color-text-secondary)',
    border: 'var(--color-border)',
  },
  gray: {
    bg:     'var(--color-bg-elevated)',
    text:   'var(--color-text-secondary)',
    border: 'var(--color-border)',
  },
}

export function Badge({ children, label, variant = 'neutral', className, style, ...props }) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border tabular-nums',
        className
      )}
      style={{
        backgroundColor: v.bg,
        color: v.text,
        borderColor: v.border,
        ...style,
      }}
      {...props}
    >
      {label || children}
    </span>
  )
}

export default Badge
