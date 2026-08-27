import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function Card({ className, children, style, ...props }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs transition-all',
        className
      )}
      style={{
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight', className)}
      style={{ fontFamily: 'var(--font-display)' }}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-xl flex items-center justify-between gap-3', className)} {...props}>
      {children}
    </div>
  )
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-emerald-600 dark:text-emerald-400',
  iconBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
  trend,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  link,
  className
}) {
  const content = (
    <div className={cn(
      'group relative p-5 sm:p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col justify-between overflow-hidden',
      link ? 'cursor-pointer' : '',
      className
    )}>
      {/* Top row: Label & Icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </span>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        )}
      </div>

      {/* Middle: Big Metric Value */}
      <div className="my-0.5">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {value}
        </div>
      </div>

      {/* Bottom row: Subtitle context or Trend indicator */}
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span className={cn(
              'font-semibold tabular-nums inline-flex items-center gap-0.5 ml-auto text-xs px-1.5 py-0.5 rounded',
              trendType === 'positive' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' :
              trendType === 'negative' ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' :
              'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
            )}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (link) {
    return (
      <Link to={link} className="block focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}

export default Card
