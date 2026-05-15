'use client'
import { usePathname } from 'next/navigation'
import { useTimer } from '@/lib/timer-context'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { active } = useTimer()
  const isLogin = pathname === '/login'
  const timerOffset = active && pathname !== '/time' && !isLogin ? 32 : 0
  return (
    <div key={pathname} className="page-enter" style={isLogin ? undefined : { paddingTop: 56 + timerOffset }}>
      {children}
    </div>
  )
}
