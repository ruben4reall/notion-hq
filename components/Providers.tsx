'use client'

import { AuthProvider } from '@/context/AuthContext'
import { TimerProvider } from '@/lib/timer-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TimerProvider>
        {children}
      </TimerProvider>
    </AuthProvider>
  )
}
