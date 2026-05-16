'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/lib/db'
import { playNotifSound } from '@/lib/sounds'
import { useLanguage } from '@/context/LanguageContext'

function getNotifLink(n: Notification): string | null {
  const m = n.message.toLowerCase()
  if (m.includes('💬') || m.includes('message')) return '/?chat=1'
  if (m.includes('tâche') || m.includes('assigné')) return '/kanban'
  if (m.includes('prospect') || m.includes('client signé')) return '/crm'
  if (m.includes('idée')) return '/ideas'
  if (m.includes('invitation') || m.includes('rejoint')) return '/org'
  if (m.includes('note')) return '/notes'
  if (m.includes('calendrier') || m.includes('événement')) return '/calendar'
  return null
}

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

function relTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return t('justNow')
  if (d < 60) return t('minutesAgo', { n: d })
  if (d < 1440) return t('hoursAgo', { n: Math.floor(d/60) })
  return t('daysAgo', { n: Math.floor(d/1440) })
}

export function NotificationBell() {
  const router = useRouter()
  const { t } = useLanguage()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const prevUnread = useRef(0)

  const load = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data: Notification[] = await res.json()
      const newUnread = data.filter(n => !n.lu).length
      if (newUnread > prevUnread.current) playNotifSound()
      prevUnread.current = newUnread
      setNotifs(data)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
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

  const deleteNotifs = async (ids: string[]) => {
    if (!ids.length) return
    setNotifs(prev => prev.filter(n => !ids.includes(n.id)))
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const newNotifs = notifs.filter(n => !n.lu || new Date(n.createdAt).getTime() > cutoff)
  const oldNotifs = notifs.filter(n => n.lu && new Date(n.createdAt).getTime() <= cutoff)

  const NotifRow = ({ n }: { n: Notification }) => {
    const link = getNotifLink(n)
    return (
      <div
        onClick={() => { if (link) { setOpen(false); router.push(link) } }}
        style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border-s)',
          background: n.lu ? 'transparent' : `${TYPE_BG[n.type]}`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
          cursor: link ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (link) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.lu ? 'transparent' : `${TYPE_BG[n.type]}` }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: n.lu ? 'var(--border-m)' : TYPE_COLOR[n.type],
          flexShrink: 0, marginTop: 5,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: n.lu ? 'var(--t1)' : 'var(--t0)', lineHeight: 1.5 }}>{n.message}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
            {n.de && <span style={{ fontSize: 10, color: 'var(--t2)' }}>{n.de}</span>}
            <span style={{ fontSize: 10, color: 'var(--t2)' }}>{relTime(n.createdAt, t)}</span>
            {link && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>{t('seeArrow')}</span>}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); deleteNotifs([n.id]) }}
          style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: '0 2px', fontSize: 14, lineHeight: 1, flexShrink: 0, opacity: 0.5 }}
          title={t('delete')}
        >×</button>
      </div>
    )
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
        <div className="dropdown-enter" style={{
          position: 'fixed', top: 58, right: 12, zIndex: 200,
          width: 'min(320px, calc(100vw - 24px))', background: 'var(--bg-1)',
          border: '1px solid var(--border-m)', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-s)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{t('notifications')}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {notifs.some(n => !n.lu) && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {t('markAllRead')}
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={() => deleteNotifs(notifs.map(n => n.id))} style={{ fontSize: 11, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t('clearAll')}
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
                {t('noNotifications')}
              </div>
            ) : (
              <>
                {newNotifs.length > 0 && (
                  <>
                    <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      {t('newNotifs')}
                    </div>
                    {newNotifs.map(n => <NotifRow key={n.id} n={n} />)}
                  </>
                )}

                {oldNotifs.length > 0 && (
                  <>
                    <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{t('oldNotifs')}</span>
                      <button onClick={() => deleteNotifs(oldNotifs.map(n => n.id))} style={{ fontSize: 10, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                        {t('cleanOld')}
                      </button>
                    </div>
                    {oldNotifs.map(n => <NotifRow key={n.id} n={n} />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
