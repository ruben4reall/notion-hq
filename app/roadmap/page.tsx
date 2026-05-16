'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCache } from '@/lib/useCache'
import type { Task } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  Backlog:    '#6b7280',
  'À faire':  '#4f8ef7',
  'En cours': '#7c6af5',
  Review:     '#f59e0b',
  Done:       '#0ec98c',
}
const MODULE_COLOR: Record<string, string> = {
  Produit:     '#7c6af5',
  Marketing:   '#f59e0b',
  Prospection: '#4f8ef7',
  Ops:         '#0ec98c',
}

function getWeekLabel(date: Date) {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `Semaine du ${fmt(monday)} → ${fmt(sunday)}`
}

function getWeekKey(date: Date) {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

function isOverdue(dateEnd: string) {
  if (!dateEnd) return false
  return new Date(dateEnd) < new Date()
}

function daysBetween(a: string, b: string) {
  if (!a || !b) return null
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function TaskPill({ task }: { task: Task }) {
  const sc = STATUS_COLOR[task.status] || '#6b7280'
  const mc = MODULE_COLOR[task.module] || '#6b7280'
  const overdue = task.status !== 'Done' && isOverdue(task.dateEnd)
  const days = daysBetween(task.dateStart, task.dateEnd)

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: `1px solid ${overdue ? 'rgba(244,63,94,0.4)' : 'var(--border-s)'}`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 200,
      maxWidth: 280,
      flexShrink: 0,
      position: 'relative',
    }}>
      {overdue && (
        <span style={{
          position: 'absolute', top: -8, right: 8,
          fontSize: 9, fontWeight: 700, color: '#f43f5e',
          background: 'rgba(244,63,94,0.15)', padding: '2px 6px', borderRadius: 100,
          border: '1px solid rgba(244,63,94,0.3)',
        }}>
          EN RETARD
        </span>
      )}

      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: sc, background: `${sc}18`, padding: '2px 6px', borderRadius: 6 }}>
          {task.status}
        </span>
        {task.module && (
          <span style={{ fontSize: 10, color: mc, background: `${mc}18`, padding: '2px 6px', borderRadius: 6 }}>
            {task.module}
          </span>
        )}
        {task.priority && (
          <span style={{ fontSize: 10, fontWeight: 700, color: task.priority === 'P0' ? '#f43f5e' : task.priority === 'P1' ? '#f59e0b' : '#6b7280' }}>
            {task.priority}
          </span>
        )}
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title || 'Sans titre'}
      </p>

      {(task.dateStart || task.dateEnd) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: overdue ? '#f43f5e' : 'var(--t2)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {task.dateStart && fmtDate(task.dateStart)}
          {task.dateStart && task.dateEnd && ' → '}
          {task.dateEnd && fmtDate(task.dateEnd)}
          {days && <span style={{ color: 'var(--t2)' }}>({days}j)</span>}
        </div>
      )}
    </div>
  )
}

const ALL_MODULES = ['Produit', 'Marketing', 'Prospection', 'Ops'] as const
const ALL_STATUSES = ['Backlog', 'À faire', 'En cours', 'Review', 'Done'] as const

export default function RoadmapPage() {
  const { data, loading } = useCache<Task[]>('/api/tasks')
  const tasks = data ?? []
  const [moduleFilter, setModuleFilter] = useState<string>('Tous')
  const [statusFilter, setStatusFilter] = useState<string>('Tous')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = tasks.filter(t => {
    if (moduleFilter !== 'Tous' && t.module !== moduleFilter) return false
    if (statusFilter !== 'Tous' && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const withDates = filtered.filter(t => t.dateStart || t.dateEnd)
  const withoutDates = filtered.filter(t => !t.dateStart && !t.dateEnd)

  // Group by week (using dateEnd, fallback dateStart)
  const weekMap: Map<string, { label: string; tasks: Task[]; weekStart: Date }> = new Map()

  for (const task of withDates) {
    const refDate = new Date(task.dateEnd || task.dateStart)
    const key = getWeekKey(refDate)
    if (!weekMap.has(key)) {
      weekMap.set(key, { label: getWeekLabel(refDate), tasks: [], weekStart: refDate })
    }
    weekMap.get(key)!.tasks.push(task)
  }

  const weeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))

  const today = new Date().toISOString().split('T')[0]
  const todayWeekKey = getWeekKey(new Date())

  const totalWithDates = withDates.length
  const done = withDates.filter(t => t.status === 'Done').length
  const overdueTasks = withDates.filter(t => t.status !== 'Done' && isOverdue(t.dateEnd)).length
  const completionPct = totalWithDates > 0 ? Math.round((done / totalWithDates) * 100) : 0

  if (loading) return (
    <div className="page-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
      </div>
    </div>
  )

  return (
    <div className="page-container animate-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Roadmap</h1>
            <p className="page-subtitle">Vue chronologique de toutes les tâches planifiées</p>
          </div>
          <Link href="/kanban" style={{
            padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: 'var(--accent-bg)', color: 'var(--accent)',
            border: '1px solid rgba(124,106,245,0.2)', textDecoration: 'none',
          }}>
            + Ajouter dans Kanban →
          </Link>
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Tâches planifiées', value: totalWithDates, color: '#7c6af5' },
            { label: 'Terminées', value: `${done} (${completionPct}%)`, color: '#0ec98c' },
            { label: 'En retard', value: overdueTasks, color: overdueTasks > 0 ? '#f43f5e' : '#6b7280' },
            { label: 'Non planifiées', value: withoutDates.length, color: '#6b7280' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 120px' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Barre de progression globale */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>Progression globale</span>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{completionPct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionPct}%`, background: 'linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.5))', borderRadius: 100, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexDirection: 'column' }}>
        {/* Row 1: search + priority + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input placeholder="Rechercher une tâche…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 26, paddingRight: search ? 24 : 8, height: 32, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-s)', fontSize: 12, color: 'var(--t0)', outline: 'none', width: 200 }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>}
          </div>
          {(['P0', 'P1', 'P2'] as const).map(p => {
            const pc = { P0: '#f43f5e', P1: '#f59e0b', P2: '#6b7280' }[p]
            return (
              <button key={p} onClick={() => setPriorityFilter(v => v === p ? '' : p)}
                style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: priorityFilter === p ? 700 : 400, background: priorityFilter === p ? `${pc}20` : 'var(--bg-2)', color: priorityFilter === p ? pc : 'var(--t2)', border: `1px solid ${priorityFilter === p ? pc + '50' : 'var(--border-s)'}`, cursor: 'pointer' }}>
                {p}
              </button>
            )
          })}
          {(priorityFilter || search) && (
            <button onClick={() => { setPriorityFilter(''); setSearch('') }}
              style={{ padding: '5px 10px', borderRadius: 100, fontSize: 11, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer' }}>
              Effacer
            </button>
          )}
        </div>
        {/* Row 2: module */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', padding: 4, borderRadius: 10, overflowX: 'auto' }}>
          {['Tous', ...ALL_MODULES].map(m => (
            <button key={m} onClick={() => setModuleFilter(m)} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: moduleFilter === m ? 700 : 400,
              background: moduleFilter === m ? 'var(--accent)' : 'transparent',
              color: moduleFilter === m ? 'white' : 'var(--t1)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{m}</button>
          ))}
        </div>
        {/* Row 3: status */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', padding: 4, borderRadius: 10, overflowX: 'auto' }}>
          {['Tous', ...ALL_STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: statusFilter === s ? 700 : 400,
              background: statusFilter === s ? (STATUS_COLOR[s] ?? 'var(--accent)') : 'transparent',
              color: statusFilter === s ? 'white' : 'var(--t1)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Timeline par semaine */}
      {weeks.length === 0 && withoutDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t2)' }}>
          Aucune tâche trouvée avec ces filtres
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {weeks.map(([key, week]) => {
            const isPast = key < todayWeekKey
            const isCurrent = key === todayWeekKey
            return (
              <div key={key}>
                {/* Entête semaine */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: isCurrent ? 'var(--accent)' : isPast ? '#0ec98c' : 'var(--border-m)',
                    boxShadow: isCurrent ? '0 0 8px var(--accent)' : 'none',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: isCurrent ? 'var(--accent)' : isPast ? '#0ec98c' : 'var(--t1)',
                    letterSpacing: '0.03em',
                  }}>
                    {week.label}
                    {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--accent)', color: 'white', padding: '2px 7px', borderRadius: 100 }}>CETTE SEMAINE</span>}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-s)' }} />
                  <span style={{ fontSize: 11, color: 'var(--t2)' }}>{week.tasks.length} tâche{week.tasks.length > 1 ? 's' : ''}</span>
                </div>

                {/* Cards horizontales scrollables */}
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, paddingLeft: 20 }}>
                  {week.tasks.map(task => <TaskPill key={task.id} task={task} />)}
                </div>
              </div>
            )
          })}

          {/* Non planifiées */}
          {withoutDates.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-m)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.03em' }}>
                  NON PLANIFIÉES
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-s)' }} />
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>{withoutDates.length} tâche{withoutDates.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingLeft: 20 }}>
                {withoutDates.map(task => <TaskPill key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Légende */}
      <div style={{ marginTop: 32, padding: '16px', background: 'var(--bg-2)', borderRadius: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>LÉGENDE :</span>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} style={{ fontSize: 11, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {s}
          </span>
        ))}
        <span style={{ fontSize: 11, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }} />
          En retard
        </span>
      </div>
    </div>
  )
}
