'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TaskModal } from './TaskModal'
import { UserAvatar, useUsers } from './UserPicker'
import { useCache } from '@/lib/useCache'
import type { Task } from '@/lib/types'

const COLUMNS: { id: Task['status']; color: string }[] = [
  { id: 'Backlog',  color: '#6b7280' },
  { id: 'À faire', color: '#4f8ef7' },
  { id: 'En cours',color: '#7c6af5' },
  { id: 'Review',  color: '#f59e0b' },
  { id: 'Done',    color: '#0ec98c' },
]

const P_COLOR: Record<string, { c: string; bg: string }> = {
  P0: { c: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  P1: { c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  P2: { c: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}
const M_COLOR: Record<string, string> = {
  Produit:'#7c6af5', Marketing:'#f59e0b', Prospection:'#4f8ef7', Ops:'#0ec98c',
}

function relTime(iso: string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d/60)}h`
  return `il y a ${Math.floor(d/1440)}j`
}

function TaskCard({ task, onEdit, onDelete, isDragging, users }: {
  task: Task; onEdit: () => void; onDelete: () => void; isDragging: boolean
  users: { name: string; color: string }[]
}) {
  const [menu, setMenu] = useState(false)
  const p = P_COLOR[task.priority] || null
  const mc = M_COLOR[task.module] || '#6b7280'
  const assignee = users.find(u => u.name === task.assignedTo)
  const todayStr = new Date().toISOString().slice(0, 10)
  const isOverdue = !!(task.dateEnd && task.status !== 'Done' && task.dateEnd < todayStr)
  const isDueToday = !!(task.dateEnd && task.dateEnd === todayStr && task.status !== 'Done')

  return (
    <div style={{
      background: isDragging ? 'var(--bg-3)' : 'var(--bg-1)',
      border: `1px solid ${isDragging ? 'rgba(124,106,245,0.5)' : isOverdue ? 'rgba(244,63,94,0.3)' : 'var(--border-s)'}`,
      borderRadius: 10, padding: '11px 12px',
      boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : 'none',
      cursor: 'grab', userSelect: 'none', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {(task.priority || task.module || isOverdue || isDueToday) && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
              {isOverdue && (
                <span className="badge" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.12)' }}>En retard</span>
              )}
              {isDueToday && (
                <span className="badge" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}>Aujourd'hui</span>
              )}
              {task.priority && p && (
                <span className="badge" style={{ color: p.c, background: p.bg }}>{task.priority}</span>
              )}
              {task.module && (
                <span className="badge" style={{ color: mc, background: `${mc}18` }}>{task.module}</span>
              )}
            </div>
          )}
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)', lineHeight: 1.4 }}>
            {task.title || 'Sans titre'}
          </p>
          {task.description && (
            <p style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.5, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
              {task.description}
            </p>
          )}
        </div>

        {/* Actions menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenu(v => !v) }}
            style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
          >⋯</button>
          {menu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(false)} />
              <div style={{ position: 'absolute', top: 26, right: 0, zIndex: 20, background: 'var(--bg-3)', border: '1px solid var(--border-m)', borderRadius: 8, padding: 4, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <button onClick={e => { e.stopPropagation(); setMenu(false); onEdit() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--t0)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>✏️ Modifier</button>
                <button onClick={e => { e.stopPropagation(); setMenu(false); onDelete() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>🗑 Supprimer</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--t2)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-s)' }}>
        {task.dateEnd && (
          <span style={{ color: isOverdue ? 'var(--red)' : isDueToday ? 'var(--amber)' : 'var(--t2)' }}>
            📅 {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(task.dateEnd))}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {assignee && <UserAvatar name={assignee.name} color={assignee.color} size={18} />}
          {!assignee && task.modifiedBy && (
            <span style={{ fontSize: 10, color: 'var(--t2)' }}>par {task.modifiedBy.split(' ')[0]}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ minWidth: 260, flex: '0 0 260px' }}>
          <div className="skeleton" style={{ height: 16, width: 80, borderRadius: 6, marginBottom: 12 }} />
          {[1,2,3].map(j => <div key={j} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 8 }} />)}
        </div>
      ))}
    </div>
  )
}

export default function KanbanBoard() {
  const { data: fetchedTasks, loading, refresh } = useCache<Task[]>('/api/tasks')
  const [tasks, setTasks] = useState<Task[]>(fetchedTasks ?? [])
  const [modal, setModal] = useState<{ open: boolean; task?: Task | null; defaultStatus?: Task['status'] }>({ open: false })
  const [filterUser, setFilterUser] = useState('')
  const users = useUsers()

  useEffect(() => {
    if (fetchedTasks) setTasks(fetchedTasks)
  }, [fetchedTasks])

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const newStatus = destination.droppableId as Task['status']
    const old = source.droppableId as Task['status']
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t))
    try {
      await fetch(`/api/tasks/${draggableId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    } catch {
      setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: old } : t))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  if (loading) return <Skeleton />

  const visibleTasks = filterUser ? tasks.filter(t => t.assignedTo === filterUser) : tasks

  return (
    <>
      {/* Filter bar */}
      {users.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.05em' }}>FILTRER :</span>
          <button
            onClick={() => setFilterUser('')}
            style={{
              padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: !filterUser ? 700 : 400,
              background: !filterUser ? 'var(--accent-bg)' : 'var(--bg-2)',
              color: !filterUser ? 'var(--accent)' : 'var(--t2)',
              border: `1px solid ${!filterUser ? 'rgba(124,106,245,0.3)' : 'var(--border-s)'}`,
              cursor: 'pointer',
            }}
          >
            Tous
          </button>
          {users.map(u => (
            <button
              key={u.name}
              onClick={() => setFilterUser(v => v === u.name ? '' : u.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 10px 3px 4px', borderRadius: 100, fontSize: 11, fontWeight: filterUser === u.name ? 700 : 400,
                background: filterUser === u.name ? `${u.color}18` : 'var(--bg-2)',
                color: filterUser === u.name ? u.color : 'var(--t2)',
                border: `1px solid ${filterUser === u.name ? `${u.color}40` : 'var(--border-s)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                {u.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-scroll" style={{ minHeight: '60vh' }}>
          {COLUMNS.map(col => {
            const colTasks = visibleTasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} className="kanban-col" style={{ minWidth: 262, flex: '0 0 262px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{col.id}</span>
                  <span style={{ fontSize: 11, color: 'var(--t2)', background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 100, marginLeft: 'auto' }}>{colTasks.length}</span>
                  <button
                    onClick={() => setModal({ open: true, task: null, defaultStatus: col.id })}
                    style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title="Ajouter une tâche"
                  >+</button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snap) => (
                    <div
                      ref={provided.innerRef} {...provided.droppableProps}
                      style={{ minHeight: 200, padding: 4, borderRadius: 10, background: snap.isDraggingOver ? 'rgba(124,106,245,0.04)' : 'transparent', border: `1px dashed ${snap.isDraggingOver ? 'rgba(124,106,245,0.25)' : 'transparent'}`, transition: 'all 0.15s' }}
                    >
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{ ...prov.draggableProps.style, marginBottom: 8 }}>
                              <TaskCard
                                task={task}
                                isDragging={snap.isDragging}
                                onEdit={() => setModal({ open: true, task })}
                                onDelete={() => handleDelete(task.id)}
                                users={users}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && !snap.isDraggingOver && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t2)', fontSize: 12 }}>Vide</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <TaskModal
        isOpen={modal.open}
        task={modal.task}
        defaultStatus={modal.defaultStatus}
        onClose={() => setModal({ open: false })}
        onSaved={refresh}
      />
    </>
  )
}
