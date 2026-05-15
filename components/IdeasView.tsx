'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Idea } from '@/lib/types'

const STATUS_TABS = ['Toutes', 'Brute', 'À explorer', 'Validée', 'Rejetée'] as const
type StatusFilter = typeof STATUS_TABS[number]

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Brute:       { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  'À explorer':{ color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
  Validée:     { color: '#0ec98c', bg: 'rgba(14,201,140,0.12)' },
  Rejetée:     { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
}

const EFFORT_CONFIG: Record<string, { color: string }> = {
  Faible: { color: '#0ec98c' },
  Moyen:  { color: '#f59e0b' },
  Élevé:  { color: '#f43f5e' },
}

const CATEGORY_COLOR: Record<string, string> = {
  Produit:     '#7c6af5',
  Marketing:   '#f59e0b',
  Prospection: '#4f8ef7',
  Ops:         '#0ec98c',
}

function IdeaCard({ idea, onVote }: { idea: Idea; onVote: (id: string, delta: number) => void }) {
  const sc = STATUS_CONFIG[idea.status] || STATUS_CONFIG.Brute
  const ec = EFFORT_CONFIG[idea.effort]
  const cc = CATEGORY_COLOR[idea.category] || '#6b7280'

  return (
    <div className="card animate-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="badge" style={{ color: sc.color, background: sc.bg }}>{idea.status}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {idea.category && (
            <span className="badge" style={{ color: cc, background: `${cc}18` }}>{idea.category}</span>
          )}
          {idea.effort && ec && (
            <span className="badge" style={{ color: ec.color, background: `${ec.color}18` }}>{idea.effort}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.4 }}>
        {idea.title || 'Sans titre'}
      </h3>

      {/* Description */}
      {idea.description && (
        <p style={{
          fontSize: 12,
          color: 'var(--t1)',
          lineHeight: 1.6,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {idea.description}
        </p>
      )}

      {/* Vote row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
        marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border-s)',
      }}>
        <button
          onClick={() => onVote(idea.id, -1)}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg-2)', border: '1px solid var(--border-s)',
            color: 'var(--t1)', cursor: 'pointer', fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          −
        </button>
        <span style={{
          fontSize: 15, fontWeight: 700, color: idea.votes > 0 ? 'var(--accent)' : 'var(--t2)',
          minWidth: 28, textAlign: 'center',
        }}>
          {idea.votes}
        </span>
        <button
          onClick={() => onVote(idea.id, 1)}
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-bg)', border: '1px solid rgba(124,106,245,0.2)',
            color: 'var(--accent)', cursor: 'pointer', fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
      ))}
    </div>
  )
}

export default function IdeasView() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('Toutes')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ideas')
      if (!res.ok) throw new Error()
      setIdeas(await res.json())
    } catch {
      setError('Impossible de charger les idées.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleVote = async (id: string, delta: number) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    const newVotes = Math.max(0, idea.votes + delta)
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: newVotes } : i))
    try {
      await fetch(`/api/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: newVotes }),
      })
    } catch {
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: idea.votes } : i))
    }
  }

  const filtered = filter === 'Toutes' ? ideas : ideas.filter(i => i.status === filter)

  if (loading) return <Skeleton />

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', color: 'var(--t1)' }}>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={load}>Réessayer</button>
    </div>
  )

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(tab => {
          const active = filter === tab
          const count = tab === 'Toutes' ? ideas.length : ideas.filter(i => i.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-s)'}`,
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--t1)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {tab}
              <span style={{
                fontSize: 10,
                background: active ? 'rgba(124,106,245,0.2)' : 'var(--bg-2)',
                color: active ? 'var(--accent)' : 'var(--t2)',
                padding: '0px 5px', borderRadius: 100,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t2)' }}>
          Aucune idée dans cette catégorie
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onVote={handleVote} />
          ))}
        </div>
      )}
    </div>
  )
}
