import React from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import { cn } from '@/utils/cn'

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  children,
  onReset,
  isFiltered = false,
  className
}) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6',
      className
    )}>
      {/* Left side: Search input + custom filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search || ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-9 h-10 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Custom Filter Controls passed via children */}
        {children}
      </div>

      {/* Right side: Reset filters action */}
      {isFiltered && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  )
}

export default FilterToolbar
