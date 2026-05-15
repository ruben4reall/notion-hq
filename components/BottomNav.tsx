'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
      </svg>
    ),
  },
  {
    href: '/kanban',
    label: 'Kanban',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="5" height="16" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="9.5" y="4" width="5" height="11" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="16" y="4" width="5" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
      </svg>
    ),
  },
  {
    href: '/time',
    label: 'Temps',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/notes',
    label: 'Notes',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/crm',
    label: 'Plus',
    isMore: true,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" opacity={active ? 1 : 0.7}/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity={active ? 1 : 0.7}/>
        <circle cx="19" cy="12" r="1.5" fill="currentColor" opacity={active ? 1 : 0.7}/>
      </svg>
    ),
  },
]

const MORE_PAGES = ['/crm', '/calendar', '/roadmap', '/ideas', '/settings']

export function BottomNav() {
  const path = usePathname()
  const isMoreActive = MORE_PAGES.includes(path)

  if (path === '/login') return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid var(--border-s)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--nav-bg, rgba(7,7,16,0.92))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 64 }}>
        {items.map(item => {
          const active = item.isMore ? isMoreActive : path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: 1,
                padding: '8px 2px',
                color: active ? 'var(--accent)' : 'var(--t2)',
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 0.2s',
              }}
            >
              {/* Active background pill — spans full item width */}
              <div style={{
                position: 'absolute',
                top: 4, left: 6, right: 6, height: 42,
                borderRadius: 12,
                background: active ? 'var(--accent-bg)' : 'transparent',
                transition: 'background 0.25s var(--ease-spring)',
                pointerEvents: 'none',
              }} />

              <div style={{
                position: 'relative', zIndex: 1,
                transition: 'transform 0.25s var(--ease-spring)',
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}>
                {item.icon(active)}
              </div>

              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 400,
                position: 'relative', zIndex: 1,
                transition: 'opacity 0.2s',
                opacity: active ? 1 : 0.7,
              }}>
                {item.label}
              </span>

              {active && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
                  animation: 'scaleIn 0.2s var(--ease-spring) both',
                }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
