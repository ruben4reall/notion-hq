'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { playPresenceSound } from '@/lib/sounds'

interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  connectedAt: string
  online: boolean
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

function UserTooltip({ user }: { user: PresenceEntry }) {
  const connectedDuration = user.online ? relTime(user.connectedAt) : null
  const lastSeenAgo = relTime(user.lastSeen)

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: 'var(--bg-2)', border: '1px solid var(--border-m)',
      borderRadius: 10, padding: '10px 12px', minWidth: 160, zIndex: 100,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', marginBottom: 6 }}>
        {user.username.split(' ')[0]}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: user.online ? '#0ec98c' : '#6b7280', flexShrink: 0,
        }} />
        <p style={{ fontSize: 11, color: user.online ? '#0ec98c' : 'var(--t2)' }}>
          {user.online ? 'En ligne' : 'Hors ligne'}
        </p>
      </div>
      {user.online && connectedDuration && (
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>
          Connecté depuis {connectedDuration}
        </p>
      )}
      {!user.online && (
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>
          Vu il y a {lastSeenAgo}
        </p>
      )}
    </div>
  )
}

export function PresenceIndicator() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<PresenceEntry[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const prevOnline = useRef<Set<string>>(new Set())

  const ping = useCallback(async () => {
    if (!session?.user?.name) return
    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: session.user.name }),
      })
    } catch {}
  }, [session?.user?.name])

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
    return () => { clearInterval(pingInterval); clearInterval(loadInterval) }
  }, [ping, loadPresence])

  if (users.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {users.map((user, i) => (
        <div
          key={user.id}
          style={{ position: 'relative', marginLeft: i > 0 ? -8 : 0, zIndex: users.length - i }}
          onMouseEnter={() => setHoveredId(user.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
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
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 8, height: 8, borderRadius: '50%',
            background: user.online ? '#0ec98c' : '#6b7280',
            border: '1.5px solid var(--bg-0)',
          }} />
          {hoveredId === user.id && <UserTooltip user={user} />}
        </div>
      ))}
    </div>
  )
}
