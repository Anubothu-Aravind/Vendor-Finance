import React from 'react'
import { cn } from '@/utils/cn'

export const Button = React.forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  className,
  disabled,
  loading = false,
  type = 'button',
  ...props
}, ref) => {
  // Font, case, and letter-spacing are enforced globally in index.css via the
  // global button reset rule. We do NOT set uppercase or font-display here.
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer'

  const variants = {
    default:     'text-white focus:ring-[var(--color-primary)] shadow-sm hover:shadow',
    secondary:   'border focus:ring-[var(--color-border-strong)] shadow-xs hover:shadow-xs',
    outline:     'border focus:ring-[var(--color-border-strong)]',
    ghost:       'focus:ring-[var(--color-border-strong)]',
    destructive: 'text-white focus:ring-[var(--color-danger)] shadow-sm hover:shadow',
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
    default:     { filter: 'brightness(0.92)' },
    secondary:   { background: 'var(--color-bg-hover)', borderColor: 'var(--color-primary)' },
    outline:     { background: 'var(--color-bg-hover)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' },
    ghost:       { background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' },
    destructive: { filter: 'brightness(0.88)' },
  }

  const leaveStyles = {
    default:     { filter: '' },
    secondary:   { background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-strong)' },
    outline:     { background: 'transparent', borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)' },
    ghost:       { background: 'transparent', color: 'var(--color-text-secondary)' },
    destructive: { filter: '' },
  }

  const handleMouseEnter = (e) => {
    if (disabled || loading) return
    const h = hoverStyles[variant] || {}
    Object.assign(e.currentTarget.style, h)
    props.onMouseEnter?.(e)
  }

  const handleMouseLeave = (e) => {
    if (disabled || loading) return
    const base = leaveStyles[variant] || {}
    Object.assign(e.currentTarget.style, base)
    props.onMouseLeave?.(e)
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={variantStyles[variant]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
