import React, { useState, useEffect } from 'react'
import DropdownSelect from './DropdownSelect'

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  startItem = 0,
  endItem = 0,
  pageSize = 20,
  pageNumbers = [1],
  isFirstPage = true,
  isLastPage = true,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
  isLoading = false,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}) {
  const [jumpInput, setJumpInput] = useState('')

  // Keep jump input synced with currentPage
  useEffect(() => {
    setJumpInput('')
  }, [currentPage])

  const handleJumpSubmit = (e) => {
    e.preventDefault()
    const target = parseInt(jumpInput, 10)
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange?.(target)
      setJumpInput('')
    }
  }

  // Keyboard navigation handler (Left/Right/Home/End)
  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (!isFirstPage && !isLoading) onPrevPage?.()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (!isLastPage && !isLoading) onNextPage?.()
    } else if (e.key === 'Home') {
      e.preventDefault()
      if (!isFirstPage && !isLoading) onFirstPage?.()
    } else if (e.key === 'End') {
      e.preventDefault()
      if (!isLastPage && !isLoading) onLastPage?.()
    }
  }

  if (totalItems === 0 && !isLoading) {
    return (
      <div className={`px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 text-xs text-gray-400 ${className}`}>
        <span>No matching records found.</span>
      </div>
    )
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Table Pagination Navigation"
      className={`px-4 py-3 border-t border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/30 transition-all ${className}`}
    >
      {/* Range Display ("Showing X to Y of Z records") */}
      <div className="text-gray-500 dark:text-gray-400 font-medium">
        {totalItems > 0 ? (
          <>
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{startItem} to {endItem}</span> of <span className="font-semibold text-gray-800 dark:text-gray-200">{totalItems}</span> records
          </>
        ) : (
          <span>Loading records...</span>
        )}
      </div>

      {/* MOBILE CONTROLS (< sm screens) */}
      <div className="flex sm:hidden flex-col gap-2.5 w-full pt-2 border-t border-gray-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={isFirstPage || isLoading}
            aria-label="Previous Page"
            className="h-10 px-3.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center shadow-2xs"
          >
            Previous
          </button>

          <span className="font-medium text-xs text-gray-600 dark:text-gray-400">
            Page <span className="font-bold text-gray-900 dark:text-white">{currentPage}</span> / {totalPages}
          </span>

          <button
            type="button"
            onClick={onNextPage}
            disabled={isLastPage || isLoading}
            aria-label="Next Page"
            className="h-10 px-3.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center shadow-2xs"
          >
            Next
          </button>
        </div>

        <div className="flex items-center justify-between w-full">
          <DropdownSelect
            value={pageSize}
            onChange={(val) => onPageSizeChange?.(Number(val))}
            options={pageSizeOptions.map((opt) => ({
              value: opt,
              label: `${opt} / page`
            }))}
            dropUp={true}
            size="sm"
            className="w-28"
          />

          {totalPages > 3 && (
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={String(currentPage)}
                aria-label="Jump to Page Number"
                className="w-12 h-8 px-1 text-center text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <button
                type="submit"
                disabled={!jumpInput || isLoading}
                className="h-8 px-2 text-xs font-semibold rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
              >
                Go
              </button>
            </form>
          )}
        </div>
      </div>

      {/* DESKTOP CONTROLS (>= sm screens) */}
      <div className="hidden sm:flex items-center gap-4">
        {/* Page Navigation Buttons (Text based, no SVG icons) */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={onFirstPage}
            disabled={isFirstPage || isLoading}
            aria-label="Go to First Page"
            title="First Page (Home)"
            className="h-7 px-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
          >
            First
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={onPrevPage}
            disabled={isFirstPage || isLoading}
            aria-label="Go to Previous Page"
            title="Previous Page (Left Arrow)"
            className="h-7 px-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
          >
            Previous
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 px-1">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 dark:text-gray-600 select-none font-medium">
                    ...
                  </span>
                )
              }

              const isCurrent = p === currentPage
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange?.(p)}
                  disabled={isLoading}
                  aria-label={`Page ${p}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`min-w-[28px] h-7 px-2 rounded-md font-semibold text-xs transition-all ${
                    isCurrent
                      ? 'bg-brand-primary text-white shadow-xs font-bold'
                      : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={onNextPage}
            disabled={isLastPage || isLoading}
            aria-label="Go to Next Page"
            title="Next Page (Right Arrow)"
            className="h-7 px-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
          >
            Next
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={onLastPage}
            disabled={isLastPage || isLoading}
            aria-label="Go to Last Page"
            title="Last Page (End)"
            className="h-7 px-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
          >
            Last
          </button>
        </div>

        {/* Jump To Page Form */}
        {totalPages > 3 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <span className="text-gray-400">Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={String(currentPage)}
              aria-label="Jump to Page Number"
              className="w-12 h-7 px-1.5 text-center text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <button
              type="submit"
              disabled={!jumpInput || isLoading}
              className="h-7 px-2 text-xs font-semibold rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
            >
              Go
            </button>
          </form>
        )}

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-700/70 pl-3">
          <DropdownSelect
            value={pageSize}
            onChange={(val) => onPageSizeChange?.(Number(val))}
            options={pageSizeOptions.map((opt) => ({
              value: opt,
              label: `${opt} / page`
            }))}
            dropUp={true}
            size="sm"
            className="min-w-[110px]"
          />
        </div>
      </div>
    </div>
  )
}
