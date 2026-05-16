'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUsers, UserAvatar } from '@/components/UserPicker'
import { useCache } from '@/lib/useCache'

interface Note {
  id: string
  titre: string
  contenu: string
  utilisateur: string
  sharedWith: string[]
  updatedAt: string
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;margin:14px 0 4px;color:var(--t0)">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:17px;font-weight:700;margin:16px 0 6px;color:var(--t0)">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:21px;font-weight:800;margin:18px 0 8px;color:var(--t0);letter-spacing:-0.02em">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-3);padding:1px 5px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/^```[\w]*\n?([\s\S]*?)```/gm, '<pre style="background:var(--bg-3);padding:12px;border-radius:8px;font-family:monospace;font-size:12px;overflow:auto;margin:10px 0"><code>$1</code></pre>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><input type="checkbox" disabled/><span>$1</span></div>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><input type="checkbox" checked disabled/><span style="text-decoration:line-through;opacity:0.6">$1</span></div>')
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;padding-left:4px">$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);margin:8px 0;padding:4px 12px;color:var(--t1);font-style:italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border-m);margin:16px 0"/>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/(<li.*<\/li>)+/g, '<ul style="padding-left:18px;margin:6px 0">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>')
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return 'À l\'instant'
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d / 60)}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotesPage() {
  const { user: session } = useAuth()
  const users = useUsers()
  const myName = session?.name || ''
  const { data: fetchedNotes } = useCache<Note[]>('/api/notes')
  const [notes, setNotes] = useState<Note[]>(fetchedNotes ?? [])
  const [active, setActive] = useState<Note | null>(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [hoveredNote, setHoveredNote] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveAbort = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    if (fetchedNotes) setNotes(fetchedNotes)
  }, [fetchedNotes])

  const create = async () => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Sans titre', contenu: '' }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setActive(note)
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

  const remove = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (active?.id === id) setActive(null)
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

  const filtered = notes.filter(n =>
    n.titre.toLowerCase().includes(search.toLowerCase()) ||
    n.contenu.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ height: 'calc(100dvh - 56px)', display: 'flex', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: active ? 260 : '100%',
        maxWidth: 320,
        borderRight: '1px solid var(--border-s)',
        background: 'var(--bg-1)',
        flexShrink: 0,
        transition: 'width 0.25s ease',
      }} className="hidden lg:flex lg:flex-col">
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-s)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--t0)' }}>Notes</h1>
            <button
              onClick={create}
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border-s)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--t0)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>
                {search ? 'Aucun résultat' : 'Aucune note'}
              </p>
              {!search && (
                <button onClick={create} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                  Créer une note
                </button>
              )}
            </div>
          ) : (
            filtered.map(note => (
              <div
                key={note.id}
                onClick={() => { setActive(note); setPreview(false) }}
                onMouseEnter={() => setHoveredNote(note.id)}
                onMouseLeave={() => setHoveredNote(null)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: active?.id === note.id ? 'var(--accent-bg)' : hoveredNote === note.id ? 'var(--bg-2)' : 'none',
                  borderBottom: '1px solid var(--border-s)', transition: 'background 0.15s',
                }}
              >
                {/* Row 1: title + date or action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <p style={{
                    fontSize: 13, fontWeight: active?.id === note.id ? 600 : 500,
                    color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {note.titre || 'Sans titre'}
                  </p>
                  {note.utilisateur === myName && hoveredNote === note.id ? (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setActive(note); setPreview(false); setTimeout(() => setShowSharePicker(true), 50) }}
                        title="Partager"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.sharedWith.length > 0 ? 'var(--accent)' : 'var(--t2)', padding: '3px 4px', borderRadius: 4, display: 'flex' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); remove(note.id) }}
                        title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '3px 4px', borderRadius: 4, display: 'flex' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--t2)', flexShrink: 0 }}>{relTime(note.updatedAt)}</span>
                  )}
                </div>
                {/* Row 2: excerpt + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.contenu.replace(/[#*`_~\[\]()]/g, '').slice(0, 50) || 'Vide'}
                  </p>
                  {note.utilisateur !== myName && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 700, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Partagée</span>
                  )}
                  {note.utilisateur === myName && note.sharedWith.length > 0 && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--t2)', fontWeight: 600, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {note.sharedWith.length} partage{note.sharedWith.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Mobile header with back + create ── */}
      <div className="lg:hidden" style={{
        position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border-s)',
      }}>
        {active && (
          <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: 'var(--t1)', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', flex: 1 }}>
          {active ? (active.titre || 'Sans titre') : 'Notes'}
        </span>
        <button onClick={create} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* ── Editor ── */}
      {active ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
          {/* Toolbar */}
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid var(--border-s)',
            display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-1)', flexShrink: 0,
          }}>
            <input
              value={active.titre}
              onChange={e => onChange('titre', e.target.value)}
              placeholder="Titre"
              style={{
                flex: 1, background: 'none', border: 'none', fontSize: 17, fontWeight: 700,
                color: 'var(--t0)', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative' }}>
              {saving && <span style={{ fontSize: 11, color: 'var(--t2)' }}>Enregistrement…</span>}

              {/* Share button — only for note owner */}
              {active.utilisateur === myName && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSharePicker(v => !v)}
                    title="Partager"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid var(--border-m)',
                      background: active.sharedWith.length > 0 ? 'var(--accent-bg)' : 'var(--bg-2)',
                      color: active.sharedWith.length > 0 ? 'var(--accent)' : 'var(--t1)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {active.sharedWith.length > 0 ? `Partagé (${active.sharedWith.length})` : 'Partager'}
                  </button>

                  {showSharePicker && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowSharePicker(false)} />
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                        background: 'var(--bg-2)', border: '1px solid var(--border-m)',
                        borderRadius: 10, padding: 8, minWidth: 200,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        animation: 'slideDown 0.18s var(--ease-spring) both',
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>
                          Membres du projet
                        </p>
                        {users.filter(u => u.name !== myName).length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--t2)', padding: '8px', textAlign: 'center' }}>
                            Invitez des membres dans votre projet pour partager des notes.
                          </p>
                        ) : users.filter(u => u.name !== myName).map(u => {
                          const shared = active.sharedWith.includes(u.name)
                          return (
                            <button
                              key={u.name}
                              onClick={() => toggleShare(u.name)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 8px', borderRadius: 7,
                                background: shared ? 'var(--accent-bg)' : 'transparent',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s',
                              }}
                            >
                              <UserAvatar name={u.name} color={u.color} size={26} />
                              <span style={{ fontSize: 13, color: 'var(--t0)', fontWeight: 500, flex: 1 }}>
                                {u.name.split(' ')[0]}
                              </span>
                              {shared ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6L9 17l-5-5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--t2)' }}>Ajouter</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Shared-with-me badge (read-only) */}
              {active.utilisateur !== myName && (
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  background: 'var(--bg-3)', color: 'var(--t2)',
                  border: '1px solid var(--border-s)',
                }}>
                  Partagée par {active.utilisateur.split(' ')[0]}
                </span>
              )}

              <button
                onClick={() => setPreview(v => !v)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-m)',
                  background: preview ? 'var(--accent-bg)' : 'var(--bg-2)',
                  color: preview ? 'var(--accent)' : 'var(--t1)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {preview ? 'Éditer' : 'Aperçu'}
              </button>
              {active.utilisateur === myName && (
                <button
                  onClick={() => remove(active.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                  title="Supprimer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {preview ? (
            <div
              style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', fontSize: 14, lineHeight: 1.7, color: 'var(--t0)' }}
              dangerouslySetInnerHTML={{ __html: `<p style="margin:8px 0">${renderMarkdown(active.contenu)}</p>` }}
            />
          ) : (
            <textarea
              value={active.contenu}
              onChange={e => onChange('contenu', e.target.value)}
              placeholder={'Commence à écrire…\n\n# Titre\n**Gras** *Italique* `code`\n- Liste\n> Citation'}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg-0)', border: 'none',
                padding: '24px 32px', fontSize: 14, lineHeight: 1.8, color: 'var(--t0)',
                outline: 'none', fontFamily: '"SF Mono", "Fira Code", monospace',
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }} className="hidden lg:flex">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--border-l)' }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>Sélectionne une note ou crée-en une</p>
          <button onClick={create} className="btn btn-primary" style={{ fontSize: 13 }}>Nouvelle note</button>
        </div>
      )}

      {/* Mobile: note list when no active */}
      {!active && (
        <div className="lg:hidden" style={{ flex: 1, overflowY: 'auto', marginTop: 56 }}>
          <div style={{ padding: '12px 16px 8px' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border-s)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--t0)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Aucune note pour l&apos;instant</p>
              <button onClick={create} className="btn btn-primary">Créer une note</button>
            </div>
          ) : (
            filtered.map(note => (
              <button
                key={note.id}
                onClick={() => { setActive(note); setPreview(false) }}
                style={{
                  width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', borderBottom: '1px solid var(--border-s)',
                  padding: '14px 16px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', flex: 1 }}>{note.titre || 'Sans titre'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {(note.utilisateur !== myName || note.sharedWith.length > 0) && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: note.utilisateur !== myName ? 'var(--accent-bg)' : 'var(--bg-3)', color: note.utilisateur !== myName ? 'var(--accent)' : 'var(--t2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Partagée
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--t2)' }}>{relTime(note.updatedAt)}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.contenu.replace(/[#*`_~\[\]()]/g, '').slice(0, 80) || 'Vide'}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
