'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Suspense } from 'react'
import { useCache } from '@/lib/useCache'
import { useLanguage } from '@/context/LanguageContext'
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
const DAYS_FULL = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']

type CalView = 'month' | 'week' | 'day'

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekStart(d: Date): Date {
  const dow = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - dow)
  return start
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

type ModalState = { open: boolean; date?: string; event?: CalendarEvent | null }

function EventModal({ state, onClose, onSaved, currentUser }: {
  state: ModalState; onClose: () => void; onSaved: () => void; currentUser: string
}) {
  const { t } = useLanguage()
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
  const dateError = dateEnd && dateStart && dateEnd < dateStart

  const handleSave = async () => {
    if (!title.trim()) return
    if (dateError) return
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
    if (!isEdit || !confirm(t('deleteEventConfirm'))) return
    await fetch(`/api/events/${state.event!.id}`, { method: 'DELETE' })
    onSaved()
    onClose()
  }

  return (
    <Modal isOpen={state.open} onClose={onClose} title={isEdit ? t('editEvent') : t('newEvent')} maxWidth={440}>
      <Field label={t('eventTitle')}>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('eventTitlePlaceholder')} autoFocus />
      </Field>
      <Field label={t('eventType')}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['RDV','Réunion','Appel','Deadline','Autre'] as const).map(tp => (
            <button key={tp} type="button" onClick={() => setType(tp)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: type === tp ? 700 : 400,
              background: type === tp ? `${TYPE_COLOR[tp]}22` : 'var(--bg-2)',
              color: type === tp ? TYPE_COLOR[tp] : 'var(--t1)',
              border: `1px solid ${type === tp ? TYPE_COLOR[tp] : 'var(--border-s)'}`,
              cursor: 'pointer',
            }}>{tp}</button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={t('eventStart')}>
          <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </Field>
        <Field label={t('eventEnd')}>
          <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
            style={{ borderColor: dateError ? 'var(--red)' : undefined }} />
        </Field>
      </div>
      {dateError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: -8, marginBottom: 10 }}>{t('dateEndError')}</p>}
      <Field label={t('eventNotes')}>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes…" rows={3} />
      </Field>
      <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-s)', justifyContent: 'space-between' }}>
        {isEdit && (
          <button type="button" onClick={handleDelete} className="btn" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
            {t('delete')}
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">{t('cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving || !title.trim() || !!dateError} className="btn btn-primary" style={{ opacity: saving || !title.trim() || !!dateError ? 0.6 : 1 }}>
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

type DayItems = {
  dayTasks: Task[]
  dayEvents: CalendarEvent[]
  dayExternal: CalendarEvent[]
}

type ItemChip = { title: string; color: string; isTask: boolean; isExternal: boolean; event?: CalendarEvent }

function buildChips(items: DayItems): ItemChip[] {
  return [
    ...items.dayEvents.map(e => ({
      title: e.title || '',
      color: TYPE_COLOR[e.type] || '#6b7280',
      isTask: false, isExternal: false, event: e,
    })),
    ...items.dayTasks.map(tk => ({
      title: tk.title || '',
      color: STATUS_COLOR[tk.status] || '#6b7280',
      isTask: true, isExternal: false,
    })),
    ...items.dayExternal.map(e => ({
      title: e.title || '',
      color: '#12c98a',
      isTask: false, isExternal: true,
    })),
  ]
}

function EventChip({ chip, onClick, small }: { chip: ItemChip; onClick?: () => void; small?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        fontSize: small ? 9 : 11, padding: small ? '2px 4px' : '3px 7px', borderRadius: small ? 3 : 5,
        background: `${chip.color}22`, color: chip.color,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        borderLeft: `2px solid ${chip.color}`,
        cursor: (!chip.isTask && !chip.isExternal && onClick) ? 'pointer' : 'default',
      }}
    >
      {chip.isExternal ? '◆ ' : ''}{chip.title}
    </div>
  )
}

function MonthView({ year, month, items, todayStr, setModal, moreLabel }: {
  year: number; month: number
  items: (dateStr: string) => DayItems
  todayStr: string
  setModal: (s: ModalState) => void
  moreLabel: (n: number) => string
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-s)' }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((dayNum, idx) => {
          if (!dayNum) return (
            <div key={`e-${idx}`} style={{ minHeight: 90, borderRight: '1px solid var(--border-s)', borderBottom: '1px solid var(--border-s)', background: 'var(--bg-0)', opacity: 0.3 }} />
          )
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
          const isToday = dateStr === todayStr
          const isWeekend = (idx % 7) >= 5
          const chips = buildChips(items(dateStr))

          return (
            <div
              key={dayNum}
              onClick={() => setModal({ open: true, date: dateStr })}
              style={{
                minHeight: 90, padding: '6px 4px',
                borderRight: '1px solid var(--border-s)', borderBottom: '1px solid var(--border-s)',
                background: isToday ? 'rgba(124,106,245,0.05)' : isWeekend ? 'rgba(0,0,0,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(124,106,245,0.1)' : 'var(--bg-2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(124,106,245,0.05)' : isWeekend ? 'rgba(0,0,0,0.08)' : 'transparent' }}
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
                {chips.slice(0, 3).map((chip, i) => (
                  <EventChip key={i} chip={chip} small onClick={!chip.isTask && !chip.isExternal ? () => setModal({ open: true, event: chip.event }) : undefined} />
                ))}
                {chips.length > 3 && <span style={{ fontSize: 9, color: 'var(--t2)', paddingLeft: 4 }}>{moreLabel(chips.length - 3)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function WeekView({ weekStart, items, todayStr, setModal }: {
  weekStart: Date
  items: (dateStr: string) => DayItems
  todayStr: string
  setModal: (s: ModalState) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {days.map((d, i) => {
        const dateStr = isoDate(d)
        const isToday = dateStr === todayStr
        const isWeekend = i >= 5
        const chips = buildChips(items(dateStr))

        return (
          <div key={dateStr} style={{ borderRight: i < 6 ? '1px solid var(--border-s)' : 'none', minHeight: 160 }}>
            <div
              onClick={() => setModal({ open: true, date: dateStr })}
              style={{
                padding: '10px 8px', borderBottom: '1px solid var(--border-s)',
                background: isToday ? 'rgba(124,106,245,0.06)' : isWeekend ? 'rgba(0,0,0,0.04)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.04em', marginBottom: 4 }}>
                {DAYS_FR[i]}
              </p>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? 'var(--accent)' : 'transparent',
                fontSize: 14, fontWeight: isToday ? 700 : 500,
                color: isToday ? 'white' : isWeekend ? 'var(--t2)' : 'var(--t0)',
              }}>
                {d.getDate()}
              </div>
            </div>

            <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {chips.map((chip, ci) => (
                <EventChip
                  key={ci} chip={chip}
                  onClick={!chip.isTask && !chip.isExternal ? () => setModal({ open: true, event: chip.event }) : undefined}
                />
              ))}
              {chips.length === 0 && (
                <div
                  onClick={() => setModal({ open: true, date: dateStr })}
                  style={{ height: 48, cursor: 'pointer', borderRadius: 6, border: '1px dashed var(--border-s)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: 16, color: 'var(--t2)', opacity: 0.5 }}>+</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({ date, items, setModal, noEventsLabel, addEventLabel }: {
  date: Date
  items: (dateStr: string) => DayItems
  setModal: (s: ModalState) => void
  noEventsLabel: string
  addEventLabel: string
}) {
  const dateStr = isoDate(date)
  const { dayTasks, dayEvents, dayExternal } = items(dateStr)

  const allItems: { title: string; color: string; label: string; event?: CalendarEvent }[] = [
    ...dayEvents.map(e => ({ title: e.title || '', color: TYPE_COLOR[e.type] || '#6b7280', label: e.type, event: e })),
    ...dayTasks.map(tk => ({ title: tk.title || '', color: STATUS_COLOR[tk.status] || '#6b7280', label: tk.status })),
    ...dayExternal.map(e => ({ title: e.title || '', color: '#12c98a', label: 'iCal' })),
  ]

  return (
    <div style={{ padding: '20px' }}>
      {allItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>📭</p>
          <p style={{ fontSize: 14, color: 'var(--t2)' }}>{noEventsLabel}</p>
          <button
            onClick={() => setModal({ open: true, date: dateStr })}
            style={{ marginTop: 16, padding: '9px 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {addEventLabel}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allItems.map((item, i) => (
            <div
              key={i}
              onClick={() => item.event && setModal({ open: true, event: item.event })}
              style={{
                padding: '14px 16px', borderRadius: 12,
                background: `${item.color}0d`, border: `1px solid ${item.color}25`,
                borderLeft: `3px solid ${item.color}`,
                cursor: item.event ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t0)' }}>{item.title}</p>
                <p style={{ fontSize: 11, color: item.color, marginTop: 2, fontWeight: 500 }}>{item.label}</p>
              </div>
              {item.event && <span style={{ fontSize: 12, color: 'var(--t2)' }}>›</span>}
            </div>
          ))}
          <button
            onClick={() => setModal({ open: true, date: dateStr })}
            style={{ padding: '9px', borderRadius: 10, border: '1px dashed var(--border-m)', background: 'transparent', color: 'var(--t2)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}
          >
            {addEventLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function CalendarContent() {
  const { user: session } = useAuth()
  const { t } = useLanguage()
  const { data: fetchedTasks, loading: tasksLoading, refresh: refreshTasks } = useCache<Task[]>('/api/tasks')
  const { data: fetchedEvents, loading: eventsLoading, refresh: refreshEvents } = useCache<CalendarEvent[]>('/api/events')
  const [tasks, setTasks] = useState<Task[]>(fetchedTasks ?? [])
  const [events, setEvents] = useState<CalendarEvent[]>(fetchedEvents ?? [])
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([])
  const [externalConnected, setExternalConnected] = useState(false)
  const loading = tasksLoading || eventsLoading
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [view, setView] = useState<CalView>(() => {
    if (typeof window === 'undefined') return 'month'
    return (localStorage.getItem('cal_view') as CalView) || 'month'
  })
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
  const [selectedDate, setSelectedDate] = useState(today)

  useEffect(() => { if (fetchedTasks) setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []) }, [fetchedTasks])
  useEffect(() => { if (fetchedEvents) setEvents(Array.isArray(fetchedEvents) ? fetchedEvents : []) }, [fetchedEvents])

  const load = useCallback(async () => {
    refreshTasks()
    refreshEvents()
    const extRes = await fetch('/api/calendar/import').then(r => r.ok ? r.json() : { events: [], connected: false }).catch(() => ({ events: [], connected: false }))
    setExternalEvents(Array.isArray(extRes?.events) ? extRes.events : [])
    setExternalConnected(extRes?.connected || false)
  }, [refreshTasks, refreshEvents])

  useEffect(() => {
    fetch('/api/calendar/import').then(r => r.ok ? r.json() : { events: [], connected: false }).catch(() => ({ events: [], connected: false })).then(extRes => {
      setExternalEvents(Array.isArray(extRes?.events) ? extRes.events : [])
      setExternalConnected(extRes?.connected || false)
    })
  }, [])

  const getItemsForDay = useCallback((dateStr: string): DayItems => {
    const dayTasks = showTasks ? tasks.filter(tk => {
      if (!tk.dateStart && !tk.dateEnd) return false
      const start = tk.dateStart || tk.dateEnd
      const end = tk.dateEnd || tk.dateStart
      return dateStr >= start && dateStr <= end
    }) : []
    const dayEvents = events.filter(e => {
      if (!e.dateStart) return false
      const start = e.dateStart
      const end = e.dateEnd || e.dateStart
      return dateStr >= start && dateStr <= end
    })
    const dayExternal = showExternal ? externalEvents.filter(e => {
      if (!e.dateStart) return false
      const start = e.dateStart
      const end = e.dateEnd || e.dateStart
      return dateStr >= start && dateStr <= end
    }) : []
    return { dayTasks, dayEvents, dayExternal }
  }, [tasks, events, externalEvents, showTasks, showExternal])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }
  const weekStart = getWeekStart(selectedDate)

  const navigatePrev = () => {
    if (view === 'month') prevMonth()
    else if (view === 'week') setSelectedDate(d => addDays(d, -7))
    else setSelectedDate(d => addDays(d, -1))
  }
  const navigateNext = () => {
    if (view === 'month') nextMonth()
    else if (view === 'week') setSelectedDate(d => addDays(d, 7))
    else setSelectedDate(d => addDays(d, 1))
  }
  const goToday = () => {
    const td = new Date()
    setYear(td.getFullYear()); setMonth(td.getMonth()); setSelectedDate(td)
  }

  const setViewPersisted = (v: CalView) => {
    setView(v)
    try { localStorage.setItem('cal_view', v) } catch {}
  }

  const todayStr = isoDate(today)
  const icalUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/calendar.ics` : '/api/calendar.ics'

  function getHeaderLabel() {
    if (view === 'month') return `${MONTHS_FR[month]} ${year}`
    if (view === 'week') {
      const ws = getWeekStart(selectedDate)
      const we = addDays(ws, 6)
      if (ws.getMonth() === we.getMonth()) return `${ws.getDate()}–${we.getDate()} ${MONTHS_FR[ws.getMonth()]} ${ws.getFullYear()}`
      return `${ws.getDate()} ${MONTHS_FR[ws.getMonth()]} – ${we.getDate()} ${MONTHS_FR[we.getMonth()]} ${we.getFullYear()}`
    }
    const dow = (selectedDate.getDay() + 6) % 7
    return `${DAYS_FULL[dow]} ${selectedDate.getDate()} ${MONTHS_FR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }

  const viewLabels: Record<CalView, string> = {
    month: t('month'),
    week: t('week'),
    day: t('day'),
  }

  if (loading) return (
    <div className="page-container">
      <div className="skeleton" style={{ height: 500, borderRadius: 12 }} />
    </div>
  )

  return (
    <div className="page-container animate-in">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{t('calendar')}</h1>
            <p className="page-subtitle">{t('calendarSubtitle')}</p>
          </div>
          <button onClick={() => setModal({ open: true, date: todayStr })} style={{
            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            {t('addEventBtn')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={icalUrl} target="_blank" rel="noreferrer" style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: 'var(--bg-2)', color: 'var(--t1)', border: '1px solid var(--border-m)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {t('exportICal')}
          </a>
          {externalConnected ? (
            <div style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(18,201,138,0.3)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              {t('icalConnected')}
            </div>
          ) : (
            <a href="/settings?section=calendar" style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'var(--bg-2)', color: 'var(--t1)', border: '1px solid var(--border-m)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {t('connectCalendar')}
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>{t('showLabel')}</span>
          <button onClick={() => setShowTasks(v => { localStorage.setItem('cal_showTasks', String(!v)); return !v })} style={{
            padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: showTasks ? 700 : 400,
            background: showTasks ? 'rgba(124,106,245,0.15)' : 'var(--bg-2)',
            color: showTasks ? 'var(--accent)' : 'var(--t2)',
            border: `1px solid ${showTasks ? 'rgba(124,106,245,0.3)' : 'var(--border-s)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
            {t('tasksLabel')}
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
              {t('externalCalendar')}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 9, padding: 3, gap: 2 }}>
          {(['month','week','day'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => setViewPersisted(v)}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: view === v ? 'var(--bg-0)' : 'transparent',
                color: view === v ? 'var(--t0)' : 'var(--t2)',
                border: view === v ? '1px solid var(--border-s)' : '1px solid transparent',
                boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>

      <div data-tour="calendar-grid" className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-s)', gap: 12 }}>
          <button onClick={navigatePrev} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>{getHeaderLabel()}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={goToday} style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(124,106,245,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              {t('today')}
            </button>
            <button onClick={navigateNext} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-s)', color: 'var(--t1)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
        </div>

        {view === 'month' && (
          <MonthView year={year} month={month} items={getItemsForDay} todayStr={todayStr} setModal={setModal} moreLabel={n => t('moreItems', { n })} />
        )}
        {view === 'week' && (
          <WeekView weekStart={weekStart} items={getItemsForDay} todayStr={todayStr} setModal={setModal} />
        )}
        {view === 'day' && (
          <DayView date={selectedDate} items={getItemsForDay} setModal={setModal} noEventsLabel={t('noEventsDay')} addEventLabel={t('addEventAction')} />
        )}
      </div>

      <div className="card" style={{ marginTop: 20, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 10 }}>{t('calendarSubscription')}</p>
        <p style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 12, lineHeight: 1.6 }}>
          Copiez cette URL dans Google Calendar → "Autres agendas" → "Via une URL" ou dans Apple Calendar → Fichier → Nouvel abonnement.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-3)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border-s)' }}>
          <code style={{ fontSize: 11, color: 'var(--accent)', flex: 1, wordBreak: 'break-all' }}>{icalUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(icalUrl)}
            style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(124,106,245,0.2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}
          >
            {t('copy')}
          </button>
        </div>
      </div>

      <EventModal state={modal} onClose={() => setModal({ open: false })} onSaved={load} currentUser={session?.name ?? ''} />
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
