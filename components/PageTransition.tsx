'use client'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'
  return (
    <div key={pathname} className="page-enter" style={isLogin ? undefined : { paddingTop: '56px' }}>
      {children}
    </div>
  )
}
