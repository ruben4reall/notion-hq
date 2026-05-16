'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { IdeaModal } from './IdeaModal'
import { useCache } from '@/lib/useCache'
import { UserAvatar, useUsers } from './UserPicker'
import { useLanguage } from '@/context/LanguageContext'
import type { Idea } from '@/lib/types'

const STATUS_TABS = ['Brute', 'À explorer', 'Validée', 'Rejetée'] as const
type Filter = null | typeof STATUS_TABS[number]

const STATUS_CFG: Record<string, { c: string; bg: string }> = {
  Brute:       { c: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  'À explorer':{ c: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
  Validée:     { c: '#0ec98c', bg: 'rgba(14,201,140,0.12)' },
  Rejetée:     { c: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
}
const STATUS_KEY: Record<string, string> = { Brute: 'ideaRaw', 'À explorer': 'ideaExplore', Validée: 'ideaValidated', Rejetée: 'ideaRejected' }
const EFFORT_CFG: Record<string, string> = { Faible: '#0ec98c', Moyen: '#f59e0b', Élevé: '#f43f5e' }
const CAT_COLOR: Record<string, string> = { Produit:'#7c6af5', Marketing:'#f59e0b', Prospection:'#4f8ef7', Ops:'#0ec98c' }
const CAT_KEY: Record<string, string> = { Produit: 'moduleProduct', Marketing: 'moduleMarketing', Prospection: 'moduleSales', Ops: 'moduleOps' }


function IdeaCard({ idea, onEdit, onDelete, onVote, users }: {
  idea: Idea; onEdit: () => void; onDelete: () => void; onVote: (delta: number) => void
  users: { name: string; color: string }[]
}) {
  const { t } = useLanguage()
  const [menu, setMenu] = useState(false)
  const sc = STATUS_CFG[idea.status] || STATUS_CFG.Brute
  const ec = EFFORT_CFG[idea.effort]
  const cc = CAT_COLOR[idea.category] || '#6b7280'
  const assignee = users.find(u => u.name === idea.assignedTo)

  return (
    <div className="card animate-in" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          <span className="badge" style={{ color: sc.c, background: sc.bg }}>{STATUS_KEY[idea.status] ? t(STATUS_KEY[idea.status]) : idea.status}</span>
          {idea.category && <span className="badge" style={{ color: cc, background: `${cc}18` }}>{CAT_KEY[idea.category] ? t(CAT_KEY[idea.category]) : idea.category}</span>}
          {idea.effort && ec && <span className="badge" style={{ color: ec, background: `${ec}18` }}>{t({ Faible: 'effortLow', Moyen: 'effortMedium', Élevé: 'effortHigh' }[idea.effort] ?? idea.effort)}</span>}
        </div>

        {/* Actions */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenu(v => !v)} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⋯</button>
          {menu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(false)} />
              <div style={{ position: 'absolute', top: 26, right: 0, zIndex: 20, background: 'var(--bg-3)', border: '1px solid var(--border-m)', borderRadius: 8, padding: 4, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <button onClick={() => { setMenu(false); onEdit() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--t0)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>✏️ {t('edit')}</button>
                <button onClick={() => { setMenu(false); onDelete() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>🗑 {t('delete')}</button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.4 }}>{idea.title || t('noTitle')}</h3>
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
  const { t } = useLanguage()
  const { data: fetchedIdeas, loading, refresh } = useCache<Idea[]>('/api/ideas')
  const [ideas, setIdeas] = useState<Idea[]>(fetchedIdeas ?? [])
  const [filter, setFilter] = useState<Filter>(null)
  const [filterUser, setFilterUser] = useState('')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortBy, setSortBy] = useState<'votes' | 'date'>('votes')
  const [modal, setModal] = useState<{ open: boolean; idea?: Idea | null }>({ open: false })
  const users = useUsers()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fetchedIdeas) setIdeas(fetchedIdeas)
  }, [fetchedIdeas])

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
    if (!confirm(t('deleteIdeaConfirm'))) return
    setIdeas(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
  }

  const CATEGORIES_IDEAS = ['Produit', 'Marketing', 'Prospection', 'Ops']

  const filtered = ideas
    .filter(i => filter === null || i.status === filter)
    .filter(i => !filterUser || i.assignedTo === filterUser)
    .filter(i => !filterCat || i.category === filterCat)
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'votes' ? b.votes - a.votes : new Date(b.lastEdited || 0).getTime() - new Date(a.lastEdited || 0).getTime())

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
          {([null, ...STATUS_TABS] as Filter[]).map(tab => {
            const active = filter === tab
            const label = tab === null ? t('allFem') : t(STATUS_KEY[tab])
            const count = tab === null ? ideas.length : ideas.filter(i => i.status === tab).length
            return (
              <button key={tab ?? '__all'} onClick={() => setFilter(tab)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: active ? 600 : 400, border: `1px solid ${active ? 'var(--accent)' : 'var(--border-s)'}`, background: active ? 'var(--accent-bg)' : 'transparent', color: active ? 'var(--accent)' : 'var(--t1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                {label}
                <span style={{ fontSize: 10, background: active ? 'rgba(124,106,245,0.2)' : 'var(--bg-2)', color: active ? 'var(--accent)' : 'var(--t2)', padding: '0 5px', borderRadius: 100 }}>{count}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 26, paddingRight: search ? 24 : 8, height: 28, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-s)', fontSize: 12, color: 'var(--t0)', outline: 'none', width: 140 }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>}
          </div>

          {/* Category */}
          {CATEGORIES_IDEAS.map(c => (
            <button key={c} onClick={() => setFilterCat(v => v === c ? '' : c)}
              style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: filterCat === c ? 700 : 400, background: filterCat === c ? 'var(--accent-bg)' : 'var(--bg-2)', color: filterCat === c ? 'var(--accent)' : 'var(--t2)', border: `1px solid ${filterCat === c ? 'rgba(var(--accent-rgb),0.3)' : 'var(--border-s)'}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {CAT_KEY[c] ? t(CAT_KEY[c]) : c}
            </button>
          ))}

          {/* Sort */}
          <button onClick={() => setSortBy(v => v === 'votes' ? 'date' : 'votes')}
            style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, background: 'var(--bg-2)', color: 'var(--t2)', border: '1px solid var(--border-s)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {sortBy === 'votes' ? '▲ Votes' : '🕐 Date'}
          </button>

          {/* Users */}
          {users.length > 0 && users.map(u => (
            <button key={u.name} onClick={() => setFilterUser(v => v === u.name ? '' : u.name)} title={u.name}
              style={{ width: 28, height: 28, borderRadius: '50%', background: filterUser === u.name ? u.color : `${u.color}30`, color: filterUser === u.name ? 'white' : u.color, border: `2px solid ${filterUser === u.name ? u.color : 'transparent'}`, cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {u.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
            </button>
          ))}

          <button onClick={() => setModal({ open: true, idea: null })} className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 12, marginLeft: 'auto' }}>
            + {t('newIdea')}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t2)' }}>{t('noIdeas')}</div>
      ) : (
        <div data-tour="ideas-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
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
        onSaved={refresh}
      />
    </>
  )
}
