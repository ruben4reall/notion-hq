'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { playNotifSound } from '@/lib/sounds'
import { useUsers } from './UserPicker'

interface ChatMessage {
  id: string
  author: string
  message: string
  destinataire: string
  createdAt: string
}

interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  connectedAt: string
  online: boolean
}

interface Gif {
  id: string
  url: string
  preview: string
  title: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d / 60)}h`
  return `il y a ${Math.floor(d / 1440)}j`
}

const ACCENT_COLORS = ['#7c6af5', '#4f8ef7', '#0ec98c', '#f59e0b', '#a855f7', '#f43f5e']
function authorColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % ACCENT_COLORS.length
  return ACCENT_COLORS[h]
}

function convKey(type: 'group' | 'dm', withUser?: string) {
  return type === 'group' ? '__group__' : `dm::${withUser}`
}

// ── GIF Picker ───────────────────────────────────────────────────────────────

function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [loading, setLoading] = useState(true)
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  const fetchGifs = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gifs${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      setGifs(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchGifs('') }, [fetchGifs])

  const onSearch = (v: string) => {
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetchGifs(v), 400)
  }

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
      background: 'var(--bg-1)', border: '1px solid var(--border-m)',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.4)', zIndex: 10,
    }}>
      {/* Search */}
      <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-s)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--t2)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          autoFocus
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Chercher un GIF…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--t0)', fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div style={{ maxHeight: 200, overflowY: 'auto', padding: 6 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 6 }} />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--t2)', fontSize: 12, padding: 16 }}>Aucun résultat</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                style={{
                  padding: 0, border: 'none', cursor: 'pointer', borderRadius: 6,
                  overflow: 'hidden', background: 'var(--bg-3)', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={gif.title}
              >
                <img src={gif.url} alt={gif.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {!loading && (
          <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--t2)', marginTop: 6 }}>Powered by Tenor</p>
        )}
      </div>
    </div>
  )
}

// ── Conversation List ─────────────────────────────────────────────────────────

function ConvList({
  myName, presence, allMessages, lastRead, onSelect,
}: {
  myName: string
  presence: PresenceEntry[]
  allMessages: ChatMessage[]
  lastRead: React.MutableRefObject<Record<string, number>>
  onSelect: (type: 'group' | 'dm', withUser?: string) => void
}) {
  const appUsers = useUsers()
  const groupMsgs = allMessages.filter(m => !m.destinataire)
  const lastGroup = groupMsgs[groupMsgs.length - 1]
  const groupUnread = groupMsgs.filter(m =>
    m.author !== myName && new Date(m.createdAt).getTime() > (lastRead.current[convKey('group')] || 0)
  ).length

  // Merge app users (source of truth) with presence data for online status
  const others = appUsers
    .filter(u => u.name !== myName)
    .map(u => {
      const p = presence.find(pr => pr.username === u.name)
      return {
        id: u.name,
        username: u.name,
        color: u.color,
        lastSeen: p?.lastSeen || '',
        connectedAt: p?.connectedAt || '',
        online: p?.online || false,
      }
    })

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* General */}
      <button
        onClick={() => onSelect('group')}
        style={{
          width: '100%', padding: '12px 16px', background: 'none', border: 'none',
          borderBottom: '1px solid var(--border-s)', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'var(--accent-bg)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>Général</span>
            {groupUnread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent)',
                color: 'white', fontSize: 10, fontWeight: 700, padding: '0 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{groupUnread}</span>
            )}
          </div>
          {lastGroup && (
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastGroup.message.startsWith('gif::') ? '🖼 GIF' : `${lastGroup.author.split(' ')[0]}: ${lastGroup.message}`}
            </p>
          )}
        </div>
      </button>

      {/* DMs */}
      {others.map(user => {
        const dmMsgs = allMessages.filter(m =>
          (m.author === myName && m.destinataire === user.username) ||
          (m.author === user.username && m.destinataire === myName)
        )
        const last = dmMsgs[dmMsgs.length - 1]
        const key = convKey('dm', user.username)
        const dmUnread = dmMsgs.filter(m =>
          m.author !== myName && new Date(m.createdAt).getTime() > (lastRead.current[key] || 0)
        ).length

        return (
          <button
            key={user.id}
            onClick={() => onSelect('dm', user.username)}
            style={{
              width: '100%', padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: '1px solid var(--border-s)', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: user.color || authorColor(user.username), color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {initials(user.username)}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 10, height: 10, borderRadius: '50%',
                background: user.online ? '#0ec98c' : '#6b7280',
                border: '2px solid var(--bg-1)',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>
                  {user.username.split(' ')[0]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {last && <span style={{ fontSize: 10, color: 'var(--t2)' }}>{relTime(last.createdAt)}</span>}
                  {dmUnread > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9, background: 'var(--accent)',
                      color: 'white', fontSize: 10, fontWeight: 700, padding: '0 4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{dmUnread}</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 11, color: user.online ? 'var(--green)' : 'var(--t2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.online ? 'En ligne' : last
                  ? (last.message.startsWith('gif::') ? '🖼 GIF' : last.message)
                  : `Hors ligne · ${relTime(user.lastSeen)}`}
              </p>
            </div>
          </button>
        )
      })}

      {others.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--t2)' }}>Aucun autre utilisateur</p>
        </div>
      )}
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function Bubble({ msg, isMe, showMeta }: { msg: ChatMessage; isMe: boolean; showMeta: boolean }) {
  const isGif = msg.message.startsWith('gif::')
  const gifUrl = isGif ? msg.message.slice(5) : null
  const color = authorColor(msg.author)

  return (
    <div style={{ marginBottom: 6 }}>
      {showMeta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {!isMe && (
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: color,
              color: 'white', fontSize: 7, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {initials(msg.author)}
            </div>
          )}
          <span style={{ fontSize: 10, color: 'var(--t2)' }}>
            {isMe ? 'Vous' : msg.author.split(' ')[0]} · {relTime(msg.createdAt)}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
        {isGif ? (
          <img
            src={gifUrl!}
            alt="GIF"
            style={{
              maxWidth: '75%', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              display: 'block', cursor: 'pointer',
            }}
            onClick={() => window.open(gifUrl!, '_blank')}
            loading="lazy"
          />
        ) : (
          <div style={{
            maxWidth: '80%', padding: '7px 11px',
            borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            background: isMe ? 'var(--accent)' : 'var(--bg-3)',
            color: isMe ? 'white' : 'var(--t0)',
            fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
          }}>
            {msg.message}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Chat Component ───────────────────────────────────────────────────────

export function Chat() {
  const { user: session, status } = useAuth()
  const myName = session?.name || ''

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [activeConv, setActiveConv] = useState<{ type: 'group' | 'dm'; with?: string } | null>(null)

  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [presence, setPresence] = useState<PresenceEntry[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)
  const lastRead = useRef<Record<string, number>>(
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('chat_lastRead') || '{}')
      : {}
  )
  const isOpen = useRef(false)
  isOpen.current = open

  const loadMessages = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await fetch('/api/chat')
      if (!res.ok) return
      const data: ChatMessage[] = await res.json()

      if (data.length > prevCount.current && prevCount.current > 0) {
        const newMsgs = data.slice(prevCount.current)
        const hasOther = newMsgs.some(m => m.author !== myName)
        if (hasOther && !isOpen.current) {
          playNotifSound()
          setTotalUnread(u => u + newMsgs.filter(m => m.author !== myName).length)
        }
      }
      prevCount.current = data.length
      setAllMessages(data)
    } catch {}
  }, [myName])

  const loadPresence = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await fetch('/api/presence')
      if (res.ok) setPresence(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    loadMessages()
    loadPresence()
    const m = setInterval(loadMessages, 5000)
    const p = setInterval(loadPresence, 15000)
    return () => { clearInterval(m); clearInterval(p) }
  }, [loadMessages, loadPresence])

  useEffect(() => {
    if (open) {
      setTotalUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [open, view, allMessages.length])

  const openConv = (type: 'group' | 'dm', withUser?: string) => {
    const key = convKey(type, withUser)
    lastRead.current[key] = Date.now()
    localStorage.setItem('chat_lastRead', JSON.stringify(lastRead.current))
    setActiveConv({ type, with: withUser })
    setView('chat')
  }

  const send = async (msgOverride?: string) => {
    const msg = (msgOverride ?? input).trim()
    if (!msg || sending) return
    setSending(true)
    if (!msgOverride) setInput('')
    setShowGif(false)

    // Optimistic update — show message immediately
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      author: myName,
      message: msg,
      destinataire: activeConv?.type === 'dm' ? (activeConv.with || '') : '',
      createdAt: new Date().toISOString(),
    }
    setAllMessages(prev => [...prev, optimistic])
    prevCount.current += 1
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, destinataire: activeConv?.type === 'dm' ? activeConv.with : '' }),
      })
      await loadMessages()
    } catch {
      setAllMessages(prev => prev.filter(m => m.id !== optimisticId))
      prevCount.current -= 1
    }
    setSending(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const currentMessages = activeConv
    ? activeConv.type === 'group'
      ? allMessages.filter(m => !m.destinataire)
      : allMessages.filter(m =>
          (m.author === myName && m.destinataire === activeConv.with) ||
          (m.author === activeConv.with && m.destinataire === myName)
        )
    : []

  const activeUser = activeConv?.type === 'dm'
    ? presence.find(u => u.username === activeConv.with)
    : null

  if (status === 'unauthenticated' || !myName) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) setView('list') }}
        aria-label="Messages"
        style={{
          position: 'fixed', bottom: 92, right: 16, zIndex: 100,
          width: 50, height: 50, borderRadius: '50%',
          background: 'var(--accent)', color: 'white',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(124,106,245,0.45)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        }
        {!open && totalUnread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#f43f5e', color: 'white',
            fontSize: 10, fontWeight: 700, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-0)',
          }}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="float-enter" style={{
          position: 'fixed', bottom: 152, right: 16, zIndex: 99,
          width: 340, height: 460,
          background: 'var(--bg-1)', border: '1px solid var(--border-m)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border-s)',
            background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            {view === 'chat' && (
              <button
                onClick={() => { setView('list'); setActiveConv(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t1)', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {view === 'list' ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', flex: 1 }}>Messages</span>
            ) : activeConv?.type === 'group' ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', lineHeight: 1 }}>Général</p>
                  <p style={{ fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{presence.filter(u => u.online).length} en ligne</p>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: authorColor(activeConv?.with || ''), color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {initials(activeConv?.with || '')}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 8, height: 8, borderRadius: '50%',
                    background: activeUser?.online ? '#0ec98c' : '#6b7280',
                    border: '1.5px solid var(--bg-2)',
                  }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', lineHeight: 1 }}>
                    {activeConv?.with?.split(' ')[0]}
                  </p>
                  <p style={{ fontSize: 10, color: activeUser?.online ? 'var(--green)' : 'var(--t2)', marginTop: 1 }}>
                    {activeUser?.online ? 'En ligne' : activeUser ? `Vu ${relTime(activeUser.lastSeen)}` : 'Hors ligne'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          {view === 'list' ? (
            <ConvList
              myName={myName}
              presence={presence}
              allMessages={allMessages}
              lastRead={lastRead}
              onSelect={openConv}
            />
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 4px' }}>
                {currentMessages.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-m)' }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p style={{ fontSize: 12, color: 'var(--t2)' }}>
                      {activeConv?.type === 'dm' ? `Envoyer un message à ${activeConv.with?.split(' ')[0]}` : 'Démarrez la conversation'}
                    </p>
                  </div>
                ) : (
                  currentMessages.map((msg, i) => {
                    const isMe = msg.author === myName
                    const showMeta = i === 0 || currentMessages[i - 1].author !== msg.author
                    const isRecent = Date.now() - new Date(msg.createdAt).getTime() < 3000
                    return (
                      <div key={msg.id} className={isRecent ? 'bubble-enter' : undefined}>
                        <Bubble msg={msg} isMe={isMe} showMeta={showMeta} />
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border-s)', position: 'relative', flexShrink: 0 }}>
                {showGif && (
                  <GifPicker
                    onSelect={(url) => send(`gif::${url}`)}
                    onClose={() => setShowGif(false)}
                  />
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  {/* GIF button */}
                  <button
                    onClick={() => setShowGif(v => !v)}
                    title="GIF"
                    style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: showGif ? 'var(--accent-bg)' : 'var(--bg-3)',
                      border: `1px solid ${showGif ? 'var(--accent)' : 'var(--border-s)'}`,
                      color: showGif ? 'var(--accent)' : 'var(--t2)',
                      cursor: 'pointer', fontSize: 10, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    GIF
                  </button>

                  {/* Text input */}
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Aa"
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', background: 'var(--bg-2)',
                      border: '1px solid var(--border-m)', borderRadius: 10,
                      color: 'var(--t0)', fontSize: 13, padding: '7px 10px',
                      outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                      maxHeight: 72, overflowY: 'auto',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
                  />

                  {/* Send button */}
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || sending}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: input.trim() ? 'var(--accent)' : 'var(--bg-3)',
                      border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: input.trim() ? 'white' : 'var(--t2)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
