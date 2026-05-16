'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { CRMModal } from './CRMModal'
import { useCache } from '@/lib/useCache'
import { UserAvatar, useUsers } from './UserPicker'
import type { CRMEntry } from '@/lib/types'

const STAGES: { id: CRMEntry['status']; color: string }[] = [
  { id: 'À contacter',   color: '#6b7280' },
  { id: 'Contacté',      color: '#4f8ef7' },
  { id: 'RDV pris',      color: '#7c6af5' },
  { id: 'Offre envoyée', color: '#f59e0b' },
  { id: 'Client',        color: '#0ec98c' },
  { id: 'Refus',         color: '#f43f5e' },
]

const P_COLOR: Record<string, string> = { Haute: '#f43f5e', Moyenne: '#f59e0b', Basse: '#6b7280' }
const CANAL_ICON: Record<string, string> = { Email:'✉', Téléphone:'📞', Salon:'🏛', Terrain:'🚗', Recommandation:'🤝' }

function relTime(iso: string) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "à l'instant"
  if (d < 60) return `il y a ${d}m`
  if (d < 1440) return `il y a ${Math.floor(d/60)}h`
  return `il y a ${Math.floor(d/1440)}j`
}

function CRMCard({ entry, onEdit, onDelete, isDragging, users }: {
  entry: CRMEntry; onEdit: () => void; onDelete: () => void; isDragging: boolean
  users: { name: string; color: string }[]
}) {
  const [menu, setMenu] = useState(false)
  const pc = P_COLOR[entry.priority] || null
  const assignee = users.find(u => u.name === entry.assignedTo)

  return (
    <div style={{ background: isDragging ? 'var(--bg-3)' : 'var(--bg-1)', border: `1px solid ${isDragging ? 'rgba(124,106,245,0.5)' : 'var(--border-s)'}`, borderRadius: 10, padding: '11px 12px', boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : 'none', cursor: 'grab', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.enseigne || 'Sans nom'}</p>
            {pc && <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc, flexShrink: 0 }} />}
          </div>
          {entry.type && <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>{entry.type}</p>}
          {(entry.ville || entry.canal) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {entry.ville && <span style={{ fontSize: 11, color: 'var(--t1)' }}>📍 {entry.ville}</span>}
              {entry.canal && <span style={{ fontSize: 11, color: 'var(--t1)' }}>{CANAL_ICON[entry.canal] || '•'} {entry.canal}</span>}
            </div>
          )}
          {entry.contact && <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>👤 {entry.contact}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-s)' }}>
            {entry.nextFollowup && (
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>
                📅 {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(entry.nextFollowup))}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              {assignee && <UserAvatar name={assignee.name} color={assignee.color} size={18} />}
              {!assignee && entry.modifiedBy && (
                <span style={{ fontSize: 10, color: 'var(--t2)' }}>{entry.modifiedBy.split(' ')[0]}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setMenu(v => !v) }} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⋯</button>
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
    </div>
  )
}

export default function CRMPipeline() {
  const { data: fetchedEntries, loading, refresh } = useCache<CRMEntry[]>('/api/crm')
  const [entries, setEntries] = useState<CRMEntry[]>(fetchedEntries ?? [])
  const [modal, setModal] = useState<{ open: boolean; entry?: CRMEntry | null; defaultStatus?: CRMEntry['status'] }>({ open: false })
  const [filterUser, setFilterUser] = useState('')
  const users = useUsers()

  useEffect(() => {
    if (fetchedEntries) setEntries(fetchedEntries)
  }, [fetchedEntries])

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const newStatus = destination.droppableId as CRMEntry['status']
    const old = source.droppableId as CRMEntry['status']
    setEntries(prev => prev.map(e => e.id === draggableId ? { ...e, status: newStatus } : e))
    try {
      await fetch(`/api/crm/${draggableId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    } catch {
      setEntries(prev => prev.map(e => e.id === draggableId ? { ...e, status: old } : e))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce prospect ?')) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/crm/${id}`, { method: 'DELETE' })
  }

  if (loading) return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ minWidth: 230, flex: '0 0 230px' }}>
          <div className="skeleton" style={{ height: 16, width: 100, borderRadius: 6, marginBottom: 12 }} />
          {[1,2].map(j => <div key={j} className="skeleton" style={{ height: 90, borderRadius: 10, marginBottom: 8 }} />)}
        </div>
      ))}
    </div>
  )

  const visibleEntries = filterUser ? entries.filter(e => e.assignedTo === filterUser) : entries

  return (
    <>
      {users.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.05em' }}>FILTRER :</span>
          <button onClick={() => setFilterUser('')} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: !filterUser ? 700 : 400, background: !filterUser ? 'var(--accent-bg)' : 'var(--bg-2)', color: !filterUser ? 'var(--accent)' : 'var(--t2)', border: `1px solid ${!filterUser ? 'rgba(124,106,245,0.3)' : 'var(--border-s)'}`, cursor: 'pointer' }}>
            Tous
          </button>
          {users.map(u => (
            <button key={u.name} onClick={() => setFilterUser(v => v === u.name ? '' : u.name)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 4px', borderRadius: 100, fontSize: 11, fontWeight: filterUser === u.name ? 700 : 400, background: filterUser === u.name ? `${u.color}18` : 'var(--bg-2)', color: filterUser === u.name ? u.color : 'var(--t2)', border: `1px solid ${filterUser === u.name ? `${u.color}40` : 'var(--border-s)'}`, cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                {u.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: '60vh' }}>
          {STAGES.map(stage => {
            const stageEntries = visibleEntries.filter(e => e.status === stage.id)
            return (
              <div key={stage.id} style={{ minWidth: 232, flex: '0 0 232px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap' }}>{stage.id}</span>
                  <span style={{ fontSize: 11, color: 'var(--t2)', background: 'var(--bg-2)', padding: '1px 7px', borderRadius: 100, marginLeft: 'auto' }}>{stageEntries.length}</span>
                  <button
                    onClick={() => setModal({ open: true, entry: null, defaultStatus: stage.id })}
                    style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title="Ajouter un prospect"
                  >+</button>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided, snap) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: 200, padding: 4, borderRadius: 10, background: snap.isDraggingOver ? 'rgba(124,106,245,0.04)' : 'transparent', border: `1px dashed ${snap.isDraggingOver ? 'rgba(124,106,245,0.25)' : 'transparent'}`, transition: 'all 0.15s' }}>
                      {stageEntries.map((entry, idx) => (
                        <Draggable key={entry.id} draggableId={entry.id} index={idx}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{ ...prov.draggableProps.style, marginBottom: 8 }}>
                              <CRMCard entry={entry} isDragging={snap.isDragging} onEdit={() => setModal({ open: true, entry })} onDelete={() => handleDelete(entry.id)} users={users} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageEntries.length === 0 && !snap.isDraggingOver && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t2)', fontSize: 12 }}>Vide</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
      <CRMModal
        isOpen={modal.open}
        entry={modal.entry}
        defaultStatus={modal.defaultStatus}
        onClose={() => setModal({ open: false })}
        onSaved={refresh}
      />
    </>
  )
}
