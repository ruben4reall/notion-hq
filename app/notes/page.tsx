'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUsers, UserAvatar } from '@/components/UserPicker'
import { useCache } from '@/lib/useCache'
import { useLanguage } from '@/context/LanguageContext'

interface Note {
  id: string
  titre: string
  contenu: string
  utilisateur: string
  sharedWith: string[]
  updatedAt: string
}

// ── Discord-style markdown renderer ──────────────────────────────────────────
function renderMarkdown(raw: string): string {
  const slots: string[] = []
  const slot = (html: string) => {
    const k = `\x02${slots.length}\x02`
    slots.push(html)
    return k
  }

  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const badge = lang
      ? `<div style="padding:0 0 4px 2px"><span style="font-size:10px;color:var(--t2);font-weight:600;text-transform:uppercase;letter-spacing:.07em">${lang}</span></div>`
      : ''
    return slot(
      `<div style="margin:10px 0">${badge}<pre style="background:var(--bg-3);padding:10px 14px;border-radius:8px;font-family:'SF Mono','Fira Code',monospace;font-size:12.5px;overflow-x:auto;line-height:1.6;border:1px solid var(--border-s);margin:0"><code style="color:var(--t0)">${code.trim()}</code></pre></div>`
    )
  })

  s = s.replace(/`([^`\n]+)`/g, (_, code) =>
    slot(`<code style="background:var(--bg-3);padding:1px 6px;border-radius:4px;font-size:.88em;font-family:'SF Mono','Fira Code',monospace;color:var(--t0);border:1px solid var(--border-s)">${code}</code>`)
  )

  s = s
    .replace(/^# (.+)$/gm,   (_, t) => slot(`<h1 style="font-size:22px;font-weight:800;margin:18px 0 8px;color:var(--t0);letter-spacing:-.02em;line-height:1.2">${t}</h1>`))
    .replace(/^## (.+)$/gm,  (_, t) => slot(`<h2 style="font-size:17px;font-weight:700;margin:14px 0 6px;color:var(--t0)">${t}</h2>`))
    .replace(/^### (.+)$/gm, (_, t) => slot(`<h3 style="font-size:14px;font-weight:700;margin:12px 0 4px;color:var(--t0)">${t}</h3>`))
    .replace(/^-# (.+)$/gm,  (_, t) => slot(`<span style="font-size:11px;color:var(--t2)">${t}</span>`))

  s = s.replace(/^---$/gm, () => slot('<hr style="border:none;border-top:1px solid var(--border-m);margin:16px 0"/>'))

  s = s.replace(/((?:^> .+\n?)+)/gm, match => {
    const inner = match.replace(/^> ?/gm, '').trim()
    return slot(`<blockquote style="border-left:3px solid var(--accent);margin:8px 0;padding:6px 12px 6px 14px;color:var(--t1);border-radius:0 6px 6px 0;background:rgba(var(--accent-rgb),.06)">${inner}</blockquote>`)
  })

  s = s
    .replace(/^- \[ \] (.+)$/gm, (_, item) =>
      slot(`<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><span style="width:15px;height:15px;border:1.5px solid var(--border-m);border-radius:3px;flex-shrink:0;display:inline-block"></span><span>${item}</span></div>`)
    )
    .replace(/^- \[x\] (.+)$/gm, (_, item) =>
      slot(`<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><span style="width:15px;height:15px;border:1.5px solid var(--accent);border-radius:3px;flex-shrink:0;background:var(--accent);display:inline-flex;align-items:center;justify-content:center"><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg></span><span style="text-decoration:line-through;opacity:.5">${item}</span></div>`)
    )

  s = s.replace(/^\d+\. (.+)$/gm, '<li style="margin:2px 0" data-ol>$1</li>')
  s = s.replace(/^[*\-] (.+)$/gm, '<li style="margin:2px 0">$1</li>')
  s = s.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, match =>
    match.includes('data-ol')
      ? slot(`<ol style="padding-left:20px;margin:6px 0">${match.replace(/ data-ol/g, '')}</ol>`)
      : slot(`<ul style="padding-left:18px;margin:6px 0">${match}</ul>`)
  )

  s = s
    .replace(/\*\*\*(.+?)\*\*\*/g,   '<strong><em>$1</em></strong>')
    .replace(/__\*\*(.+?)\*\*__/g,    '<u><strong>$1</strong></u>')
    .replace(/\*\*(.+?)\*\*/g,        '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g,        '<em>$1</em>')
    .replace(/__([^_\n]+)__/g,        '<u>$1</u>')
    .replace(/_([^_\n]+)_/g,          '<em>$1</em>')
    .replace(/~~(.+?)~~/g,            '<s>$1</s>')
    .replace(/\|\|(.+?)\|\|/g,        (_, c) => slot(
      `<span class="md-spoiler" onclick="this.classList.toggle('md-revealed')" title="Cliquer pour révéler">${c}</span>`
    ))

  s = s.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
    slot(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;text-underline-offset:2px">${label}</a>`)
  )
  s = s.replace(/(https?:\/\/[^\s\x02"<>]+)/g, url =>
    slot(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;text-underline-offset:2px">${url}</a>`)
  )

  s = s
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>')

  return s.replace(/\x02(\d+)\x02/g, (_, i) => slots[+i])
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return 'À l\'instant'
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d / 60)}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const TOOLBAR = [
  { label: 'B',  title: 'Gras (Ctrl+B)',       before: '**',    style: { fontWeight: 800 as const } },
  { label: 'I',  title: 'Italique (Ctrl+I)',    before: '*',     style: { fontStyle: 'italic' as const } },
  { label: 'U',  title: 'Souligner (Ctrl+U)',   before: '__',    style: { textDecoration: 'underline' as const } },
  { label: 'S',  title: 'Barré',                before: '~~',    style: { textDecoration: 'line-through' as const } },
]

const TOOLBAR_ICON = [
  {
    title: 'Code inline',
    before: '`', after: '`',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M12 5l-2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    title: 'Bloc de code',
    before: '```\n', after: '\n```',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M2 9h20" stroke="currentColor" strokeWidth="1.8"/></svg>,
  },
  {
    title: 'Spoiler (||)',
    before: '||', after: '||',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  },
  {
    title: 'Citation (>)',
    before: '> ', after: '',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" stroke="currentColor" strokeWidth="1.8"/></svg>,
  },
]

export default function NotesPage() {
  const { user: session } = useAuth()
  const { t } = useLanguage()
  const users = useUsers()
  const myName = session?.name || ''
  const { data: fetchedNotes } = useCache<Note[]>('/api/notes')
  const [notes, setNotes] = useState<Note[]>(fetchedNotes ?? [])
  const [active, setActive] = useState<Note | null>(null)
  // isEditing=true → sidebar + editor; isEditing=false → full-width view mode
  const [isEditing, setIsEditing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [splitView, setSplitView] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [hoveredNote, setHoveredNote] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveAbort = useRef<AbortController | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement | undefined>(undefined)

  useEffect(() => {
    if (fetchedNotes) setNotes(fetchedNotes)
  }, [fetchedNotes])

  const create = async () => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: t('noTitle'), contenu: '' }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setActive(note)
      setIsEditing(true)
      setPreview(false)
    }
  }

  const save = useCallback(async (note: Note, signal: AbortSignal) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: note.titre, contenu: note.contenu }),
        signal,
      })
      if (!res.ok) throw new Error('save failed')
      setNotes(prev => prev.map(n => n.id === note.id ? { ...note, updatedAt: new Date().toISOString() } : n))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setSaving(false)
      return
    }
    setSaving(false)
  }, [])

  const onChange = (field: 'titre' | 'contenu', value: string) => {
    if (!active) return
    const updated = { ...active, [field]: value }
    setActive(updated)
    clearTimeout(saveTimer.current)
    saveAbort.current?.abort()
    const ctrl = new AbortController()
    saveAbort.current = ctrl
    saveTimer.current = setTimeout(() => save(updated, ctrl.signal), 800)
  }

  const insertFormat = useCallback((before: string, after?: string) => {
    const ta = textareaRef.current
    if (!ta || !active) return
    const end2 = after ?? before
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    const selected = val.slice(start, end)
    const newVal = val.slice(0, start) + before + selected + end2 + val.slice(end)
    onChange('contenu', newVal)
    setTimeout(() => {
      ta.focus()
      if (selected) {
        ta.selectionStart = start + before.length
        ta.selectionEnd = end + before.length
      } else {
        ta.selectionStart = ta.selectionEnd = start + before.length
      }
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const remove = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (active?.id === id) { setActive(null); setIsEditing(false) }
  }

  const toggleShare = async (username: string) => {
    if (!active || active.utilisateur !== myName) return
    const current = active.sharedWith || []
    const next = current.includes(username)
      ? current.filter(u => u !== username)
      : [...current, username]
    const updated = { ...active, sharedWith: next }
    setActive(updated)
    setNotes(prev => prev.map(n => n.id === active.id ? updated : n))
    await fetch(`/api/notes/${active.id}/share`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: next }),
    })
  }

  const selectNote = (note: Note) => {
    setActive(note)
    setIsEditing(false)
    setPreview(false)
    setShowSharePicker(false)
  }

  const filtered = notes.filter(n =>
    n.titre.toLowerCase().includes(search.toLowerCase()) ||
    n.contenu.toLowerCase().includes(search.toLowerCase())
  )

  const btnStyle: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 5, border: 'none',
    background: 'transparent', color: 'var(--t1)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontFamily: 'inherit', transition: 'background .12s',
    flexShrink: 0,
  }

  // ── Sidebar (note list) — hidden in view mode on desktop ──────────────────
  const sidebar = (
    <div style={{
      width: active && isEditing ? 260 : active && !isEditing ? 0 : '100%',
      maxWidth: active && isEditing ? 320 : 'none',
      borderRight: active && isEditing ? '1px solid var(--border-s)' : 'none',
      background: 'var(--bg-1)',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 0.28s ease',
    }} className={active && !isEditing ? 'hidden' : 'hidden lg:flex lg:flex-col'}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-s)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t0)' }}>{t('notes')}</h1>
          <button
            onClick={create}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search')}
          style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--t0)', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>{search ? t('noResults') : t('noNotes')}</p>
            {!search && <button onClick={create} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>{t('createNote')}</button>}
          </div>
        ) : filtered.map(note => (
          <div
            key={note.id}
            onClick={() => selectNote(note)}
            onMouseEnter={() => setHoveredNote(note.id)}
            onMouseLeave={() => setHoveredNote(null)}
            style={{
              padding: '12px 16px', cursor: 'pointer',
              background: active?.id === note.id ? 'var(--accent-bg)' : hoveredNote === note.id ? 'var(--bg-2)' : 'none',
              borderBottom: '1px solid var(--border-s)', transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <p style={{ fontSize: 13, fontWeight: active?.id === note.id ? 600 : 500, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {note.titre || t('noTitle')}
              </p>
              {note.utilisateur === myName && hoveredNote === note.id ? (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => { e.stopPropagation(); selectNote(note); setTimeout(() => setShowSharePicker(true), 50) }}
                    title={t('share')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.sharedWith.length > 0 ? 'var(--accent)' : 'var(--t2)', padding: '3px 4px', borderRadius: 4, display: 'flex' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); remove(note.id) }}
                    title={t('delete')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '3px 4px', borderRadius: 4, display: 'flex' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--t2)', flexShrink: 0 }}>{relTime(note.updatedAt)}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 11, color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.contenu.replace(/[#*`_~\[\]()]/g, '').slice(0, 50) || 'Vide'}
              </p>
              {note.utilisateur !== myName && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('sharedBadge')}</span>
              )}
              {note.utilisateur === myName && note.sharedWith.length > 0 && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--t2)', fontWeight: 600, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {note.sharedWith.length}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div data-tour="notes-workspace" style={{ height: 'calc(100dvh - 56px)', display: 'flex', overflow: 'hidden' }}>

      {/* Desktop sidebar */}
      {sidebar}

      {/* ── Mobile header ── */}
      <div className="lg:hidden" style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-1)', borderBottom: '1px solid var(--border-s)' }}>
        {active && (
          <button onClick={() => { setActive(null); setIsEditing(false) }} style={{ background: 'none', border: 'none', color: 'var(--t1)', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', flex: 1 }}>{active ? (active.titre || t('noTitle')) : t('notes')}</span>
        <button onClick={create} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* ── VIEW MODE: full-width read-only preview (desktop) ── */}
      {active && !isEditing && (
        <div className="hidden lg:flex lg:flex-col" style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-0)' }}>
          {/* View mode title bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-1)', flexShrink: 0 }}>
            <button
              onClick={() => setActive(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 13, padding: '4px 0', fontFamily: 'inherit', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('notes')}
            </button>
            <span style={{ color: 'var(--border-m)', flexShrink: 0 }}>/</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.titre || t('noTitle')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {active.utilisateur !== myName && (
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-3)', color: 'var(--t2)', border: '1px solid var(--border-s)' }}>
                  {t('sharedBy')} {active.utilisateur.split(' ')[0]}
                </span>
              )}
              <button
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border-m)', background: 'var(--bg-2)', color: 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('edit')}
              </button>
            </div>
          </div>

          {/* Full-width markdown content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--t0)', marginBottom: 24, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {active.titre || t('noTitle')}
              </h1>
              {active.contenu ? (
                <div
                  style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--t0)' }}
                  dangerouslySetInnerHTML={{ __html: `<p style="margin:8px 0">${renderMarkdown(active.contenu)}</p>` }}
                />
              ) : (
                <p style={{ color: 'var(--t2)', fontSize: 14, fontStyle: 'italic' }}>—</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODE ── */}
      {active && isEditing && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', minWidth: 0 }}>

          {/* Title bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-1)', flexShrink: 0 }}>
            <input
              value={active.titre}
              onChange={e => onChange('titre', e.target.value)}
              placeholder="Titre"
              style={{ flex: 1, background: 'none', border: 'none', fontSize: 17, fontWeight: 700, color: 'var(--t0)', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative' }}>
              {saving && <span style={{ fontSize: 11, color: 'var(--t2)' }}>{t('saving')}</span>}

              {active.utilisateur === myName && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSharePicker(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-m)', background: active.sharedWith.length > 0 ? 'var(--accent-bg)' : 'var(--bg-2)', color: active.sharedWith.length > 0 ? 'var(--accent)' : 'var(--t1)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {active.sharedWith.length > 0 ? t('shareCount', { n: active.sharedWith.length }) : t('share')}
                  </button>
                  {showSharePicker && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowSharePicker(false)} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 10, padding: 8, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'slideDown 0.18s var(--ease-spring) both' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>{t('projectMembers')}</p>
                        {users.filter(u => u.name !== myName).length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--t2)', padding: 8, textAlign: 'center' }}>{t('inviteMembers')}</p>
                        ) : users.filter(u => u.name !== myName).map(u => {
                          const shared = active.sharedWith.includes(u.name)
                          return (
                            <button key={u.name} onClick={() => toggleShare(u.name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 7, background: shared ? 'var(--accent-bg)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
                              <UserAvatar name={u.name} color={u.color} size={26} />
                              <span style={{ fontSize: 13, color: 'var(--t0)', fontWeight: 500, flex: 1 }}>{u.name.split(' ')[0]}</span>
                              {shared
                                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <span style={{ fontSize: 10, color: 'var(--t2)' }}>{t('add')}</span>
                              }
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {active.utilisateur !== myName && (
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-3)', color: 'var(--t2)', border: '1px solid var(--border-s)' }}>
                  {t('sharedBy')} {active.utilisateur.split(' ')[0]}
                </span>
              )}

              {/* View mode button */}
              <button
                onClick={() => setIsEditing(false)}
                className="hidden lg:flex"
                title={t('previewMode')}
                style={{ ...btnStyle, alignItems: 'center', gap: 4, padding: '0 8px', width: 'auto', color: 'var(--t2)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              </button>

              {/* Split view toggle */}
              <div className="hidden lg:flex" style={{ gap: 4, alignItems: 'center' }}>
                <button
                  onClick={() => setSplitView(v => !v)}
                  title={splitView ? t('editorOnly') : t('splitViewLabel')}
                  style={{ ...btnStyle, color: splitView ? 'var(--accent)' : 'var(--t2)', background: splitView ? 'var(--accent-bg)' : 'transparent' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8"/></svg>
                </button>
              </div>

              {/* Mobile preview toggle */}
              <button
                onClick={() => setPreview(v => !v)}
                className="lg:hidden"
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-m)', background: preview ? 'var(--accent-bg)' : 'var(--bg-2)', color: preview ? 'var(--accent)' : 'var(--t1)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {preview ? t('editMode') : t('previewMode')}
              </button>

              {active.utilisateur === myName && (
                <button
                  onClick={() => remove(active.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                  title={t('delete')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Formatting toolbar */}
          <div className="hidden lg:flex" style={{ padding: '5px 20px', borderBottom: '1px solid var(--border-s)', alignItems: 'center', gap: 2, background: 'var(--bg-1)', flexShrink: 0, flexWrap: 'wrap' }}>
            {TOOLBAR.map(btn => (
              <button
                key={btn.label}
                onMouseDown={e => { e.preventDefault(); insertFormat(btn.before) }}
                title={btn.title}
                style={{ ...btnStyle, ...btn.style }}
              >
                {btn.label}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border-m)', margin: '0 3px', flexShrink: 0 }} />
            {TOOLBAR_ICON.map(btn => (
              <button
                key={btn.title}
                onMouseDown={e => { e.preventDefault(); insertFormat(btn.before, btn.after) }}
                title={btn.title}
                style={btnStyle}
              >
                {btn.icon}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border-m)', margin: '0 3px', flexShrink: 0 }} />
            <button onMouseDown={e => { e.preventDefault(); insertFormat('1. ', '') }} title="Liste numérotée" style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 6h1v4M4 10h2M4 14h1.5a.5.5 0 010 1H4a.5.5 0 000 1h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
            <button onMouseDown={e => { e.preventDefault(); insertFormat('- ', '') }} title="Liste à puces" style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="9" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
            </button>
            <button onMouseDown={e => { e.preventDefault(); insertFormat('- [ ] ', '') }} title="Case à cocher" style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
              **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| `code`
            </div>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            <textarea
              ref={el => { textareaRef.current = el ?? undefined }}
              value={active.contenu}
              onChange={e => onChange('contenu', e.target.value)}
              onKeyDown={e => {
                if (e.metaKey || e.ctrlKey) {
                  if (e.key === 'b') { e.preventDefault(); insertFormat('**') }
                  if (e.key === 'i') { e.preventDefault(); insertFormat('*') }
                  if (e.key === 'u') { e.preventDefault(); insertFormat('__') }
                }
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const ta = e.currentTarget
                  const start = ta.selectionStart
                  const end = ta.selectionEnd
                  const val = ta.value
                  const newVal = val.slice(0, start) + '  ' + val.slice(end)
                  onChange('contenu', newVal)
                  setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
                }
              }}
              placeholder={'Commence à écrire…\n\n# Titre 1\n## Titre 2  ### Titre 3  -# Subtext\n**Gras**  *Italique*  __Souligné__  ~~Barré~~\n||spoiler||  `code inline`\n> Citation\n- Liste  1. Numérotée  - [ ] Checkbox\n```js\ncode block\n```'}
              style={{
                flex: preview ? 0 : (splitView ? 1 : 1),
                display: preview ? 'none' : 'block',
                resize: 'none', background: 'var(--bg-0)', border: 'none',
                padding: '24px 32px', fontSize: 14, lineHeight: 1.8, color: 'var(--t0)',
                outline: 'none', fontFamily: '"SF Mono", "Fira Code", monospace',
                borderRight: splitView ? '1px solid var(--border-s)' : 'none',
              }}
              className={preview ? 'lg:block' : ''}
            />

            {(splitView || preview) && (
              <div
                style={{
                  flex: 1, overflowY: 'auto', padding: '24px 32px',
                  fontSize: 14, lineHeight: 1.7, color: 'var(--t0)',
                  display: preview && !splitView ? 'block' : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: `<p style="margin:8px 0">${renderMarkdown(active.contenu)}</p>` }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Empty state (no note selected) — desktop ── */}
      {!active && (
        <div style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }} className="hidden lg:flex">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-l)' }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>{t('selectNote')}</p>
          <button onClick={create} className="btn btn-primary" style={{ fontSize: 13 }}>{t('newNote')}</button>
        </div>
      )}

      {/* ── Mobile: note content (edit mode on mobile) ── */}
      {active && (
        <div className="lg:hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: 56 }}>
          {preview ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', fontSize: 14, lineHeight: 1.7, color: 'var(--t0)' }}
              dangerouslySetInnerHTML={{ __html: `<p style="margin:8px 0">${renderMarkdown(active.contenu)}</p>` }}
            />
          ) : (
            <textarea
              value={active.contenu}
              onChange={e => onChange('contenu', e.target.value)}
              placeholder="Commence à écrire…"
              style={{ flex: 1, resize: 'none', background: 'var(--bg-0)', border: 'none', padding: '20px 16px', fontSize: 14, lineHeight: 1.8, color: 'var(--t0)', outline: 'none', fontFamily: 'inherit' }}
            />
          )}
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-s)', display: 'flex', gap: 8, background: 'var(--bg-1)' }}>
            <button onClick={() => setPreview(v => !v)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border-m)', background: preview ? 'var(--accent-bg)' : 'var(--bg-2)', color: preview ? 'var(--accent)' : 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {preview ? t('editMode') : t('previewMode')}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile: note list ── */}
      {!active && (
        <div className="lg:hidden" style={{ flex: 1, overflowY: 'auto', marginTop: 56 }}>
          <div style={{ padding: '12px 16px 8px' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border-s)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--t0)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>{t('noNotes')}</p>
              <button onClick={create} className="btn btn-primary">{t('createNote')}</button>
            </div>
          ) : filtered.map(note => (
            <button
              key={note.id}
              onClick={() => { setActive(note); setIsEditing(true); setPreview(false) }}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border-s)', padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', flex: 1 }}>{note.titre || t('noTitle')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {(note.utilisateur !== myName || note.sharedWith.length > 0) && (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: note.utilisateur !== myName ? 'var(--accent-bg)' : 'var(--bg-3)', color: note.utilisateur !== myName ? 'var(--accent)' : 'var(--t2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('sharedBadge')}</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--t2)' }}>{relTime(note.updatedAt)}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {note.contenu.replace(/[#*`_~\[\]()]/g, '').slice(0, 80) || '—'}
              </p>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .md-spoiler { background:var(--bg-3); color:transparent; border-radius:3px; padding:0 3px; cursor:pointer; user-select:none; transition:color .15s; }
        .md-spoiler.md-revealed { color:var(--t0); }
      `}</style>
    </div>
  )
}
