'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="5" height="16" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="9.5" y="4" width="5" height="11" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <rect x="16" y="4" width="5" height="7" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
      </svg>
    ),
  },
  {
    href: '/crm',
    label: 'CRM',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M2 21c0-3.866 3.134-7 7-7" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M18 13v-2M18 19v2M15.268 14.5l-1.732-1M20.732 17.5l1.732 1M15.268 17.5l-1.732 1M20.732 14.5l1.732-1" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Agenda',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
        <circle cx="8" cy="16" r="1" fill="currentColor"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
        <circle cx="16" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/roadmap',
    label: 'Roadmap',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M3 12h12M3 18h8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
        <circle cx="19" cy="18" r="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
      </svg>
    ),
  },
  {
    href: '/ideas',
    label: 'Idées',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.686 2 6 4.686 6 8c0 2.21 1.118 4.156 2.83 5.315C9.517 13.867 10 14.612 10 15.5V16h4v-.5c0-.888.483-1.633 1.17-2.185C16.882 12.156 18 10.21 18 8c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M10 19h4M9.5 22h5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Réglages',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth={active ? 2 : 1.5}/>
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
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid var(--border-s)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--nav-bg, rgba(7,7,16,0.92))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 64 }}>
        {items.map(item => {
          const active = path === item.href
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
              {/* Active background pill */}
              <div style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 40,
                height: 38,
                borderRadius: 12,
                background: active ? 'var(--accent-bg)' : 'transparent',
                transition: 'background 0.25s var(--ease-spring)',
                pointerEvents: 'none',
              }} />

              {/* Icon */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                transition: 'transform 0.25s var(--ease-spring)',
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}>
                {item.icon(active)}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '9.5px',
                fontWeight: active ? 700 : 400,
                letterSpacing: active ? '0.01em' : '0.02em',
                position: 'relative',
                zIndex: 1,
                transition: 'font-weight 0.15s, opacity 0.2s',
                opacity: active ? 1 : 0.7,
              }}>
                {item.label}
              </span>

              {/* Active dot */}
              {active && (
                <div style={{
                  position: 'absolute',
                  bottom: 2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
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
