import React from 'react'
import { cn } from '@/utils/cn'

export const Button = React.forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  className,
  disabled,
  type = 'button',
  ...props
}, ref) => {
  // Font, case, and letter-spacing are enforced globally in index.css via the
  // global button reset rule. We do NOT set uppercase or font-display here.
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none'

  const variants = {
    default:     'text-white focus:ring-[var(--color-primary)]',
    secondary:   'border focus:ring-[var(--color-border-strong)]',
    outline:     'border focus:ring-[var(--color-border-strong)]',
    ghost:       'focus:ring-[var(--color-border-strong)]',
    destructive: 'text-white focus:ring-[var(--color-danger)]',
  }

  const sizes = {
    sm:   'h-8 px-3 text-xs',
    md:   'h-9 px-4 text-sm',
    lg:   'h-10 px-6 text-sm',
    icon: 'h-9 w-9 p-0',
  }

  // Inline styles track CSS vars at runtime — gradient primary for default CTA
  const variantStyles = {
    default: {
      background: 'var(--gradient-primary)',
      color: '#ffffff',
    },
    secondary: {
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-primary)',
      borderColor: 'var(--color-border-strong)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-text-primary)',
      borderColor: 'var(--color-border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
    },
    destructive: {
      background: 'var(--color-danger)',
      color: '#ffffff',
    },
  }

  const hoverStyles = {
    default:     { filter: 'brightness(0.9)' },
    secondary:   { background: 'var(--color-bg-hover)', borderColor: 'var(--color-primary)' },
    outline:     { background: 'var(--color-bg-hover)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' },
    ghost:       { background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' },
    destructive: { filter: 'brightness(0.85)' },
  }

  const leaveStyles = {
    default:     { filter: '' },
    secondary:   { background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-strong)' },
    outline:     { background: 'transparent', borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)' },
    ghost:       { background: 'transparent', color: 'var(--color-text-secondary)' },
    destructive: { filter: '' },
  }

  const handleMouseEnter = (e) => {
    if (disabled) return
    const h = hoverStyles[variant] || {}
    Object.assign(e.currentTarget.style, h)
    props.onMouseEnter?.(e)
  }

  const handleMouseLeave = (e) => {
    if (disabled) return
    const base = leaveStyles[variant] || {}
    Object.assign(e.currentTarget.style, base)
    props.onMouseLeave?.(e)
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={variantStyles[variant]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
