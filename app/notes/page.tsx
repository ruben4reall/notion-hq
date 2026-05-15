'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Note {
  id: string
  titre: string
  contenu: string
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
  const { data: session } = useSession()
  const [notes, setNotes] = useState<Note[]>([])
  const [active, setActive] = useState<Note | null>(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async () => {
    const res = await fetch('/api/notes')
    if (res.ok) setNotes(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

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

  const save = useCallback(async (note: Note) => {
    setSaving(true)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: note.titre, contenu: note.contenu }),
    })
    setNotes(prev => prev.map(n => n.id === note.id ? { ...note, updatedAt: new Date().toISOString() } : n))
    setSaving(false)
  }, [])

  const onChange = (field: 'titre' | 'contenu', value: string) => {
    if (!active) return
    const updated = { ...active, [field]: value }
    setActive(updated)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(updated), 800)
  }

  const remove = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (active?.id === id) setActive(null)
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
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-1)',
        flexShrink: 0,
        transition: 'width 0.25s var(--ease-spring)',
      }} className="lg:flex hidden lg:flex-col">
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
              <button
                key={note.id}
                onClick={() => { setActive(note); setPreview(false) }}
                style={{
                  width: '100%', textAlign: 'left', background: active?.id === note.id ? 'var(--accent-bg)' : 'none',
                  border: 'none', borderBottom: '1px solid var(--border-s)',
                  padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (active?.id !== note.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
                onMouseLeave={e => { if (active?.id !== note.id) (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{
                    fontSize: 13, fontWeight: active?.id === note.id ? 600 : 500,
                    color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {note.titre || 'Sans titre'}
                  </p>
                  <span style={{ fontSize: 10, color: 'var(--t2)', flexShrink: 0 }}>{relTime(note.updatedAt)}</span>
                </div>
                <p style={{
                  fontSize: 11, color: 'var(--t2)', marginTop: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {note.contenu.replace(/[#*`_~\[\]()]/g, '').slice(0, 60) || 'Vide'}
                </p>
              </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {saving && <span style={{ fontSize: 11, color: 'var(--t2)' }}>Enregistrement…</span>}
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
              <button
                onClick={() => remove(active.id)}
                style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                title="Supprimer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }} className="hidden lg:flex">
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)' }}>{note.titre || 'Sans titre'}</p>
                  <span style={{ fontSize: 11, color: 'var(--t2)' }}>{relTime(note.updatedAt)}</span>
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
