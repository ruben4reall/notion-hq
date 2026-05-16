'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { IdeaModal } from './IdeaModal'
import { UserAvatar, useUsers } from './UserPicker'
import type { Idea } from '@/lib/types'

const STATUS_TABS = ['Toutes', 'Brute', 'À explorer', 'Validée', 'Rejetée'] as const
type Filter = typeof STATUS_TABS[number]

const STATUS_CFG: Record<string, { c: string; bg: string }> = {
  Brute:       { c: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  'À explorer':{ c: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
  Validée:     { c: '#0ec98c', bg: 'rgba(14,201,140,0.12)' },
  Rejetée:     { c: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
}
const EFFORT_CFG: Record<string, string> = { Faible: '#0ec98c', Moyen: '#f59e0b', Élevé: '#f43f5e' }
const CAT_COLOR: Record<string, string> = { Produit:'#7c6af5', Marketing:'#f59e0b', Prospection:'#4f8ef7', Ops:'#0ec98c' }

function relTime(iso: string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d/60)}h`
  return `il y a ${Math.floor(d/1440)}j`
}

function IdeaCard({ idea, onEdit, onDelete, onVote, users }: {
  idea: Idea; onEdit: () => void; onDelete: () => void; onVote: (delta: number) => void
  users: { name: string; color: string }[]
}) {
  const [menu, setMenu] = useState(false)
  const sc = STATUS_CFG[idea.status] || STATUS_CFG.Brute
  const ec = EFFORT_CFG[idea.effort]
  const cc = CAT_COLOR[idea.category] || '#6b7280'
  const assignee = users.find(u => u.name === idea.assignedTo)

  return (
    <div className="card animate-in" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          <span className="badge" style={{ color: sc.c, background: sc.bg }}>{idea.status}</span>
          {idea.category && <span className="badge" style={{ color: cc, background: `${cc}18` }}>{idea.category}</span>}
          {idea.effort && ec && <span className="badge" style={{ color: ec, background: `${ec}18` }}>{idea.effort}</span>}
        </div>

        {/* Actions */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenu(v => !v)} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⋯</button>
          {menu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(false)} />
              <div style={{ position: 'absolute', top: 26, right: 0, zIndex: 20, background: 'var(--bg-3)', border: '1px solid var(--border-m)', borderRadius: 8, padding: 4, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <button onClick={() => { setMenu(false); onEdit() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--t0)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>✏️ Modifier</button>
                <button onClick={() => { setMenu(false); onDelete() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>🗑 Supprimer</button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.4 }}>{idea.title || 'Sans titre'}</h3>
      {idea.description && (
        <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
          {idea.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border-s)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {assignee
            ? <UserAvatar name={assignee.name} color={assignee.color} size={20} />
            : idea.modifiedBy
              ? <span style={{ fontSize: 10, color: 'var(--t2)' }}>{idea.modifiedBy.split(' ')[0]}</span>
              : null
          }
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => onVote(-1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: idea.votes > 0 ? 'var(--accent)' : 'var(--t2)', minWidth: 28, textAlign: 'center' }}>{idea.votes}</span>
          <button onClick={() => onVote(1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(124,106,245,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
      </div>
    </div>
  )
}

export default function IdeasView() {
  const { user: session } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('Toutes')
  const [filterUser, setFilterUser] = useState('')
  const [modal, setModal] = useState<{ open: boolean; idea?: Idea | null }>({ open: false })
  const users = useUsers()

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/ideas')
    setIdeas(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleVote = async (id: string, delta: number) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    const newVotes = Math.max(0, idea.votes + delta)
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: newVotes } : i))
    await fetch(`/api/ideas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votes: newVotes, modifiedBy: session?.name ?? '' }),
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette idée ?')) return
    setIdeas(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
  }

  const filtered = ideas
    .filter(i => filter === 'Toutes' || i.status === filter)
    .filter(i => !filterUser || i.assignedTo === filterUser)

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}
    </div>
  )

  return (
    <>
      {/* Toolbar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {STATUS_TABS.map(tab => {
            const active = filter === tab
            const count = tab === 'Toutes' ? ideas.length : ideas.filter(i => i.status === tab).length
            return (
              <button key={tab} onClick={() => setFilter(tab)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: active ? 600 : 400, border: `1px solid ${active ? 'var(--accent)' : 'var(--border-s)'}`, background: active ? 'var(--accent-bg)' : 'transparent', color: active ? 'var(--accent)' : 'var(--t1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                {tab}
                <span style={{ fontSize: 10, background: active ? 'rgba(124,106,245,0.2)' : 'var(--bg-2)', color: active ? 'var(--accent)' : 'var(--t2)', padding: '0 5px', borderRadius: 100 }}>{count}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {users.length > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {users.map(u => (
                <button key={u.name} onClick={() => setFilterUser(v => v === u.name ? '' : u.name)} title={u.name} style={{ width: 30, height: 30, borderRadius: '50%', background: filterUser === u.name ? u.color : `${u.color}30`, color: filterUser === u.name ? 'white' : u.color, border: `2px solid ${filterUser === u.name ? u.color : 'transparent'}`, cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {u.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setModal({ open: true, idea: null })}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: 12 }}
          >
            + Nouvelle idée
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t2)' }}>Aucune idée dans cette catégorie</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id} idea={idea}
              onEdit={() => setModal({ open: true, idea })}
              onDelete={() => handleDelete(idea.id)}
              onVote={delta => handleVote(idea.id, delta)}
              users={users}
            />
          ))}
        </div>
      )}

      <IdeaModal
        isOpen={modal.open}
        idea={modal.idea}
        onClose={() => setModal({ open: false })}
        onSaved={load}
      />
    </>
  )
}
