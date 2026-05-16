'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const PUBLIC = ['/auth', '/login', '/org']

export default function PageTracker() {
  const path      = usePathname()
  const enterRef  = useRef<number | undefined>(undefined)
  const prevRef   = useRef<string>(path)

  useEffect(() => {
    if (PUBLIC.some(p => path.startsWith(p))) return

    const flush = (leavingPage: string) => {
      const duration = Math.round((Date.now() - (enterRef.current ?? Date.now())) / 1000)
      if (duration < 2) return
      navigator.sendBeacon(
        '/api/analytics/track',
        JSON.stringify({ page: leavingPage, duration_sec: duration })
      )
    }

    // New page — flush previous
    if (prevRef.current !== path) {
      flush(prevRef.current)
      prevRef.current  = path
      enterRef.current = Date.now()
    } else if (enterRef.current === undefined) {
      enterRef.current = Date.now()
    }

    // Flush on tab close / navigate away
    const onUnload = () => flush(path)
    window.addEventListener('pagehide', onUnload)
    return () => window.removeEventListener('pagehide', onUnload)
  }, [path])

  return null
}
