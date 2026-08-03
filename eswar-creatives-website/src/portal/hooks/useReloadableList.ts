import { useCallback, useRef, useState } from 'react'

// Fixes the "list resets to top" bug: a screen that reloads its data after
// closing a drawer/modal used to flip a single `loading` boolean and swap
// the whole list for a "Loading..." placeholder. That collapses the page's
// height for a moment, so the browser clamps scroll position back near the
// top - the user loses their place every time they close a detail panel.
//
// This hook distinguishes the true first load (no data yet - a full-page
// skeleton is appropriate) from every later reload (data already on screen -
// keep it rendered, just mark `refreshing` so the caller can show a subtle
// fade instead of collapsing the content).
//
// Doesn't wrap the fetch call itself, since real list loaders (e.g.
// LeadsTab's multi-query fetch with filters) don't fit one rigid signature -
// callers wrap their own existing load() with start()/finish().
export function useReloadableList() {
  const hasLoadedRef = useRef(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const start = useCallback(() => {
    if (hasLoadedRef.current) {
      setRefreshing(true)
    } else {
      setInitialLoading(true)
    }
  }, [])

  const finish = useCallback(() => {
    hasLoadedRef.current = true
    setInitialLoading(false)
    setRefreshing(false)
  }, [])

  return { initialLoading, refreshing, start, finish }
}
