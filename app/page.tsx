'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useCache } from '@/lib/useCache'
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

function fmtDate(d: string) {
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d))
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

function TaskRow({ task, highlight }: { task: Task; highlight?: 'overdue' | 'today' }) {
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
          {task.title || 'Sans titre'}
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
          <span style={{ fontSize: 11, color: dateColor, fontWeight: highlight ? 600 : 400 }}>{fmtDate(task.dateEnd)}</span>
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

export default function DashboardPage() {
  const { user: session } = useAuth()
  const { data, loading } = useCache<KPIData>('/api/kpis', { ttl: 30_000 })

  const firstName = session?.name?.split(' ')[0] ?? ''

  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

  if (loading) return <div className="page-container"><Skeleton /></div>
  if (!data) return null

  const tasksByStatus = data.tasksByStatus as Record<string, number>

  return (
    <div className="page-container animate-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
      </div>

      {/* Urgent tasks banner */}
      {data.overdueCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <p style={{ fontSize: 13, color: '#f43f5e', fontWeight: 500 }}>
            {data.overdueCount} tâche{data.overdueCount > 1 ? 's' : ''} en retard
          </p>
          <a href="/kanban" style={{ marginLeft: 'auto', fontSize: 12, color: '#f43f5e', textDecoration: 'none', opacity: 0.8 }}>
            Voir Kanban →
          </a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <KPICard
          label="Tâches en cours"
          value={data.tasksInProgress}
          sub={`${data.completionRate}% complétées · ${data.tasksLast24h > 0 ? `+${data.tasksLast24h} aujourd'hui` : `sur ${data.totalTasks} total`}`}
          color="#7c6af5"
          badge={data.tasksDelta !== 0 ? { text: `${Math.abs(data.tasksDelta)}%`, positive: data.tasksDelta > 0 } : undefined}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          }
        />
        <KPICard
          label="Prospects actifs"
          value={data.activeProspects}
          sub="Contacté → Offre envoyée"
          color="#4f8ef7"
          badge={data.crmConversionRate > 0 ? { text: `${data.crmConversionRate}% conv.`, positive: data.crmConversionRate >= 20 } : undefined}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          }
        />
        <KPICard
          label="Clients signés"
          value={data.signedClients}
          sub={`sur ${data.totalCRM} prospects`}
          color="#0ec98c"
          badge={data.completedLast24h > 0 ? { text: `+${data.completedLast24h} 24h`, positive: true } : undefined}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />
        <KPICard
          label="Idées validées"
          value={data.validatedIdeas}
          sub={`vélocité ${data.taskVelocity} tâche/j`}
          color="#f59e0b"
          badge={data.totalIdeas > 0 ? { text: `${Math.round((data.validatedIdeas/data.totalIdeas)*100)}%`, positive: data.validatedIdeas > 0 } : undefined}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.686 2 6 4.686 6 8c0 2.21 1.118 4.156 2.83 5.315C9.517 13.867 10 14.612 10 15.5V16h4v-.5c0-.888.483-1.633 1.17-2.185C16.882 12.156 18 10.21 18 8c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 19h4M9.5 22h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          }
        />
      </div>

      {/* My urgent tasks */}
      {(() => {
        const myUrgent = data.urgentTasks.filter(t => !session?.name || t.assignedTo === session.name || t.assignedTo === '')
        if (myUrgent.length === 0) return null
        const todayStr = new Date().toISOString().slice(0, 10)
        return (
          <div className="card" style={{ padding: '20px', marginBottom: 20, borderColor: 'rgba(244,63,94,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="section-title" style={{ margin: 0, color: '#f43f5e' }}>Urgentes / Aujourd'hui</p>
              <a href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Kanban →</a>
            </div>
            {myUrgent.map(t => (
              <TaskRow key={t.id} task={t} highlight={t.dateEnd < todayStr ? 'overdue' : 'today'} />
            ))}
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Tasks */}
        <div className="card lg:col-span-2" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="section-title" style={{ margin: 0 }}>Tâches récentes</p>
            <Link href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Voir Kanban →
            </Link>
          </div>
          {data.recentTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: '20px 0' }}>Aucune tâche</p>
          ) : (
            data.recentTasks.map(t => <TaskRow key={t.id} task={t} />)
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline summary */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p className="section-title" style={{ margin: 0 }}>Pipeline tâches</p>
              <Link href="/kanban" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>→</Link>
            </div>
            <ProgressBar label="Backlog"  value={tasksByStatus['Backlog'] || 0}  total={data.totalTasks} color="#6b7280" />
            <ProgressBar label="À faire"  value={tasksByStatus['À faire'] || 0}  total={data.totalTasks} color="#4f8ef7" />
            <ProgressBar label="En cours" value={tasksByStatus['En cours'] || 0} total={data.totalTasks} color="#7c6af5" />
            <ProgressBar label="Review"   value={tasksByStatus['Review'] || 0}   total={data.totalTasks} color="#f59e0b" />
            <ProgressBar label="Done"     value={tasksByStatus['Done'] || 0}     total={data.totalTasks} color="#0ec98c" />
          </div>

          {/* Top ideas */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p className="section-title" style={{ margin: 0 }}>Top idées</p>
              <Link href="/ideas" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>→</Link>
            </div>
            {data.topIdeas.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: '10px 0' }}>Aucune idée</p>
            ) : (
              data.topIdeas.map(idea => (
                <div key={idea.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--border-s)',
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                    minWidth: 24, textAlign: 'center',
                  }}>
                    {idea.votes}
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--t0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idea.title || 'Sans titre'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
