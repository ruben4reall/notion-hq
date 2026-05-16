'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> { v: T; exp: number }

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    return Date.now() < entry.exp ? entry.v : null
  } catch { return null }
}

function writeCache<T>(key: string, value: T, ttl: number) {
  try { localStorage.setItem(key, JSON.stringify({ v: value, exp: Date.now() + ttl })) } catch {}
}

/**
 * SWR-style hook: shows cached data immediately (no skeleton on return visits),
 * then refreshes in the background. `loading` is only true on a true cold load.
 *
 * @param url   - API endpoint to fetch
 * @param ttl   - Cache lifetime in ms (default 30s)
 */
export function useCache<T>(
  url: string,
  { ttl = 30_000 }: { ttl?: number } = {}
): { data: T | null; loading: boolean; refresh: () => void } {
  const cacheKey = `_swr:${url}`
  const alive = useRef(true)

  const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey))
  const [loading, setLoading] = useState<boolean>(() => readCache<T>(cacheKey) === null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok || !alive.current) return
      const fresh: T = await r.json()
      if (!alive.current) return
      setData(fresh)
      setLoading(false)
      writeCache(cacheKey, fresh, ttl)
    } catch { if (alive.current) setLoading(false) }
  }, [url, cacheKey, ttl])

  useEffect(() => {
    alive.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    return () => { alive.current = false }
  }, [refresh])

  return { data, loading, refresh }
}
