'use client'

import { useState, useEffect } from 'react'

interface InfraData {
  ping: number
  tableCounts: Record<string, number>
  totalRows: number
  rowHistory: { date: string; value: number }[]
  sbUsage: Record<string, { used: number; limit: number }> | null
  sbApiSpark: number[]
  sbLimits: Record<string, number>
  vercelDeployments: {
    uid: string
    state: string
    created: number
    url: string
    meta?: { githubCommitMessage?: string }
  }[]
  vercelLimits: Record<string, number>
  hasSupabaseToken: boolean
  hasVercelToken: boolean
}

function fmt(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function relTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return "à l'instant"
  if (m < 60)  return `il y a ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ── Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data, color, height = 44 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--t2)' }}>Données insuffisantes</span>
    </div>
  )
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const W = 200
  const H = height
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }))

  // Smooth bezier path
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = pts[i - 1]
    const cp1x = prev.x + (pt.x - prev.x) / 3
    const cp2x = pt.x - (pt.x - prev.x) / 3
    return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${pt.y}, ${pt.x} ${pt.y}`
  }, '')

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#g-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  )
}

// ── Usage bar ─────────────────────────────────────────────────
function UsageBar({ label, used, limit, formatFn = fmt }: {
  label: string; used: number; limit: number; formatFn?: (n: number) => string
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const color = pct > 80 ? '#f43f5e' : pct > 60 ? '#f59e0b' : '#0ec98c'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 700 }}>
          {formatFn(used)} <span style={{ color: 'var(--t2)', fontWeight: 400 }}>/ {formatFn(limit)}</span>
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 100,
          transition: 'width 0.8s var(--ease-spring)',
        }} />
      </div>
      <span style={{ fontSize: 10, color: pct > 80 ? '#f43f5e' : 'var(--t2)', marginTop: 2, display: 'block' }}>
        {pct.toFixed(1)}% utilisé
      </span>
    </div>
  )
}

// ── Table mini bars ───────────────────────────────────────────
function TableBars({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(...Object.values(counts), 1)
  const LABELS: Record<string, string> = {
    tasks: 'Tâches', crm: 'CRM', ideas: 'Idées', events: 'Events',
    notes: 'Notes', time_sessions: 'Sessions', notifications: 'Notifs',
    presence: 'Présence', chat_messages: 'Chat', organizations: 'Orgs',
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
      {Object.entries(counts)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([table, count]) => (
          <div key={table}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>{LABELS[table] ?? table}</span>
              <span style={{ fontSize: 10, color: 'var(--t1)', fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 100 }}>
              <div style={{
                height: '100%', width: `${(count / max) * 100}%`,
                background: 'var(--accent)', borderRadius: 100,
              }} />
            </div>
          </div>
        ))}
    </div>
  )
}

// ── Deployment dots ───────────────────────────────────────────
function DeploySpark({ deployments }: { deployments: InfraData['vercelDeployments'] }) {
  // Build last-14-days buckets
  const buckets: Record<string, { ok: number; err: number }> = {}
  const days = 14
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    buckets[d] = { ok: 0, err: 0 }
  }
  for (const dep of deployments) {
    const d = new Date(dep.created).toISOString().slice(0, 10)
    if (buckets[d]) {
      dep.state === 'READY' ? buckets[d].ok++ : buckets[d].err++
    }
  }
  const sorted = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b))
  const total = sorted.map(([, v]) => v.ok + v.err)

  return (
    <div>
      <Sparkline data={total} color="#7c6af5" height={40} />
      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
        {sorted.slice(-7).map(([date, v]) => {
          const tot = v.ok + v.err
          const hasErr = v.err > 0
          return (
            <div key={date} title={`${date}: ${v.ok} ok, ${v.err} erreur(s)`}
              style={{
                width: 24, height: 24, borderRadius: 6, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: tot === 0 ? 'var(--bg-3)' : hasErr ? 'rgba(244,63,94,0.15)' : 'rgba(14,201,140,0.12)',
                color: tot === 0 ? 'var(--t2)' : hasErr ? '#f43f5e' : '#0ec98c',
              }}
            >
              {tot > 0 ? tot : '·'}
            </div>
          )
        })}
      </div>
      <span style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4, display: 'block' }}>
        Déploiements sur 7 jours
      </span>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────
function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600,
      color: ok ? '#0ec98c' : '#f43f5e',
      background: ok ? 'rgba(14,201,140,0.1)' : 'rgba(244,63,94,0.1)',
      border: `1px solid ${ok ? 'rgba(14,201,140,0.2)' : 'rgba(244,63,94,0.2)'}`,
      padding: '3px 8px', borderRadius: 100,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#0ec98c' : '#f43f5e',
        boxShadow: ok ? '0 0 6px #0ec98c' : 'none',
      }} />
      {label}
    </span>
  )
}

// ── Config hint ───────────────────────────────────────────────
function ConfigHint({ text }: { text: string }) {
  return (
    <div style={{
      background: 'rgba(var(--accent-rgb),0.06)', border: '1px dashed rgba(var(--accent-rgb),0.2)',
      borderRadius: 8, padding: '8px 10px',
      fontSize: 11, color: 'var(--t2)', lineHeight: 1.5,
    }}>
      💡 {text}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────
export default function InfraWidget() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/infra')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 340, borderRadius: 14 }} />)}
    </div>
  )
  if (!data) return null

  const lastDeploy = data.vercelDeployments[0]
  const deployOk   = lastDeploy?.state === 'READY'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p className="section-title" style={{ margin: 0 }}>Infrastructure</p>
        <span style={{ fontSize: 11, color: 'var(--t2)' }}>Temps réel</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>

        {/* ── SUPABASE ─────────────────────────────────── */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>🗄</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Supabase</span>
            </div>
            <StatusPill ok={data.ping < 500} label={`Online · ${data.ping}ms`} />
          </div>

          {/* Sparkline — API requests or row growth */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6, fontWeight: 500 }}>
              {data.sbApiSpark.length > 1 ? 'Requêtes API / jour (7j)' : 'Lignes totales (historique)'}
            </p>
            <Sparkline
              data={data.sbApiSpark.length > 1 ? data.sbApiSpark : data.rowHistory.map(r => r.value)}
              color="#7c6af5"
              height={48}
            />
          </div>

          {/* Usage bars */}
          {data.sbUsage ? (
            <div>
              {data.sbUsage['db_size'] && (
                <UsageBar label="Base de données" used={data.sbUsage['db_size'].used} limit={data.sbUsage['db_size'].limit} />
              )}
              {data.sbUsage['storage'] && (
                <UsageBar label="Storage" used={data.sbUsage['storage'].used} limit={data.sbUsage['storage'].limit} />
              )}
              {data.sbUsage['monthly_active_users'] && (
                <UsageBar
                  label="MAU (utilisateurs actifs)"
                  used={data.sbUsage['monthly_active_users'].used}
                  limit={data.sbUsage['monthly_active_users'].limit}
                  formatFn={fmtNum}
                />
              )}
              {data.sbUsage['db_egress'] && (
                <UsageBar label="Bande passante DB" used={data.sbUsage['db_egress'].used} limit={data.sbUsage['db_egress'].limit} />
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Base de données', limit: 500 * 1024 * 1024 },
                { label: 'Storage', limit: 1024 * 1024 * 1024 },
                { label: 'MAU', limit: 50_000, formatFn: fmtNum },
                { label: 'Bande passante DB', limit: 5 * 1024 * 1024 * 1024 },
              ].map(bar => (
                <div key={bar.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--t2)' }}>{bar.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--t2)' }}>? / {(bar.formatFn ?? fmt)(bar.limit)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 100 }}>
                    <div style={{ height: '100%', width: '4px', background: 'var(--border-m)', borderRadius: 100 }} />
                  </div>
                </div>
              ))}
              <ConfigHint text="Ajoute SUPABASE_ACCESS_TOKEN dans .env.local pour voir l'usage réel (supabase.com → Account → Access Tokens)" />
            </div>
          )}

          {/* Table breakdown */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8, fontWeight: 500 }}>
              {data.totalRows.toLocaleString('fr-FR')} lignes dans la DB
            </p>
            <TableBars counts={data.tableCounts} />
          </div>
        </div>

        {/* ── VERCEL ───────────────────────────────────── */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>▲</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Vercel</span>
            </div>
            {lastDeploy
              ? <StatusPill ok={deployOk} label={deployOk ? `Déployé · ${relTime(lastDeploy.created)}` : 'Erreur deploy'} />
              : <StatusPill ok={true} label="Production" />
            }
          </div>

          {/* Deploy sparkline */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6, fontWeight: 500 }}>
              Déploiements (14 derniers jours)
            </p>
            {data.vercelDeployments.length > 0
              ? <DeploySpark deployments={data.vercelDeployments} />
              : (
                <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--t2)' }}>—</span>
                </div>
              )
            }
          </div>

          {/* Last deployments list */}
          {data.vercelDeployments.length > 0 ? (
            <div>
              <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8, fontWeight: 500 }}>Derniers déploiements</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.vercelDeployments.slice(0, 5).map(dep => {
                  const ok = dep.state === 'READY'
                  return (
                    <div key={dep.uid} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 8,
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: ok ? '#0ec98c' : dep.state === 'BUILDING' ? '#f59e0b' : '#f43f5e',
                        boxShadow: ok ? '0 0 6px rgba(14,201,140,0.6)' : 'none',
                      }} />
                      <span style={{ fontSize: 11, flex: 1, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dep.meta?.githubCommitMessage?.split('\n')[0] ?? dep.url}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--t2)', flexShrink: 0 }}>{relTime(dep.created)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Static Vercel free tier limits reference */}
              <div>
                {[
                  { label: 'Bandwidth', limit: 100 * 1024 * 1024 * 1024 },
                  { label: 'Build minutes', limit: 6_000, formatFn: (n: number) => `${n.toLocaleString('fr-FR')} min` },
                ].map(bar => (
                  <div key={bar.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{bar.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--t2)' }}>? / {bar.formatFn ? bar.formatFn(bar.limit) : fmt(bar.limit)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 100 }}>
                      <div style={{ height: '100%', width: '4px', background: 'var(--border-m)', borderRadius: 100 }} />
                    </div>
                  </div>
                ))}
              </div>
              <ConfigHint text="Ajoute VERCEL_TOKEN dans .env.local pour voir les déploiements et l'usage (vercel.com → Settings → Tokens)" />
            </div>
          )}

          {/* Vercel free tier reminder */}
          <div style={{
            padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600 }}>PLAN HOBBY — LIMITES</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Bandwidth', value: '100 GB/mois' },
                { label: 'Build', value: '6 000 min/mois' },
                { label: 'Déploiements', value: '100/jour' },
                { label: 'Fonctions', value: '100 GB-h' },
              ].map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: 10, color: 'var(--t2)' }}>{item.label} </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t1)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
