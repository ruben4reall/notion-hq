'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval>>()

  const refresh = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/time?days=1')
      if (res.ok) {
        const { active: a } = await res.json()
        setActive(a ? { id: a.id, categorie: a.categorie, debut: a.debut } : null)
      }
    } catch {}
  }, [session?.user])

  useEffect(() => { refresh() }, [refresh])

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
