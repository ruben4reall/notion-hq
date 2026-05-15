'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { Task } from '@/lib/types'

const COLUMNS = [
  { id: 'Backlog',  label: 'Backlog',  color: '#6b7280' },
  { id: 'À faire', label: 'À faire',  color: '#4f8ef7' },
  { id: 'En cours', label: 'En cours', color: '#7c6af5' },
  { id: 'Review',  label: 'Review',   color: '#f59e0b' },
  { id: 'Done',    label: 'Done',     color: '#0ec98c' },
]

const PRIORITY: Record<string, { color: string; bg: string }> = {
  P0: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  P1: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  P2: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const MODULE: Record<string, string> = {
  Produit: '#7c6af5',
  Marketing: '#f59e0b',
  Prospection: '#4f8ef7',
  Ops: '#0ec98c',
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d))
}

function TaskCard({ task, isDragging }: { task: Task; isDragging: boolean }) {
  const p = PRIORITY[task.priority] || PRIORITY.P2
  const mc = MODULE[task.module] || '#6b7280'

  return (
    <div style={{
      background: isDragging ? 'var(--bg-3)' : 'var(--bg-1)',
      border: `1px solid ${isDragging ? 'rgba(124,106,245,0.5)' : 'var(--border-s)'}`,
      borderRadius: 10,
      padding: '11px 12px',
      boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : 'none',
      cursor: 'grab',
      userSelect: 'none',
    }}>
      {(task.priority || task.module) && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
          {task.priority && (
            <span className="badge" style={{ color: p.color, background: p.bg }}>
              {task.priority}
            </span>
          )}
          {task.module && (
            <span className="badge" style={{ color: mc, background: `${mc}18` }}>
              {task.module}
            </span>
          )}
        </div>
      )}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)', lineHeight: 1.4 }}>
        {task.title || 'Sans titre'}
      </p>
      {task.description && (
        <p style={{
          fontSize: 11,
          color: 'var(--t1)',
          lineHeight: 1.5,
          marginTop: 5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {task.description}
        </p>
      )}
      {task.dateEnd && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--t2)',
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid var(--border-s)',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {fmtDate(task.dateEnd)}
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ minWidth: 256, flex: '0 0 256px' }}>
          <div className="skeleton" style={{ height: 16, width: 80, borderRadius: 6, marginBottom: 12 }} />
          {[1,2,3].map(j => (
            <div key={j} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error()
      setTasks(await res.json())
    } catch {
      setError('Impossible de charger les tâches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const newStatus = destination.droppableId as Task['status']
    const old = source.droppableId as Task['status']

    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t))

    try {
      await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: old } : t))
    }
  }

  if (loading) return <Skeleton />

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', color: 'var(--t1)' }}>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={load}>Réessayer</button>
    </div>
  )

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: '60vh' }}>
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id)
          return (
            <div key={col.id} style={{ minWidth: 256, flex: '0 0 256px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{col.label}</span>
                <span style={{
                  fontSize: 11, color: 'var(--t2)',
                  background: 'var(--bg-2)',
                  padding: '1px 7px', borderRadius: 100,
                  marginLeft: 'auto',
                }}>
                  {colTasks.length}
                </span>
              </div>
              {/* Drop zone */}
              <Droppable droppableId={col.id}>
                {(provided, snap) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200,
                      padding: 4,
                      borderRadius: 10,
                      background: snap.isDraggingOver ? 'rgba(124,106,245,0.04)' : 'transparent',
                      border: `1px dashed ${snap.isDraggingOver ? 'rgba(124,106,245,0.25)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {colTasks.map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            style={{ ...prov.draggableProps.style, marginBottom: 8 }}
                          >
                            <TaskCard task={task} isDragging={snap.isDragging} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snap.isDraggingOver && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t2)', fontSize: 12 }}>
                        Vide
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
