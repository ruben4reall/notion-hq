'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Notification } from '@/lib/notion'

const TYPE_COLOR: Record<string, string> = {
  info:    '#4f8ef7',
  success: '#0ec98c',
  warning: '#f59e0b',
  error:   '#f43f5e',
}
const TYPE_BG: Record<string, string> = {
  info:    'rgba(79,142,247,0.1)',
  success: 'rgba(14,201,140,0.1)',
  warning: 'rgba(245,158,11,0.1)',
  error:   'rgba(244,63,94,0.1)',
}

function relTime(iso: string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d/60)}h`
  return `il y a ${Math.floor(d/1440)}j`
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifs(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.lu).length

  const markAllRead = async () => {
    const unreadIds = notifs.filter(n => !n.lu).map(n => n.id)
    if (!unreadIds.length) return
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(v => !v); if (!open && unread > 0) markAllRead() }}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--bg-2)', border: '1px solid var(--border-s)',
          color: 'var(--t1)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 16, height: 16, borderRadius: '50%',
            background: '#f43f5e', color: 'white',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-0)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          width: 320, background: 'var(--bg-1)',
          border: '1px solid var(--border-m)', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-s)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Notifications</span>
            {notifs.some(n => !n.lu) && (
              <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Tout lire
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
                Aucune notification
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border-s)',
                  background: n.lu ? 'transparent' : `${TYPE_BG[n.type]}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: n.lu ? 'var(--border-m)' : TYPE_COLOR[n.type],
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: n.lu ? 'var(--t1)' : 'var(--t0)', lineHeight: 1.5 }}>{n.message}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                      {n.de && <span style={{ fontSize: 10, color: 'var(--t2)' }}>{n.de}</span>}
                      <span style={{ fontSize: 10, color: 'var(--t2)' }}>{relTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
