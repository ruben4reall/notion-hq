'use client'
import { usePathname } from 'next/navigation'
import { useTimer } from '@/lib/timer-context'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { active } = useTimer()
  const isPublic = pathname === '/login' || pathname.startsWith('/auth') || pathname.startsWith('/org')
  const timerOffset = active && pathname !== '/time' && !isPublic ? 32 : 0
  return (
    <div key={pathname} className="page-enter" style={isPublic ? undefined : { paddingTop: 56 + timerOffset }}>
      {children}
    </div>
  )
}
