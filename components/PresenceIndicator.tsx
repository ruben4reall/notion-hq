'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { playPresenceSound } from '@/lib/sounds'

interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  connectedAt: string
  online: boolean
  avatarUrl?: string | null
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function relTime(iso: string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `${d} min`
  if (d < 1440) return `${Math.floor(d / 60)}h${d % 60 > 0 ? ` ${d % 60}min` : ''}`
  return `${Math.floor(d / 1440)}j`
}

// ── Desktop hover tooltip ─────────────────────────────────────────────────────

function DesktopTooltip({ user }: { user: PresenceEntry }) {
  const { t } = useLanguage()
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: 'var(--bg-2)', border: '1px solid var(--border-m)',
      borderRadius: 10, padding: '10px 12px', minWidth: 160, zIndex: 100,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
      pointerEvents: 'none',
      animation: 'slideDown 0.18s var(--ease-spring) both',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginBottom: 6 }}>
        {user.username.split(' ')[0]}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: user.online ? '#0ec98c' : '#6b7280', flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, color: user.online ? '#0ec98c' : 'var(--t2)' }}>
          {user.online ? t('online') : t('offline')}
        </span>
      </div>
      {user.online ? (
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>{t('connectedSince')} {relTime(user.connectedAt)}</p>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>{t('seenAgo')} {relTime(user.lastSeen)}</p>
      )}
    </div>
  )
}

// ── Mobile bottom sheet ───────────────────────────────────────────────────────

function MobileSheet({ users, onClose }: { users: PresenceEntry[]; onClose: () => void }) {
  const { t } = useLanguage()
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--bg-1)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border-m)',
          borderBottom: 'none',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'floatIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border-m)',
          margin: '12px auto 20px',
        }} />

        <p style={{
          fontSize: 11, fontWeight: 700, color: 'var(--t2)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 20px', marginBottom: 8,
        }}>
          {t('teamOnline')}
        </p>

        {users.map((user, i) => (
          <div key={user.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 20px',
            borderTop: i > 0 ? '1px solid var(--border-s)' : undefined,
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.username} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: user.online ? 'var(--accent)' : 'var(--bg-3)',
                  color: user.online ? 'white' : 'var(--t2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {initials(user.username)}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 11, height: 11, borderRadius: '50%',
                background: user.online ? '#0ec98c' : '#6b7280',
                border: '2px solid var(--bg-1)',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', marginBottom: 2 }}>
                {user.username}
              </p>
              <p style={{ fontSize: 12, color: user.online ? '#0ec98c' : 'var(--t2)' }}>
                {user.online
                  ? `${t('online')} · ${t('connectedSince')} ${relTime(user.connectedAt)}`
                  : `${t('offline')} · ${t('seenAgo')} ${relTime(user.lastSeen)}`}
              </p>
            </div>

            {/* Live indicator */}
            {user.online && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#0ec98c',
                boxShadow: '0 0 8px #0ec98c88',
                animation: 'pulse-dot 1.8s ease-in-out infinite',
                flexShrink: 0,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PresenceIndicator() {
  const { user: session } = useAuth()
  const [users, setUsers] = useState<PresenceEntry[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const prevOnline = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => setIsTouch(
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024
    )
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const ping = useCallback(async () => {
    if (!session?.name) return
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: session?.name }),
      })
    } catch {}
  }, [session?.name])

  const loadPresence = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await fetch('/api/presence')
      if (!res.ok) return
      const data: PresenceEntry[] = await res.json()
      const currentOnline = new Set(data.filter(u => u.online).map(u => u.id))
      const hasNew = Array.from(currentOnline).some(id => !prevOnline.current.has(id))
      if (hasNew && prevOnline.current.size > 0) playPresenceSound()
      prevOnline.current = currentOnline
      setUsers(data)
    } catch {}
  }, [])

  useEffect(() => {
    ping()
    loadPresence()
    const pingInterval = setInterval(ping, 30000)
    const loadInterval = setInterval(loadPresence, 15000)
    const onVisible = () => { if (!document.hidden) { ping(); loadPresence() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(pingInterval)
      clearInterval(loadInterval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ping, loadPresence])

  if (users.length === 0) return null

  // ── Touch: avatars → bottom sheet
  if (isTouch) {
    return (
      <>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0,
          }}
        >
          {users.map((user, i) => (
            <div key={user.id} style={{ position: 'relative', marginLeft: i > 0 ? -8 : 0, zIndex: users.length - i }}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.username} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-0)', display: 'block' }} />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: user.online ? 'var(--accent)' : 'var(--bg-3)',
                  color: user.online ? 'white' : 'var(--t2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  border: '2px solid var(--bg-0)',
                }}>
                  {initials(user.username)}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: user.online ? '#0ec98c' : '#6b7280',
                border: '1.5px solid var(--bg-0)',
              }} />
            </div>
          ))}
        </button>
        {sheetOpen && <MobileSheet users={users} onClose={() => setSheetOpen(false)} />}
      </>
    )
  }

  // ── Desktop: hover tooltips
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {users.map((user, i) => (
        <div
          key={user.id}
          style={{ position: 'relative', marginLeft: i > 0 ? -8 : 0, zIndex: users.length - i }}
          onMouseEnter={() => setHoveredId(user.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.username} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-0)', display: 'block', cursor: 'default' }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: user.online ? 'var(--accent)' : 'var(--bg-3)',
              color: user.online ? 'white' : 'var(--t2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              border: '2px solid var(--bg-0)',
              cursor: 'default',
            }}>
              {initials(user.username)}
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 8, height: 8, borderRadius: '50%',
            background: user.online ? '#0ec98c' : '#6b7280',
            border: '1.5px solid var(--bg-0)',
          }} />
          {hoveredId === user.id && <DesktopTooltip user={user} />}
        </div>
      ))}
    </div>
  )
}
