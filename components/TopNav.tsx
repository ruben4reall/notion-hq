'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/kanban', label: 'Kanban' },
  { href: '/crm', label: 'CRM' },
  { href: '/ideas', label: 'Idées' },
]

export function TopNav() {
  const path = usePathname()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: 'rgba(7, 7, 16, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center h-full px-5 max-w-[1280px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-8">
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t0)' }}>
            Notion HQ
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {links.map(link => {
            const active = path === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--t0)' : 'var(--t1)',
                  background: active ? 'var(--bg-2)' : 'transparent',
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Live indicator */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="live-dot" />
          <span style={{ fontSize: '11px', color: 'var(--t2)' }}>Live</span>
        </div>
      </div>
    </header>
  )
}
