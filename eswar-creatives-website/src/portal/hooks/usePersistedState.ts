import { useState } from 'react'

// A useState that survives refresh (and closing the tab/browser) by mirroring
// to localStorage under a namespaced key. For "major common selections" that
// should stick across a reload rather than silently resetting to a default --
// the admin client scope (PortalContext) is the first consumer; reach for
// this instead of a bare useState for anything in the same category (a last-
// used filter, tab, or view mode a user would expect to still be set after
// refreshing).
//
// Deliberately narrow: JSON-serializable values only, one browser's storage
// only (no cross-device sync), and last-write-wins across multiple tabs (no
// storage-event listener) -- exactly what a single-user admin session needs,
// nothing more.
const PREFIX = 'ec-portal:'

function read<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? initialValue : (JSON.parse(raw) as T)
  } catch {
    return initialValue
  }
}

export function usePersistedState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => read(key, initialValue))

  function set(value: T) {
    setState(value)
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage can fail (quota, private-browsing) -- state still updates in
      // memory, it just won't survive the next refresh. Not worth surfacing.
    }
  }

  return [state, set]
}
