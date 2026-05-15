'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface ActiveSession {
  id: string
  categorie: string
  debut: string
}

interface TimerCtx {
  active: ActiveSession | null
  elapsed: number
  setActive: (a: ActiveSession | null) => void
  refresh: () => Promise<void>
}

const TimerContext = createContext<TimerCtx>({
  active: null, elapsed: 0,
  setActive: () => {}, refresh: async () => {},
})

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user: session } = useAuth()
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const refresh = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/time?days=1')
      if (res.ok) {
        const { active: a } = await res.json()
        setActive(a ? { id: a.id, categorie: a.categorie, debut: a.debut } : null)
      }
    } catch {}
  }, [session])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    clearInterval(tickRef.current)
    if (active) {
      const tick = () => setElapsed(Math.floor((Date.now() - new Date(active.debut).getTime()) / 1000))
      tick()
      tickRef.current = setInterval(tick, 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(tickRef.current)
  }, [active])

  return (
    <TimerContext.Provider value={{ active, elapsed, setActive, refresh }}>
      {children}
    </TimerContext.Provider>
  )
}

export const useTimer = () => useContext(TimerContext)
