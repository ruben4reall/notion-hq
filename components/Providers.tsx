'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { TimerProvider } from '@/lib/timer-context'
import { LanguageProvider } from '@/context/LanguageContext'
import { initAccent } from '@/lib/accent-color'

function AccentInit() {
  useEffect(() => { initAccent() }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <TimerProvider>
          <AccentInit />
          {children}
        </TimerProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}
