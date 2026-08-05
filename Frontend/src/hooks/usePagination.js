import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Custom hook for production-ready pagination with URL sync, module-specific storage,
 * smart page reset, keyboard shortcuts, and client/server mode support.
 */
export function usePagination({
  items = [],
  totalItems: externalTotalItems,
  moduleKey = 'default',
  initialPageSize = 20,
  mode = 'client',
  filterDependencies = [],
  containerRef = null
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Module-specific page size storage key
  const storageKey = `vf_${moduleKey}_page_size`

  // 2. Read initial page size from sessionStorage or default (20)
  const getSavedPageSize = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const parsed = parseInt(saved, 10)
        if ([10, 20, 50, 100].includes(parsed)) return parsed
      }
    } catch {
      // Fallback if sessionStorage is disabled or errors
    }
    return initialPageSize
  }, [storageKey, initialPageSize])

  const [pageSizeState, setPageSizeState] = useState(getSavedPageSize)

  // Sync pageSize from URL if present
  const pageSizeParam = searchParams.get('pageSize')
  const pageSize = useMemo(() => {
    if (pageSizeParam) {
      const parsed = parseInt(pageSizeParam, 10)
      if ([10, 20, 50, 100].includes(parsed)) return parsed
    }
    return pageSizeState
  }, [pageSizeParam, pageSizeState])

  // 3. Compute total items and total pages
  const totalItemsCount = useMemo(() => {
    if (mode === 'server' && typeof externalTotalItems === 'number') {
      return externalTotalItems
    }
    return Array.isArray(items) ? items.length : 0
  }, [mode, externalTotalItems, items])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItemsCount / pageSize))
  }, [totalItemsCount, pageSize])

  // 4. Read page from URL params or default to 1
  const pageParam = searchParams.get('page')
  const rawPageFromUrl = pageParam ? parseInt(pageParam, 10) : 1
  const validPageFromUrl = isNaN(rawPageFromUrl) || rawPageFromUrl < 1 ? 1 : rawPageFromUrl

  const [pageState, setPageState] = useState(validPageFromUrl)

  // Clamp current page to valid totalPages range
  const currentPage = useMemo(() => {
    return Math.min(validPageFromUrl, totalPages)
  }, [validPageFromUrl, totalPages])

  // Helper to update URL search params
  const updateUrlParams = useCallback((newPage, newPageSize) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (newPage > 1) {
        next.set('page', String(newPage))
      } else {
        next.delete('page')
      }

      if (newPageSize !== 20) {
        next.set('pageSize', String(newPageSize))
      } else {
        next.delete('pageSize')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  // 5. Intelligent Page Reset: Only reset to page 1 if current page becomes invalid
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (currentPage > totalPages) {
      setPageState(1)
      updateUrlParams(1, pageSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDependencies)

  // 6. Smooth Scroll to Top of Table Container on Page Change
  const scrollToTop = useCallback(() => {
    if (containerRef && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [containerRef])

  // 7. Navigation Actions
  const goToPage = useCallback((targetPage) => {
    const clamped = Math.max(1, Math.min(targetPage, totalPages))
    setPageState(clamped)
    updateUrlParams(clamped, pageSize)
    scrollToTop()
  }, [totalPages, pageSize, updateUrlParams, scrollToTop])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, totalPages, goToPage])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage])

  const firstPage = useCallback(() => {
    goToPage(1)
  }, [goToPage])

  const lastPage = useCallback(() => {
    goToPage(totalPages)
  }, [totalPages, goToPage])

  const handleSetPageSize = useCallback((newSize) => {
    const size = parseInt(newSize, 10)
    if (![10, 20, 50, 100].includes(size)) return

    try {
      sessionStorage.setItem(storageKey, String(size))
    } catch {
      // Storage unavailable fallback
    }

    setPageSizeState(size)
    const newTotalPages = Math.max(1, Math.ceil(totalItemsCount / size))
    const clampedPage = Math.min(currentPage, newTotalPages)
    setPageState(clampedPage)
    updateUrlParams(clampedPage, size)
    scrollToTop()
  }, [storageKey, totalItemsCount, currentPage, updateUrlParams, scrollToTop])

  // 8. Refined Condensed Page Number Algorithm (GitHub / MUI style)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = []
    const showFirstPages = currentPage <= 3
    const showLastPages = currentPage >= totalPages - 2

    if (showFirstPages) {
      // Page 1, 2, 3: Show 1, 2, 3, 4, ..., N-1, N
      pages.push(1, 2, 3, 4, '...', totalPages - 1, totalPages)
    } else if (showLastPages) {
      // Near end: Show 1, 2, ..., N-3, N-2, N-1, N
      pages.push(1, 2, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      // Middle: Show 1, 2, ..., X-1, X, X+1, ..., N-1, N
      pages.push(1, 2, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages - 1, totalPages)
    }

    return pages
  }, [totalPages, currentPage])

  // 9. Client-side Slicing
  const startItem = totalItemsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItemsCount)

  const paginatedItems = useMemo(() => {
    if (mode === 'server') return items
    if (!Array.isArray(items)) return []
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [mode, items, currentPage, pageSize])

  // 10. API Ready Helper
  const getQueryParams = useCallback(() => ({
    page: currentPage,
    pageSize,
    limit: pageSize,
    skip: (currentPage - 1) * pageSize
  }), [currentPage, pageSize])

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: totalItemsCount,
    startItem,
    endItem,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    paginatedItems,
    pageNumbers,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize: handleSetPageSize,
    getQueryParams
  }
}
