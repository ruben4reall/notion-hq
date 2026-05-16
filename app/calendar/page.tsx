'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Suspense } from 'react'
import type { Task, CalendarEvent } from '@/lib/types'
import { Modal, Field, Input, Textarea } from '@/components/Modal'

const TYPE_COLOR: Record<string, string> = {
  RDV:      '#4f8ef7',
  Réunion:  '#7c6af5',
  Appel:    '#0ec98c',
  Deadline: '#f43f5e',
  Autre:    '#6b7280',
}
const STATUS_COLOR: Record<string, string> = {
  Backlog:    '#6b7280',
  'À faire':  '#4f8ef7',
  'En cours': '#7c6af5',
  Review:     '#f59e0b',
  Done:       '#0ec98c',
}
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

type ModalState = { open: boolean; date?: string; event?: CalendarEvent | null }

function EventModal({ state, onClose, onSaved, currentUser }: {
  state: ModalState
  onClose: () => void
  onSaved: () => void
  currentUser: string
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<CalendarEvent['type']>('RDV')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (state.event) {
      setTitle(state.event.title)
      setType(state.event.type)
      setDateStart(state.event.dateStart)
      setDateEnd(state.event.dateEnd)
      setDescription(state.event.description)
    } else {
      setTitle('')
      setType('RDV')
      setDateStart(state.date || '')
      setDateEnd(state.date || '')
      setDescription('')
    }
  }, [state])

  const isEdit = !!state.event

  const handleSave = async () => {
    if (!title.trim()) return
    if (dateEnd && dateStart && dateEnd < dateStart) return
    setSaving(true)
    const body = { title, type, dateStart, dateEnd, description, modifiedBy: currentUser }
    if (isEdit) {
      await fetch(`/api/events/${state.event!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!isEdit || !confirm('Supprimer cet évènement ?')) return
    await fetch(`/api/events/${state.event!.id}`, { method: 'DELETE' })
    onSaved()
    onClose()
  }

  const dateError = dateEnd && dateStart && dateEnd < dateStart

  return (
    <Modal isOpen={state.open} onClose={onClose} title={isEdit ? "Modifier l'évènement" : 'Nouvel évènement'} maxWidth={440}>
      <Field label="Titre">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom de l'évènement" autoFocus />
      </Field>

      <Field label="Type">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['RDV','Réunion','Appel','Deadline','Autre'] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: type === t ? 700 : 400,
              background: type === t ? `${TYPE_COLOR[t]}22` : 'var(--bg-2)',
              color: type === t ? TYPE_COLOR[t] : 'var(--t1)',
              border: `1px solid ${type === t ? TYPE_COLOR[t] : 'var(--border-s)'}`,
              cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Début">
          <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </Field>
        <Field label="Fin">
          <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
            style={{ borderColor: dateError ? 'var(--red)' : undefined }} />
        </Field>
      </div>
      {dateError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: -8, marginBottom: 10 }}>La date de fin doit être après le début.</p>}

      <Field label="Description">
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes…" rows={3} />
      </Field>

      <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-s)', justifyContent: 'space-between' }}>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="btn" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
            Supprimer
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button type="button" onClick={handleSave} disabled={saving || !title.trim() || !!dateError} className="btn btn-primary" style={{ opacity: saving || !title.trim() || !!dateError ? 0.6 : 1 }}>
            {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CalendarContent() {
  const { user: session } = useAuth()

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([])
  const [externalConnected, setExternalConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [showExternal, setShowExternal] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('cal_showExternal') !== 'false'
  })
  const [showTasks, setShowTasks] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('cal_showTasks') !== 'false'
  })

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const load = useCallback(async () => {
    setLoading(true)
    const [taskRes, eventRes, extRes] = await Promise.all([
      fetch('/api/tasks').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/events').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/calendar/import').then(r => r.ok ? r.json() : { events: [], connected: false }).catch(() => ({ events: [], connected: false })),
    ])
    setTasks(Array.isArray(taskRes) ? taskRes : [])
    setEvents(Array.isArray(eventRes) ? eventRes : [])
    setExternalEvents(Array.isArray(extRes?.events) ? extRes.events : [])
    setExternalConnected(extRes?.connected || false)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday = 0
  const totalDays = lastDay.getDate()

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function getItemsForDay(dayNum: number) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`

    const dayTasks = showTasks
      ? tasks.filter(t => {
          if (!t.dateStart && !t.dateEnd) return false
          const start = t.dateStart || t.dateEnd
          const end = t.dateEnd || t.dateStart
          return dateStr >= start && dateStr <= end
        })
      : []

    const dayEvents = events.filter(e => {
      if (!e.dateStart) return false
      const start = e.dateStart
      const end = e.dateEnd || e.dateStart
      return dateStr >= start && dateStr <= end
    })

    const dayExternal = showExternal
      ? externalEvents.filter(e => {
          if (!e.dateStart) return false
          const start = e.dateStart
          const end = e.dateEnd || e.dateStart
          return dateStr >= start && dateStr <= end
        })
      : []

    return { dayTasks, dayEvents, dayExternal }
  }

  const todayStr = isoDate(today)

  const icalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/calendar.ics`
    : '/api/calendar.ics'

  if (loading) return (
    <div className="page-container">
      <div className="skeleton" style={{ height: 500, borderRadius: 12 }} />
    </div>
  )

  return (
    <div className="page-container animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Calendrier</h1>
          <p className="page-subtitle">Tâches, RDV et évènements</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* iCal export */}
          <a href={icalUrl} target="_blank" rel="noreferrer" style={{
            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: 'var(--bg-2)', color: 'var(--t1)',
            border: '1px solid var(--border-m)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Export iCal
          </a>

          {/* External calendar status */}
          {externalConnected ? (
            <div style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: 'var(--green-bg)', color: 'var(--green)',
              border: '1px solid rgba(18,201,138,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              iCal connecté
            </div>
          ) : (
            <a href="/settings" style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: 'var(--bg-2)', color: 'var(--t1)',
              border: '1px solid var(--border-m)', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Connecter un calendrier
            </a>
          )}

          <button onClick={() => setModal({ open: true, date: todayStr })} style={{
            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer',
          }}>
            + Évènement
          </button>
        </div>
      </div>

      {/* Filtres légende */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>AFFICHER :</span>
        <button onClick={() => setShowTasks(v => { localStorage.setItem('cal_showTasks', String(!v)); return !v })} style={{
          padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: showTasks ? 700 : 400,
          background: showTasks ? 'rgba(124,106,245,0.15)' : 'var(--bg-2)',
          color: showTasks ? 'var(--accent)' : 'var(--t2)',
          border: `1px solid ${showTasks ? 'rgba(124,106,245,0.3)' : 'var(--border-s)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
          Tâches
        </button>
        {externalConnected && (
          <button onClick={() => setShowExternal(v => { localStorage.setItem('cal_showExternal', String(!v)); return !v })} style={{
            padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: showExternal ? 700 : 400,
            background: showExternal ? 'var(--green-bg)' : 'var(--bg-2)',
            color: showExternal ? 'var(--green)' : 'var(--t2)',
            border: `1px solid ${showExternal ? 'rgba(18,201,138,0.3)' : 'var(--border-s)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Calendrier externe
          </button>
        )}
        {Object.entries(TYPE_COLOR).slice(0,4).map(([type, color]) => (
          <span key={type} style={{ fontSize: 11, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {type}
          </span>
        ))}
      </div>

      {/* Navigation mois */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-s)' }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>{MONTHS_FR[month]} {year}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }} style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(124,106,245,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Aujourd'hui
            </button>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-s)' }}>
          {DAYS_FR.map(d => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((dayNum, idx) => {
            if (!dayNum) return (
              <div key={`empty-${idx}`} style={{ minHeight: 90, borderRight: '1px solid var(--border-s)', borderBottom: '1px solid var(--border-s)', background: 'var(--bg-0)', opacity: 0.3 }} />
            )

            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
            const isToday = dateStr === todayStr
            const isWeekend = (idx % 7) >= 5
            const { dayTasks, dayEvents, dayExternal } = getItemsForDay(dayNum)
            const allItems = [...dayEvents, ...dayTasks.map(t => ({ ...t, source: 'task' })), ...dayExternal.map(g => ({ ...g, source: 'external' as const }))]

            return (
              <div
                key={dayNum}
                onClick={() => setModal({ open: true, date: dateStr })}
                style={{
                  minHeight: 90, padding: '6px 4px',
                  borderRight: '1px solid var(--border-s)',
                  borderBottom: '1px solid var(--border-s)',
                  background: isToday ? 'rgba(124,106,245,0.05)' : isWeekend ? 'rgba(0,0,0,0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(124,106,245,0.1)' : 'var(--bg-2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(124,106,245,0.05)' : isWeekend ? 'rgba(0,0,0,0.1)' : 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--accent)' : 'transparent',
                    color: isToday ? 'white' : isWeekend ? 'var(--t2)' : 'var(--t1)',
                  }}>
                    {dayNum}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', maxHeight: 60 }}>
                  {allItems.slice(0, 3).map((item, i) => {
                    const isGoogleItem = item.source === 'external'
                    const isTaskItem = 'status' in item && item.source !== 'external'
                    const color = isGoogleItem
                      ? '#12c98a'
                      : isTaskItem
                        ? STATUS_COLOR[(item as Task).status] || '#6b7280'
                        : TYPE_COLOR[(item as CalendarEvent).type] || '#6b7280'

                    return (
                      <div
                        key={i}
                        onClick={e => {
                          e.stopPropagation()
                          if (!isTaskItem && !isGoogleItem) {
                            setModal({ open: true, event: item as CalendarEvent })
                          }
                        }}
                        style={{
                          fontSize: 9, padding: '2px 4px', borderRadius: 3,
                          background: `${color}22`, color,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          borderLeft: `2px solid ${color}`,
                          cursor: isTaskItem || isGoogleItem ? 'default' : 'pointer',
                        }}
                      >
                        {isGoogleItem ? '◆ ' : ''}{(item as { title?: string }).title || 'Sans titre'}
                      </div>
                    )
                  })}
                  {allItems.length > 3 && (
                    <span style={{ fontSize: 9, color: 'var(--t2)', paddingLeft: 4 }}>+{allItems.length - 3} autres</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section iCal abonnement */}
      <div className="card" style={{ marginTop: 20, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 10 }}>
          Abonnement Calendrier
        </p>
        <p style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 12, lineHeight: 1.6 }}>
          Copiez cette URL dans Google Calendar → "Autres agendas" → "Via une URL" ou dans Apple Calendar → Fichier → Nouvel abonnement.
          Le calendrier se mettra à jour automatiquement avec vos tâches et évènements.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-3)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border-s)' }}>
          <code style={{ fontSize: 11, color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>
            {icalUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(icalUrl)}
            style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(124,106,245,0.2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}
          >
            Copier
          </button>
        </div>
      </div>

      <EventModal
        state={modal}
        onClose={() => setModal({ open: false })}
        onSaved={load}
        currentUser={session?.name ?? ''}
      />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarContent />
    </Suspense>
  )
}
