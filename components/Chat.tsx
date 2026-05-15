'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { playNotifSound } from '@/lib/sounds'

interface ChatMessage {
  id: string
  author: string
  message: string
  createdAt: string
}

interface PresenceEntry {
  id: string
  username: string
  lastSeen: string
  online: boolean
}

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

const COLORS = ['#7c6af5', '#4f8ef7', '#0ec98c', '#f59e0b', '#f43f5e', '#a855f7']
function authorColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length
  return COLORS[h]
}

export function Chat() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [presence, setPresence] = useState<PresenceEntry[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)
  const isOpen = useRef(false)

  isOpen.current = open

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat')
      if (!res.ok) return
      const data: ChatMessage[] = await res.json()
      if (data.length > prevCount.current) {
        const newCount = data.length - prevCount.current
        if (prevCount.current > 0) {
          // Only notify for messages from others
          const myName = session?.user?.name
          const newMsgs = data.slice(prevCount.current)
          const hasOther = newMsgs.some(m => m.author !== myName)
          if (hasOther) {
            if (!isOpen.current) {
              setUnread(u => u + newCount)
              playNotifSound()
            }
          }
        }
        prevCount.current = data.length
        setMessages(data)
      }
    } catch {}
  }, [session?.user?.name])

  const loadPresence = useCallback(async () => {
    try {
      const res = await fetch('/api/presence')
      if (res.ok) setPresence(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    loadMessages()
    loadPresence()
    const msgInterval = setInterval(loadMessages, 5000)
    const presenceInterval = setInterval(loadPresence, 15000)
    return () => { clearInterval(msgInterval); clearInterval(presenceInterval) }
  }, [loadMessages, loadPresence])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, messages.length])

  const send = async () => {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    setInput('')
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      await loadMessages()
    } catch {}
    setSending(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const otherUsers = presence.filter(u => u.username !== session?.user?.name)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: open ? undefined : 84, right: 16,
          ...(open ? { bottom: 'calc(440px + 16px)' } : {}),
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--accent)', color: 'white',
          border: 'none', cursor: 'pointer', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,106,245,0.4)',
          transition: 'bottom 0.2s ease',
        }}
        title="Messages"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#f43f5e', color: 'white',
            fontSize: 10, fontWeight: 700, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-0)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 16, zIndex: 99,
          width: 320, height: 440,
          background: 'var(--bg-1)', border: '1px solid var(--border-m)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border-s)',
            background: 'var(--bg-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Messages</span>
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Presence */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[...presence].map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: u.online ? '#0ec98c' : 'var(--border-m)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, color: u.online ? 'var(--t0)' : 'var(--t2)' }}>
                    {u.username.split(' ')[0]}
                  </span>
                  {!u.online && (
                    <span style={{ fontSize: 10, color: 'var(--t2)' }}>· {relTime(u.lastSeen)}</span>
                  )}
                </div>
              ))}
              {presence.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>Aucun utilisateur</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-m)' }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize: 12, color: 'var(--t2)' }}>Démarrez la conversation</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.author === session?.user?.name
                const showAuthor = i === 0 || messages[i - 1].author !== msg.author
                const color = authorColor(msg.author)
                return (
                  <div key={msg.id} style={{ marginBottom: 8 }}>
                    {showAuthor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        {!isMe && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: color, color: 'white',
                            fontSize: 8, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
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
                      <div style={{
                        maxWidth: '80%', padding: '7px 11px',
                        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: isMe ? 'var(--accent)' : 'var(--bg-3)',
                        color: isMe ? 'white' : 'var(--t0)',
                        fontSize: 13, lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-s)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Envoyer un message…"
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg-2)',
                border: '1px solid var(--border-m)', borderRadius: 10,
                color: 'var(--t0)', fontSize: 13, padding: '8px 10px',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                maxHeight: 80, overflowY: 'auto',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-m)' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: input.trim() ? 'var(--accent)' : 'var(--bg-3)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() ? 'white' : 'var(--t2)',
                transition: 'background 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
