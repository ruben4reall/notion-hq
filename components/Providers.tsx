'use client'

import { SessionProvider } from 'next-auth/react'
import { TimerProvider } from '@/lib/timer-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <TimerProvider>
        {children}
      </TimerProvider>
    </SessionProvider>
  )
}
