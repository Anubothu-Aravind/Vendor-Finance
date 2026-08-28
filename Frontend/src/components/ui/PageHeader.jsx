import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  children,
  badge,
  className
}) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 mb-6', className)}>
      <div className="space-y-1.5 min-w-0">
        {/* Breadcrumb Trail */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium mb-1 tracking-wide">
            <Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider font-semibold">
              VASTRAMS
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                {crumb.path || crumb.href ? (
                  <Link to={crumb.path || crumb.href} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Page Title & Badges */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>

        {/* Subtitle / Description */}
        {description && (
          <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {/* Action Buttons Slot */}
      {children && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader
