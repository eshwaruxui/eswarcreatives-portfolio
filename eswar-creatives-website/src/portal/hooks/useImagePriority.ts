// Cancellable, cache-backed image loader for the portal.
//
// Remote images are fetched as object URLs so each fetch can be:
//   - prioritised (Priority Hints: 'high' for the image on screen, 'low' for a
//     background preload), and
//   - aborted (AbortController) the moment the user moves on.
//
// A single hook instance can be shared by several images on one surface (the
// mockup lightbox passes one loader to its main image and reads the same cache
// for the prev/next peeks), or a component can use its own private instance.
import { useCallback, useEffect, useMemo, useRef } from 'react'

export type ImagePriority = 'high' | 'low'

export interface ImagePriorityApi {
  // Load (or return cached) the on-screen image. A 'high' load supersedes any
  // previous in-flight 'current' load. Resolves to an object URL, or null if
  // the fetch was aborted or failed.
  loadImage: (url: string, priority?: ImagePriority) => Promise<string | null>
  // Background preload of the next image only (low priority). Replaces any
  // earlier preload still in flight. Resolves to the object URL when ready, so
  // callers can re-render once a peek/preview becomes available.
  preloadNext: (url: string) => Promise<string | null>
  // Abort the current on-screen fetch if it has not finished.
  cancelCurrent: () => void
  // Synchronously read an already-loaded object URL, without starting a fetch.
  getCached: (url: string) => string | undefined
}

export function useImagePriority(): ImagePriorityApi {
  const cacheRef = useRef<Map<string, string>>(new Map()) // url -> object URL
  const inflightRef = useRef<Map<string, { controller: AbortController; promise: Promise<string | null> }>>(new Map())
  const currentUrlRef = useRef<string | null>(null)
  const preloadUrlRef = useRef<string | null>(null)

  const abortUrl = useCallback((url: string | null) => {
    if (!url) return
    const inflight = inflightRef.current.get(url)
    if (inflight) {
      inflight.controller.abort()
      inflightRef.current.delete(url)
    }
  }, [])

  const startFetch = useCallback((url: string, priority: ImagePriority): Promise<string | null> => {
    const cached = cacheRef.current.get(url)
    if (cached) return Promise.resolve(cached)
    const existing = inflightRef.current.get(url)
    if (existing) return existing.promise
    const controller = new AbortController()
    // `priority` is a Priority Hints field not yet in the DOM RequestInit type.
    const init: RequestInit & { priority?: ImagePriority } = { signal: controller.signal, priority }
    const promise = fetch(url, init)
      .then((r) => r.blob())
      .then((blob) => {
        const obj = URL.createObjectURL(blob)
        cacheRef.current.set(url, obj)
        return obj as string | null
      })
      .catch(() => null)
      .finally(() => {
        inflightRef.current.delete(url)
      })
    inflightRef.current.set(url, { controller, promise })
    return promise
  }, [])

  const loadImage = useCallback(
    (url: string, priority: ImagePriority = 'high'): Promise<string | null> => {
      // A high-priority load takes over as the on-screen image; abort the prior
      // one if it is still loading and is not also the preloaded next image.
      const prev = currentUrlRef.current
      if (priority === 'high' && prev && prev !== url && prev !== preloadUrlRef.current && !cacheRef.current.has(prev)) {
        abortUrl(prev)
      }
      currentUrlRef.current = url
      return startFetch(url, priority)
    },
    [abortUrl, startFetch]
  )

  const preloadNext = useCallback(
    (url: string): Promise<string | null> => {
      const prev = preloadUrlRef.current
      if (prev && prev !== url && prev !== currentUrlRef.current && !cacheRef.current.has(prev)) {
        abortUrl(prev)
      }
      preloadUrlRef.current = url
      return startFetch(url, 'low')
    },
    [abortUrl, startFetch]
  )

  const cancelCurrent = useCallback(() => {
    abortUrl(currentUrlRef.current)
  }, [abortUrl])

  const getCached = useCallback((url: string) => cacheRef.current.get(url), [])

  // Abort everything in flight and revoke every object URL on unmount.
  useEffect(() => {
    const inflight = inflightRef.current
    const cache = cacheRef.current
    return () => {
      inflight.forEach((e) => e.controller.abort())
      inflight.clear()
      cache.forEach((obj) => URL.revokeObjectURL(obj))
      cache.clear()
    }
  }, [])

  // Stable identity so consumers can safely list the loader in effect deps.
  return useMemo(
    () => ({ loadImage, preloadNext, cancelCurrent, getCached }),
    [loadImage, preloadNext, cancelCurrent, getCached]
  )
}
