'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/kanban',
    label: 'Kanban',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="5" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9.5" y="4" width="5" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="16" y="4" width="5" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/crm',
    label: 'CRM',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 21c0-3.866 3.134-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M18 13v-2M18 19v2M15.268 14.5l-1.732-1M20.732 17.5l1.732 1M15.268 17.5l-1.732 1M20.732 14.5l1.732-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/ideas',
    label: 'Idées',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.686 2 6 4.686 6 8c0 2.21 1.118 4.156 2.83 5.315C9.517 13.867 10 14.612 10 15.5V16h4v-.5c0-.888.483-1.633 1.17-2.185C16.882 12.156 18 10.21 18 8c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 19h4M9.5 22h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'rgba(7, 7, 16, 0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {items.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--t2)' }}
            >
              {item.icon}
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.02em',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
