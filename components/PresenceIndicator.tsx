'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  online: boolean
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function PresenceIndicator() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<PresenceEntry[]>([])

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
    try {
      const res = await fetch('/api/presence')
      if (res.ok) setUsers(await res.json())
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
    <div style={{ display: 'flex', alignItems: 'center', gap: -4 }}>
      {users.map((user, i) => (
        <div
          key={user.id}
          title={`${user.username} — ${user.online ? 'En ligne' : 'Hors ligne'}`}
          style={{
            position: 'relative',
            marginLeft: i > 0 ? -8 : 0,
            zIndex: users.length - i,
          }}
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
        </div>
      ))}
    </div>
  )
}
