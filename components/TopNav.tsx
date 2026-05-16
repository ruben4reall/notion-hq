'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { PresenceIndicator } from './PresenceIndicator'
import { TimeWidget } from './TimeWidget'
import { useEffect, useState } from 'react'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/todo', label: 'Todo' },
  { href: '/kanban', label: 'Kanban' },
  { href: '/crm', label: 'CRM' },
  { href: '/calendar', label: 'Calendrier' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/ideas', label: 'Idées' },
  { href: '/time', label: 'Temps' },
  { href: '/notes', label: 'Notes' },
]

function useStreak() {
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    fetch('/api/streak').then(r => r.json()).then(d => setStreak(d.streak ?? 0)).catch(() => {})
  }, [])
  return streak
}

function streakEmoji(n: number) {
  if (n >= 30) return '👑'
  if (n >= 14) return '🔥'
  if (n >= 7)  return '💪'
  if (n >= 4)  return '🌟'
  if (n >= 1)  return '⚡'
  return null
}

export function TopNav() {
  const path = usePathname()
  const { user: session, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const streak = useStreak()
  const initials = session?.name?.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  if (path === '/login' || path.startsWith('/auth') || path.startsWith('/org')) return null

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-s)',
        background: 'var(--nav-bg, rgba(7,7,16,0.88))',
      }}
    >
      <div className="flex items-center h-full px-5 max-w-[1280px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-8">
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
            </svg>
          </div>
          <span className="hidden sm:inline" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t0)' }}>
            Manager Dashboard
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {links.map(link => {
            const active = path === link.href
            return (
              <Link key={link.href} href={link.href} style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--t0)' : 'var(--t1)',
                background: active ? 'var(--bg-2)' : 'transparent',
                transition: 'all 0.15s', textDecoration: 'none',
              }}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden lg:flex items-center gap-2">
            <TimeWidget />
            <div className="live-dot" />
          </div>
          <PresenceIndicator />
          <NotificationBell />
          <div className="hidden lg:block"><ThemeToggle /></div>

          {/* User menu */}
          {session && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg-2)', border: '1px solid var(--border-s)',
                  borderRadius: 100, padding: '4px 6px',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <span className="hidden lg:inline" style={{ fontSize: 12, fontWeight: 500, color: 'var(--t0)' }}>
                  {session.name}
                </span>
                <svg className="hidden lg:block" width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--t2)' }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="dropdown-enter" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                    background: 'var(--bg-2)', border: '1px solid var(--border-m)',
                    borderRadius: 10, padding: 4, minWidth: 180,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}>

                    {/* Streak badge */}
                    {streak > 0 && (
                      <div style={{
                        padding: '8px 12px 10px', marginBottom: 2,
                        borderBottom: '1px solid var(--border-s)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: 18 }}>{streakEmoji(streak)}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', lineHeight: 1.2 }}>
                            {streak} jour{streak > 1 ? 's' : ''} de streak
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--t2)' }}>Connecté {streak} jour{streak > 1 ? 's' : ''} d'affilée</p>
                        </div>
                      </div>
                    )}

                    <Link
                      href="/org"
                      onClick={() => setShowMenu(false)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 7,
                        color: 'var(--t1)', fontSize: 13, fontWeight: 500,
                        textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M16 3H8a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M12 3v4M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      Mes projets
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowMenu(false)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 7,
                        color: 'var(--t1)', fontSize: 13, fontWeight: 500,
                        textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                      Paramètres
                    </Link>
                    <button
                      onClick={() => signOut()}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 7,
                        background: 'none', border: 'none',
                        color: 'var(--red)', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
