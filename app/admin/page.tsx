'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

const InfraWidget = lazy(() => import('@/components/InfraWidget'))
const UptimeWidget = lazy(() => import('@/components/UptimeWidget'))

interface Metrics {
  users: number
  projects: number
  members: number
  tasks: number
  tasksByStatus: Record<string, number>
  crm: number
  notes: number
  ideas: number
  events: number
  messages: number
  totalHoursLogged: number
}

interface AdminUser {
  id: string
  name: string
  email: string
  color: string
  created_at: string
  project_count: number
  is_superadmin: boolean
}

interface ActivityEntry {
  type: 'task' | 'note' | 'chat' | 'crm' | 'idea'
  title: string
  author: string
  project?: string
  created_at: string
}

function fmtDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const ACTIVITY_ICONS: Record<string, { color: string; icon: React.ReactNode }> = {
  task: { color: '#059669', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  note: { color: '#3b82f6', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="white" strokeWidth="1.8"/><polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="1.8"/></svg> },
  chat: { color: '#7c6af5', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="1.8"/></svg> },
  crm:  { color: '#ea580c', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  idea: { color: '#f59e0b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 22h4M12 2a7 7 0 017 7c0 2.6-1.4 4.9-3.5 6.2L15 17H9l-.5-1.8C6.4 13.9 5 11.6 5 9a7 7 0 017-7z" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg> },
}

function Skeleton({ w, h }: { w?: number | string; h?: number }) {
  return <div style={{ width: w || '100%', height: h || 16, borderRadius: 6, background: 'var(--bg-3)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
}

export default function AdminPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-US', zh: 'zh-CN' }
  const locale = LOCALE_MAP[lang] || 'fr-FR'

  const ACTIVITY_META = {
    task: { label: t('typeTask'), ...ACTIVITY_ICONS.task },
    note: { label: 'Note',       ...ACTIVITY_ICONS.note },
    chat: { label: 'Message',    ...ACTIVITY_ICONS.chat },
    crm:  { label: 'CRM',        ...ACTIVITY_ICONS.crm  },
    idea: { label: t('typeIdea'),...ACTIVITY_ICONS.idea  },
  } as Record<string, { label: string; color: string; icon: React.ReactNode }>

  const METRIC_CARDS = (m: Metrics) => [
    { label: t('adminUsersLabel'),    value: m.users,            color: '#7c6af5', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M3 21c0-4 2.7-7 6-7h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M15 21c0-3 1.3-5 4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: t('adminProjectsLabel'), value: m.projects,         color: '#3b82f6', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" strokeWidth="1.8"/></svg> },
    { label: t('adminMembersLabel'),  value: m.members,          color: '#0d9488', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: t('adminTasksLabel'),    value: m.tasks,            color: '#059669', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'CRM',                   value: m.crm,              color: '#ea580c', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'Notes',                 value: m.notes,            color: '#db2777', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: t('adminIdeasLabel'),    value: m.ideas,            color: '#f59e0b', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 017 7c0 2.6-1.4 4.9-3.5 6.2L15 17H9l-.5-1.8C6.4 13.9 5 11.6 5 9a7 7 0 017-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: t('adminEventsLabel'),   value: m.events,           color: '#6366f1', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8"/></svg> },
    { label: 'Messages',              value: m.messages,         color: '#06b6d4', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8"/></svg> },
    { label: t('adminHoursLabel'),    value: `${m.totalHoursLogged}h`, color: '#10b981', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  ]

  const timeAgo = (dateStr: string) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('instant')
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}j`
  }

  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'monitoring' | 'users' | 'activity' | 'infra'>('monitoring')

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(d => {
        setAuthorized(d.isSuperAdmin)
        if (d.isSuperAdmin) {
          fetch('/api/admin/metrics').then(r => r.json()).then(setMetrics)
          fetch('/api/admin/users').then(r => r.json()).then(setUsers)
          fetch('/api/admin/activity').then(r => r.json()).then(setActivity)
        }
      })
  }, [])

  if (authorized === null) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-m)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)' }}>{t('accessDenied')}</p>
        <p style={{ fontSize: 13, color: 'var(--t2)' }}>{t('noSuperAdminRights')}</p>
        <button onClick={() => router.push('/')} style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('back')}</button>
      </div>
    )
  }

  const filteredUsers = (users || []).filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-0)', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-0)', borderBottom: '1px solid var(--border-s)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 8px 4px 0' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t('back')}
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border-m)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>SuperAdmin</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.12)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.06em' }}>PLATFORM</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--t2)' }}>Live</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Metrics grid */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{t('platformMetrics')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {metrics ? METRIC_CARDS(metrics).map(card => (
              <div key={card.label} style={{
                flex: '1 1 140px', minWidth: 130, padding: '14px 16px',
                background: 'var(--bg-1)', border: '1px solid var(--border-s)',
                borderRadius: 14, borderLeft: `3px solid ${card.color}`,
              }}>
                <div style={{ color: card.color, marginBottom: 8 }}>{card.icon}</div>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--t0)', lineHeight: 1, marginBottom: 4 }}>{card.value}</p>
                <p style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 500 }}>{card.label}</p>
              </div>
            )) : Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ flex: '1 1 140px', minWidth: 130, padding: '14px 16px', background: 'var(--bg-1)', border: '1px solid var(--border-s)', borderRadius: 14 }}>
                <Skeleton w={20} h={20} />
                <div style={{ marginTop: 12, marginBottom: 6 }}><Skeleton h={24} /></div>
                <Skeleton w="60%" h={12} />
              </div>
            ))}
          </div>
        </div>

        {/* Task status bar */}
        {metrics && metrics.tasks > 0 && (
          <div style={{ marginBottom: 36, padding: '16px 20px', background: 'var(--bg-1)', border: '1px solid var(--border-s)', borderRadius: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>{t('taskDistribution')}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(metrics.tasksByStatus).map(([status, count]) => {
                const pct = Math.round((count / metrics.tasks) * 100)
                const colors: Record<string, string> = { todo: '#6366f1', in_progress: '#f59e0b', done: '#10b981', review: '#3b82f6' }
                const labels: Record<string, string> = { todo: t('todo'), in_progress: t('inProgress'), done: t('done'), review: t('inReview') }
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] || 'var(--t2)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{labels[status] || status}</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: 'var(--bg-3)', overflow: 'hidden', display: 'flex' }}>
              {Object.entries(metrics.tasksByStatus).map(([status, count]) => {
                const pct = (count / metrics.tasks) * 100
                const colors: Record<string, string> = { todo: '#6366f1', in_progress: '#f59e0b', done: '#10b981', review: '#3b82f6' }
                return <div key={status} style={{ width: `${pct}%`, background: colors[status] || 'var(--t2)', transition: 'width 0.5s ease' }} />
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-1)', border: '1px solid var(--border-s)', borderRadius: 10, padding: 3, width: 'fit-content', flexWrap: 'wrap' }}>
          {([
            { id: 'monitoring', label: '📡 Monitoring' },
            { id: 'users',      label: `${t('adminUsersLabel')}${users ? ` (${users.length})` : ''}` },
            { id: 'activity',   label: t('activityTab') },
            { id: 'infra',      label: '🔧 Infrastructure' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--bg-3)' : 'transparent',
                color: activeTab === tab.id ? 'var(--t0)' : 'var(--t2)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Monitoring tab */}
        {activeTab === 'monitoring' && (
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 140, borderRadius: 14, background: 'var(--bg-1)', border: '1px solid var(--border-s)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />)}
            </div>
          }>
            <UptimeWidget />
          </Suspense>
        )}

        {/* Users tab */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-s)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-s)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', flex: 1 }}>{t('adminUsersLabel')}</p>
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }}>
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder={t('search')}
                  style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, color: 'var(--t0)', fontSize: 12, outline: 'none', width: 200 }}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-s)' }}>
                    {[t('adminUsersLabel'), 'Email', t('adminProjectsLabel'), t('status'), t('today')].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!users ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-s)' }}>
                      {[140, 200, 60, 80, 100].map((w, j) => (
                        <td key={j} style={{ padding: '12px 20px' }}><Skeleton w={w} h={14} /></td>
                      ))}
                    </tr>
                  )) : filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-s)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {initials(u.name)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', whiteSpace: 'nowrap' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{u.email}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{u.project_count}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {u.is_superadmin ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '2px 7px', borderRadius: 4 }}>SUPERADMIN</span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--t2)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: 4 }}>{t('adminUsersLabel').slice(0,-1)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users && filteredUsers.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>{t('noUserFound')}</div>
            )}
          </div>
        )}

        {/* Activity tab */}
        {activeTab === 'activity' && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-s)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-s)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{t('recentActivityAll')}</p>
            </div>
            <div style={{ padding: '8px 20px' }}>
              {!activity ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-s)' }}>
                  <Skeleton w={32} h={32} />
                  <div style={{ flex: 1 }}>
                    <Skeleton h={14} />
                    <div style={{ marginTop: 6 }}><Skeleton w="40%" h={11} /></div>
                  </div>
                </div>
              )) : activity.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>{t('noActivity')}</div>
              ) : activity.map((entry, i) => {
                const meta = ACTIVITY_META[entry.type]
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--border-s)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--t0)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title || '—'}</p>
                      <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
                        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                        {entry.author && entry.author !== '—' && <span> · {entry.author}</span>}
                        {entry.project && <span> · {entry.project}</span>}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--t2)', flexShrink: 0, paddingTop: 2 }}>{timeAgo(entry.created_at)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Infrastructure tab */}
        {activeTab === 'infra' && (
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
            </div>
          }>
            <InfraWidget />
          </Suspense>
        )}

      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
