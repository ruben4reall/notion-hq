'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { CRMEntry } from '@/lib/types'

const STAGES = [
  { id: 'À contacter', color: '#6b7280' },
  { id: 'Contacté',    color: '#4f8ef7' },
  { id: 'RDV pris',   color: '#7c6af5' },
  { id: 'Offre envoyée', color: '#f59e0b' },
  { id: 'Client',     color: '#0ec98c' },
  { id: 'Refus',      color: '#f43f5e' },
]

const PRIORITY_COLOR: Record<string, string> = {
  Haute: '#f43f5e',
  Moyenne: '#f59e0b',
  Basse: '#6b7280',
}

const CANAL_ICON: Record<string, string> = {
  Email: '✉',
  Téléphone: '📞',
  Salon: '🏛',
  Terrain: '🚗',
  Recommandation: '🤝',
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d))
}

function CRMCard({ entry, isDragging }: { entry: CRMEntry; isDragging: boolean }) {
  const pc = PRIORITY_COLOR[entry.priority] || '#6b7280'

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.enseigne || 'Sans nom'}
          </p>
          {entry.type && (
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>{entry.type}</p>
          )}
        </div>
        {entry.priority && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc, flexShrink: 0, marginTop: 3 }} />
        )}
      </div>

      {/* Meta */}
      {(entry.ville || entry.canal) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {entry.ville && (
            <span style={{ fontSize: 11, color: 'var(--t1)' }}>📍 {entry.ville}</span>
          )}
          {entry.canal && (
            <span style={{ fontSize: 11, color: 'var(--t1)' }}>
              {CANAL_ICON[entry.canal] || '•'} {entry.canal}
            </span>
          )}
        </div>
      )}

      {entry.contact && (
        <p style={{ fontSize: 11, color: 'var(--t2)' }}>👤 {entry.contact}</p>
      )}

      {entry.nextFollowup && (
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
          Suivi : {fmtDate(entry.nextFollowup)}
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ minWidth: 230, flex: '0 0 230px' }}>
          <div className="skeleton" style={{ height: 16, width: 100, borderRadius: 6, marginBottom: 12 }} />
          {[1,2].map(j => (
            <div key={j} className="skeleton" style={{ height: 90, borderRadius: 10, marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function CRMPipeline() {
  const [entries, setEntries] = useState<CRMEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/crm')
      if (!res.ok) throw new Error()
      setEntries(await res.json())
    } catch {
      setError('Impossible de charger le CRM.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const newStatus = destination.droppableId as CRMEntry['status']
    const old = source.droppableId as CRMEntry['status']

    setEntries(prev => prev.map(e => e.id === draggableId ? { ...e, status: newStatus } : e))

    try {
      await fetch(`/api/crm/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      setEntries(prev => prev.map(e => e.id === draggableId ? { ...e, status: old } : e))
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
        {STAGES.map(stage => {
          const stageEntries = entries.filter(e => e.status === stage.id)
          return (
            <div key={stage.id} style={{ minWidth: 230, flex: '0 0 230px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap' }}>{stage.id}</span>
                <span style={{
                  fontSize: 11, color: 'var(--t2)',
                  background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 100, marginLeft: 'auto',
                }}>
                  {stageEntries.length}
                </span>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snap) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200, padding: 4, borderRadius: 10,
                      background: snap.isDraggingOver ? 'rgba(124,106,245,0.04)' : 'transparent',
                      border: `1px dashed ${snap.isDraggingOver ? 'rgba(124,106,245,0.25)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {stageEntries.map((entry, idx) => (
                      <Draggable key={entry.id} draggableId={entry.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            style={{ ...prov.draggableProps.style, marginBottom: 8 }}
                          >
                            <CRMCard entry={entry} isDragging={snap.isDragging} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stageEntries.length === 0 && !snap.isDraggingOver && (
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
