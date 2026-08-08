import { useCallback, useEffect, useMemo, useState } from 'react'

// Client-side pagination state for a list that is already fully in memory.
// Every admin list this serves (Activity, Leads, Enquiries) fetches its rows
// up front and then filters and sorts them in the browser, so paging is a
// slice of an array rather than a new query. No server round trip happens on
// a page change.
//
// Order matters and is not negotiable: sort first, then slice. Slicing before
// the sort would sort only the visible window, so page 2 would hold rows that
// belong on page 1. Callers pass the already-sorted array into
// paginatedSlice() for exactly that reason.
export function usePagination(totalItems: number, initialPageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // The list can shrink underneath a page the caller never touched: a filter
  // narrows the results, a background poll returns fewer rows, a lead is
  // deleted from its drawer. Deriving the page we actually use (rather than
  // trusting state) means the slice and the "Showing X to Y" label can never
  // disagree, and a stale page 4 renders the real last page instead of an
  // empty table.
  const safePage = Math.min(currentPage, totalPages)

  // Pull state back in line once the render has committed. Kept separate from
  // safePage above so the correction never happens during render.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page))
  }, [])

  // Page size and page number always change together. Staying on page 4 while
  // moving from 25 to 100 per page would silently jump the user far deeper
  // into the list than the control they touched implies.
  const changePageSize = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }, [])

  // Call on any filter, search or sort change. Sorted results have to start
  // from the top to mean anything, and a filter applied on page 4 would
  // otherwise land on a page that no longer exists.
  const reset = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const paginatedSlice = useCallback(
    <T,>(items: T[]): T[] => {
      const start = (safePage - 1) * pageSize
      return items.slice(start, start + pageSize)
    },
    [safePage, pageSize]
  )

  // 1-indexed and inclusive, for the "Showing 26 to 50 of 189" label. Both
  // collapse to 0 on an empty list so the label never reads "Showing 1 to 0".
  const { pageStart, pageEnd } = useMemo(() => {
    if (totalItems === 0) return { pageStart: 0, pageEnd: 0 }
    return {
      pageStart: (safePage - 1) * pageSize + 1,
      pageEnd: Math.min(safePage * pageSize, totalItems),
    }
  }, [safePage, pageSize, totalItems])

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    paginatedSlice,
    goToPage,
    changePageSize,
    reset,
    pageStart,
    pageEnd,
  }
}
