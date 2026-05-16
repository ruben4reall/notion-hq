'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCache } from '@/lib/useCache'
import type { Task } from '@/lib/types'

const PRIORITY_COLOR: Record<string, string> = {
  P0: '#f43f5e', P1: '#f59e0b', P2: '#6b7280',
}
const STATUS_COLOR: Record<string, string> = {
  Backlog: '#6b7280', 'À faire': '#4f8ef7', 'En cours': '#7c6af5', Review: '#f59e0b', Done: '#0ec98c',
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getGroup(task: Task): 'overdue' | 'today' | 'week' | 'later' | 'nodate' {
  const today = isoDate(new Date())
  const weekEnd = isoDate(new Date(Date.now() + 7 * 86400_000))
  const end = task.dateEnd || task.dateStart
  if (!end) return 'nodate'
  if (task.status === 'Done') return 'later'
  if (end < today) return 'overdue'
  if (end === today) return 'today'
  if (end <= weekEnd) return 'week'
  return 'later'
}

const GROUP_ORDER = ['overdue', 'today', 'week', 'later', 'nodate'] as const
const GROUP_LABEL: Record<string, { label: string; color: string }> = {
  overdue: { label: 'En retard',      color: '#f43f5e' },
  today:   { label: 'Aujourd\'hui',   color: '#f59e0b' },
  week:    { label: 'Cette semaine',  color: '#4f8ef7' },
  later:   { label: 'Plus tard',      color: '#6b7280' },
  nodate:  { label: 'Sans date',      color: '#6b7280' },
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d))
}

type TodoistTask = { id: string; content: string; priority: number; due?: { date: string }; is_completed: boolean; url: string }

const TODOIST_KEY = '_todoist_token'

function loadTodoistToken(): string {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(TODOIST_KEY) || '' } catch { return '' }
}
function saveTodoistToken(t: string) {
  try { localStorage.setItem(TODOIST_KEY, t) } catch {}
}

function TaskRow({
  task, onToggle, onEdit,
}: {
  task: Task; onToggle: (id: string, done: boolean) => void; onEdit: (task: Task) => void
}) {
  const isDone = task.status === 'Done'
  const end = task.dateEnd || task.dateStart
  const today = isoDate(new Date())
  const isOverdue = !isDone && end && end < today
  const isToday = end === today

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0', borderBottom: '1px solid var(--border-s)',
        opacity: isDone ? 0.5 : 1, transition: 'opacity 0.2s',
      }}
    >
      <button
        onClick={() => onToggle(task.id, !isDone)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${isDone ? 'var(--green)' : 'var(--border-m)'}`,
          background: isDone ? 'var(--green)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {isDone && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onEdit(task)}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t0)', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title || 'Sans titre'}
        </p>
        {(task.module || task.assignedTo) && (
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>
            {task.module}{task.module && task.assignedTo ? ' · ' : ''}{task.assignedTo ? task.assignedTo.split(' ')[0] : ''}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {task.priority && (
          <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[task.priority], background: `${PRIORITY_COLOR[task.priority]}14`, padding: '2px 6px', borderRadius: 5 }}>
            {task.priority}
          </span>
        )}
        {end && (
          <span style={{ fontSize: 11, color: isOverdue ? '#f43f5e' : isToday ? '#f59e0b' : 'var(--t2)', fontWeight: isOverdue || isToday ? 600 : 400 }}>
            {fmtDate(end)}
          </span>
        )}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[task.status] || '#6b7280', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement | null>(null)

  const submit = () => {
    const t = value.trim()
    if (!t) return
    onAdd(t)
    setValue('')
    ref.current?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border-s)' }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: '2px dashed var(--border-m)', flexShrink: 0 }} />
      <input
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Ajouter une tâche… (Entrée pour créer)"
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--t1)', caretColor: 'var(--accent)' }}
      />
      {value && (
        <button onClick={submit} style={{ padding: '3px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          Ajouter
        </button>
      )}
    </div>
  )
}

function EditModal({ task, onClose, onSaved, onDelete }: { task: Task; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const [title, setTitle] = useState(task.title || '')
  const [status, setStatus] = useState<Task['status']>(task.status)
  const [priority, setPriority] = useState(task.priority || '')
  const [dateEnd, setDateEnd] = useState(task.dateEnd || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, priority: priority || null, dateEnd: dateEnd || null }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const del = async () => {
    if (!confirm('Supprimer cette tâche ?')) return
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onDelete()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg-1)', border: '1px solid var(--border-m)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90dvh', overflow: 'auto', animation: 'floatIn 0.25s var(--ease-spring) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>Modifier la tâche</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Titre</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 14, outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value as Task['status'])} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none' }}>
              {['Backlog','À faire','En cours','Review','Done'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Priorité</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none' }}>
              <option value="">—</option>
              <option value="P0">P0 Critique</option>
              <option value="P1">P1 Haute</option>
              <option value="P2">P2 Normale</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Deadline</label>
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button onClick={del} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer' }}>Supprimer</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'var(--bg-3)', border: '1px solid var(--border-m)', color: 'var(--t1)', cursor: 'pointer' }}>Annuler</button>
            <button onClick={save} disabled={saving || !title.trim()} style={{ padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', opacity: saving || !title.trim() ? 0.6 : 1 }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TodoistPanel({ onImport }: { onImport: (tasks: TodoistTask[]) => void }) {
  const [token, setToken] = useState(() => loadTodoistToken())
  const [loading, setLoading] = useState(false)
  const [todoistTasks, setTodoistTasks] = useState<TodoistTask[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const fetchTodoist = async () => {
    if (!token.trim()) return
    setLoading(true)
    setError('')
    saveTodoistToken(token)
    const res = await fetch('/api/todo/todoist', { headers: { 'x-todoist-token': token } })
    if (!res.ok) {
      setError('Token invalide ou erreur de connexion')
      setLoading(false)
      return
    }
    const data = await res.json()
    setTodoistTasks(data.tasks || [])
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 28 }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,60,41,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#dc3c29" strokeWidth="2"/>
            <path d="M8 12l3 3 5-5" stroke="#dc3c29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)' }}>Todoist</p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{token ? 'Connecté · cliquer pour voir les tâches' : 'Connecter votre compte Todoist'}</p>
        </div>
        <span style={{ fontSize: 16, color: 'var(--t2)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-s)' }}>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10, marginTop: 14, lineHeight: 1.6 }}>
            Collez votre token Todoist (Paramètres → Intégrations → Token d'API dans Todoist).
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Token Todoist…"
              style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none' }}
            />
            <button onClick={fetchTodoist} disabled={loading || !token} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#dc3c29', color: 'white', border: 'none', cursor: 'pointer', opacity: loading || !token ? 0.6 : 1 }}>
              {loading ? '…' : 'Sync'}
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: '#f43f5e', marginBottom: 10 }}>{error}</p>}
          {todoistTasks.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflow: 'auto', marginBottom: 12 }}>
                {todoistTasks.filter(t => !t.is_completed).slice(0, 20).map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-s)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.priority >= 2 ? '#f43f5e' : '#f59e0b', flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: 13, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.content}</p>
                    {t.due && <span style={{ fontSize: 11, color: 'var(--t2)', flexShrink: 0 }}>{fmtDate(t.due.date)}</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => onImport(todoistTasks.filter(t => !t.is_completed))}
                style={{ width: '100%', padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(220,60,41,0.1)', color: '#dc3c29', border: '1px solid rgba(220,60,41,0.2)', cursor: 'pointer' }}
              >
                Importer {todoistTasks.filter(t => !t.is_completed).length} tâches dans le Kanban
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TodoPage() {
  const { user: session } = useAuth()
  const myName = session?.name || ''
  const { data: fetchedTasks, loading, refresh } = useCache<Task[]>('/api/tasks', { ttl: 15_000 })
  const [tasks, setTasks] = useState<Task[]>(fetchedTasks ?? [])
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'mine' | 'all'>('mine')
  const [showDone, setShowDone] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => { if (fetchedTasks) setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []) }, [fetchedTasks])

  const visibleTasks = tasks.filter(t => {
    if (filter === 'mine' && myName && t.assignedTo !== myName) return false
    if (!showDone && t.status === 'Done') return false
    return true
  })

  const grouped = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = visibleTasks.filter(t => getGroup(t) === g)
    return acc
  }, {} as Record<string, Task[]>)

  const toggleDone = useCallback(async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: done ? 'Done' : 'À faire' } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: done ? 'Done' : 'À faire' }),
    })
  }, [])

  const quickAdd = useCallback(async (title: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status: 'À faire', assignedTo: myName || undefined }),
    })
    refresh()
  }, [myName, refresh])

  const importTodoist = useCallback(async (todoistTasks: TodoistTask[]) => {
    setImporting(true)
    for (const t of todoistTasks.slice(0, 50)) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t.content,
          status: 'À faire',
          priority: t.priority >= 4 ? 'P0' : t.priority >= 3 ? 'P1' : 'P2',
          dateEnd: t.due?.date || null,
          assignedTo: myName || undefined,
        }),
      })
    }
    setImporting(false)
    refresh()
  }, [myName, refresh])

  const totalMine = tasks.filter(t => t.assignedTo === myName && t.status !== 'Done').length
  const totalOverdue = tasks.filter(t => getGroup(t) === 'overdue').length

  return (
    <div className="page-container animate-in">
      {editTask && (
        <EditModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={refresh}
          onDelete={refresh}
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Todo</h1>
        <p className="page-subtitle">
          {totalMine} tâche{totalMine !== 1 ? 's' : ''} assignée{totalMine !== 1 ? 's' : ''} · {totalOverdue > 0 ? <span style={{ color: '#f43f5e' }}>{totalOverdue} en retard</span> : 'Tout est à jour'}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 9, padding: 3, gap: 2 }}>
          {(['mine','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === f ? 'var(--bg-0)' : 'transparent',
              color: filter === f ? 'var(--t0)' : 'var(--t2)',
              border: filter === f ? '1px solid var(--border-s)' : '1px solid transparent',
              boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            }}>
              {f === 'mine' ? 'Mes tâches' : 'Toutes'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDone(v => !v)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: showDone ? 'rgba(14,201,140,0.1)' : 'var(--bg-2)',
            color: showDone ? 'var(--green)' : 'var(--t2)',
            border: `1px solid ${showDone ? 'rgba(14,201,140,0.25)' : 'var(--border-s)'}`,
          }}
        >
          {showDone ? '✓ Cachant les terminées' : 'Afficher terminées'}
        </button>
      </div>

      {/* Task groups */}
      {loading && !tasks.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 20px' }}>
          <QuickAdd onAdd={quickAdd} />
          {GROUP_ORDER.map(group => {
            const groupTasks = grouped[group] || []
            if (groupTasks.length === 0) return null
            const { label, color } = GROUP_LABEL[group]
            return (
              <div key={group} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--t2)', background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 100 }}>
                    {groupTasks.length}
                  </span>
                </div>
                {groupTasks.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={toggleDone} onEdit={setEditTask} />
                ))}
              </div>
            )
          })}

          {visibleTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>Tout est fait !</p>
              <p style={{ fontSize: 13, color: 'var(--t2)' }}>
                {filter === 'mine' ? 'Aucune tâche assignée à vous.' : 'Aucune tâche en cours.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {tasks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
          {[
            { label: 'Total', value: tasks.filter(t => filter === 'mine' ? t.assignedTo === myName : true).length, color: 'var(--t2)' },
            { label: 'En cours', value: tasks.filter(t => (filter === 'mine' ? t.assignedTo === myName : true) && t.status === 'En cours').length, color: 'var(--accent)' },
            { label: 'Terminées', value: tasks.filter(t => (filter === 'mine' ? t.assignedTo === myName : true) && t.status === 'Done').length, color: 'var(--green)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: stat.color, letterSpacing: '-0.03em' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Integrations */}
      <div style={{ marginTop: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 14 }}>Intégrations externes</p>
        <TodoistPanel onImport={importTodoist} />
        {importing && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t2)', textAlign: 'center' }}>
            Import en cours…
          </div>
        )}
      </div>
    </div>
  )
}
