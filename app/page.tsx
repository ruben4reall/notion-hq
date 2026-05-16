'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useCache } from '@/lib/useCache'
import { useLanguage } from '@/context/LanguageContext'
import type { KPIData, Task } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  Backlog:  'var(--t2)',
  'À faire':'var(--blue)',
  'En cours':'var(--accent)',
  Review:   'var(--amber)',
  Done:     'var(--green)',
}

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'var(--red)', P1: 'var(--amber)', P2: 'var(--t2)',
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-US', zh: 'zh-CN' }

function fmtDate(d: string, locale: string) {
  if (!d) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(d))
}

function KPICard({
  label, value, sub, color, icon, badge,
}: {
  label: string
  value: number | string
  sub?: string
  color: string
  icon: React.ReactNode
  badge?: { text: string; positive: boolean }
}) {
  return (
    <div className="card animate-in" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `${color}0d`,
      }} />
      {badge && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 10, fontWeight: 700,
          color: badge.positive ? '#0ec98c' : '#f43f5e',
          background: badge.positive ? 'rgba(14,201,140,0.1)' : 'rgba(244,63,94,0.1)',
          padding: '2px 6px', borderRadius: 6,
        }}>
          {badge.positive ? '▲' : '▼'} {badge.text}
        </span>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, color,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', marginTop: 6 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function TaskRow({ task, highlight, noTitle }: { task: Task; highlight?: 'overdue' | 'today'; noTitle: string }) {
  const { lang } = useLanguage()
  const locale = LOCALE_MAP[lang] || 'fr-FR'
  const sc = STATUS_COLORS[task.status] || '#6b7280'
  const pc = PRIORITY_COLOR[task.priority] || '#6b7280'
  const dateColor = highlight === 'overdue' ? '#f43f5e' : highlight === 'today' ? '#f59e0b' : 'var(--t2)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid var(--border-s)',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: highlight === 'overdue' ? '#f43f5e' : sc, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title || noTitle}
        </p>
        <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>
          {task.module}{task.module && task.assignedTo ? ' · ' : ''}{task.assignedTo ? task.assignedTo.split(' ')[0] : ''}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {task.priority && (
          <span style={{ fontSize: 10, fontWeight: 600, color: pc }}>{task.priority}</span>
        )}
        {task.dateEnd && (
          <span style={{ fontSize: 11, color: dateColor, fontWeight: highlight ? 600 : 400 }}>{fmtDate(task.dateEnd, locale)}</span>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--t1)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '0' }}>
      <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: 160, borderRadius: 6, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 12 }} />
    </div>
  )
}

const KPI_IDS = ['tasks', 'prospects', 'clients', 'ideas'] as const
type KpiId = typeof KPI_IDS[number]

function loadLayout(): { kpiOrder: KpiId[]; sidebarLeft: boolean } {
  if (typeof window === 'undefined') return { kpiOrder: [...KPI_IDS], sidebarLeft: false }
  try {
    const raw = localStorage.getItem('_dash_layout')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { kpiOrder: [...KPI_IDS], sidebarLeft: false }
}
function saveLayout(v: { kpiOrder: KpiId[]; sidebarLeft: boolean }) {
  try { localStorage.setItem('_dash_layout', JSON.stringify(v)) } catch {}
}

export default function DashboardPage() {
  const { user: session } = useAuth()
  const { t, lang } = useLanguage()
  const { data, loading } = useCache<KPIData>('/api/kpis', { ttl: 30_000 })
  const [editMode, setEditMode] = useState(false)
  const [kpiOrder, setKpiOrder] = useState<KpiId[]>(() => loadLayout().kpiOrder)
  const [sidebarLeft, setSidebarLeft] = useState(() => loadLayout().sidebarLeft)

  useEffect(() => { saveLayout({ kpiOrder, sidebarLeft }) }, [kpiOrder, sidebarLeft])

  const firstName = session?.name?.split(' ')[0] ?? ''
  const locale = LOCALE_MAP[lang] || 'fr-FR'
  const todayLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  const moveKpi = (idx: number, dir: -1 | 1) => {
    const next = [...kpiOrder]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setKpiOrder(next)
  }

  if (loading) return <div className="page-container"><Skeleton /></div>
  if (!data) return null

  const tasksByStatus = data.tasksByStatus as Record<string, number>

  const kpiDefs: Record<KpiId, React.ReactNode> = {
    tasks: (
      <KPICard
        label={t('kpiTasksLabel')}
        value={data.tasksInProgress}
        sub={`${data.completionRate}% · ${data.tasksLast24h > 0 ? `+${data.tasksLast24h} ${t('today')}` : `/ ${data.totalTasks}`}`}
        color="#7c6af5"
        badge={data.tasksDelta !== 0 ? { text: `${Math.abs(data.tasksDelta)}%`, positive: data.tasksDelta > 0 } : undefined}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
      />
    ),
    prospects: (
      <KPICard
        label={t('kpiProspectsLabel')}
        value={data.activeProspects}
        sub={t('kpiCrmProgress')}
        color="#4f8ef7"
        badge={data.crmConversionRate > 0 ? { text: `${data.crmConversionRate}%`, positive: data.crmConversionRate >= 20 } : undefined}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
      />
    ),
    clients: (
      <KPICard
        label={t('kpiClientsLabel')}
        value={data.signedClients}
        sub={`/ ${data.totalCRM}`}
        color="#0ec98c"
        badge={data.completedLast24h > 0 ? { text: `+${data.completedLast24h} 24h`, positive: true } : undefined}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      />
    ),
    ideas: (
      <KPICard
        label={t('kpiIdeasLabel')}
        value={data.validatedIdeas}
        sub={`${data.taskVelocity} ${t('taskPerDayShort')}`}
        color="#f59e0b"
        badge={data.totalIdeas > 0 ? { text: `${Math.round((data.validatedIdeas/data.totalIdeas)*100)}%`, positive: data.validatedIdeas > 0 } : undefined}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.686 2 6 4.686 6 8c0 2.21 1.118 4.156 2.83 5.315C9.517 13.867 10 14.612 10 15.5V16h4v-.5c0-.888.483-1.633 1.17-2.185C16.882 12.156 18 10.21 18 8c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 19h4M9.5 22h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      />
    ),
  }

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p className="section-title" style={{ margin: 0 }}>{t('pipelineTasks')}</p>
          <Link href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>→</Link>
        </div>
        <ProgressBar label={t('statusBacklog')} value={tasksByStatus['Backlog'] || 0}  total={data.totalTasks} color="#6b7280" />
        <ProgressBar label={t('todo')}         value={tasksByStatus['À faire'] || 0}  total={data.totalTasks} color="#4f8ef7" />
        <ProgressBar label={t('inProgress')}   value={tasksByStatus['En cours'] || 0} total={data.totalTasks} color="#7c6af5" />
        <ProgressBar label={t('inReview')}     value={tasksByStatus['Review'] || 0}   total={data.totalTasks} color="#f59e0b" />
        <ProgressBar label={t('done')}         value={tasksByStatus['Done'] || 0}     total={data.totalTasks} color="#0ec98c" />
      </div>
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p className="section-title" style={{ margin: 0 }}>{t('topIdeas')}</p>
          <Link href="/ideas" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>→</Link>
        </div>
        {data.topIdeas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: '10px 0' }}>{t('noIdeasShort')}</p>
        ) : data.topIdeas.map(idea => (
          <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-s)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', minWidth: 24, textAlign: 'center' }}>{idea.votes}</span>
            <p style={{ fontSize: 12, color: 'var(--t0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.title || t('noTitle')}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const recentTasks = (
    <div data-tour="recent-tasks" className="card lg:col-span-2" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="section-title" style={{ margin: 0 }}>{t('recentTasksLabel')}</p>
        <Link href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>{t('viewKanban')}</Link>
      </div>
      {data.recentTasks.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: '20px 0' }}>{t('noTasks')}</p>
      ) : data.recentTasks.map(tk => <TaskRow key={tk.id} task={tk} noTitle={t('noTitle')} />)}
    </div>
  )

  return (
    <div className="page-container animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">{t('greeting')}{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{todayLabel}</p>
        </div>
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: editMode ? 'var(--accent)' : 'var(--bg-2)',
            color: editMode ? 'white' : 'var(--t2)',
            border: `1px solid ${editMode ? 'var(--accent)' : 'var(--border-s)'}`,
            flexShrink: 0, marginTop: 4,
          }}
        >
          {editMode ? t('doneBtn') : t('customizeBtn')}
        </button>
      </div>

      {editMode && (
        <div style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--t1)' }}>
          {t('customizeHint')}
        </div>
      )}

      {data.overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <p style={{ fontSize: 13, color: '#f43f5e', fontWeight: 500 }}>{data.overdueCount} {t('overdueLabel').toLowerCase()}</p>
          <a href="/kanban" style={{ marginLeft: 'auto', fontSize: 12, color: '#f43f5e', textDecoration: 'none', opacity: 0.8 }}>{t('viewKanban')}</a>
        </div>
      )}

      {/* KPIs */}
      <div data-tour="kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {kpiOrder.map((id, idx) => (
          <div key={id} style={{ position: 'relative' }}>
            {editMode && (
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 3 }}>
                <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border-m)', background: 'var(--bg-1)', color: 'var(--t1)', fontSize: 11, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>←</button>
                <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border-m)', background: 'var(--bg-1)', color: 'var(--t1)', fontSize: 11, cursor: idx === kpiOrder.length - 1 ? 'default' : 'pointer', opacity: idx === kpiOrder.length - 1 ? 0.3 : 1 }}>→</button>
              </div>
            )}
            {kpiDefs[id]}
          </div>
        ))}
      </div>

      {/* Urgent tasks */}
      {(() => {
        const myUrgent = data.urgentTasks.filter(tk => !session?.name || tk.assignedTo === session.name || tk.assignedTo === '')
        if (myUrgent.length === 0) return null
        const todayStr = new Date().toISOString().slice(0, 10)
        return (
          <div className="card" style={{ padding: '20px', marginBottom: 20, borderColor: 'rgba(244,63,94,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="section-title" style={{ margin: 0, color: '#f43f5e' }}>{t('urgentToday')}</p>
              <a href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>{t('viewKanban')}</a>
            </div>
            {myUrgent.map(tk => (
              <TaskRow key={tk.id} task={tk} highlight={tk.dateEnd < todayStr ? 'overdue' : 'today'} noTitle={t('noTitle')} />
            ))}
          </div>
        )
      })()}

      {editMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={() => setSidebarLeft(v => !v)}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--bg-2)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
          >
            {t('invertColumns')}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sidebarLeft ? (
          <>
            <div>{sidebar}</div>
            {recentTasks}
          </>
        ) : (
          <>
            {recentTasks}
            <div>{sidebar}</div>
          </>
        )}
      </div>

    </div>
  )
}
