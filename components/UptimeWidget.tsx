'use client'

import { useState, useEffect, useCallback } from 'react'

interface Monitor {
  id: string
  name: string
  url: string
  type: string
  keyword?: string
  interval_min: number
  enabled: boolean
  notify_on_down: boolean
  created_at: string
  latestPing: { status: string; response_ms: number; status_code: number; error?: string; checked_at: string } | null
  history: { status: string; response_ms?: number; checked_at: string }[]
  uptime7d: number | null
  uptime24h: number | null
  avgMs24h: number | null
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(s: string | null | undefined) {
  if (s === 'up') return '#10b981'
  if (s === 'degraded') return '#f59e0b'
  if (s === 'down') return '#ef4444'
  return '#6b7280'
}
function statusBg(s: string | null | undefined) {
  if (s === 'up') return 'rgba(16,185,129,0.12)'
  if (s === 'degraded') return 'rgba(245,158,11,0.12)'
  if (s === 'down') return 'rgba(239,68,68,0.12)'
  return 'rgba(107,114,128,0.12)'
}
function statusLabel(s: string | null | undefined) {
  if (s === 'up') return 'UP'
  if (s === 'degraded') return 'DÉGRADÉ'
  if (s === 'down') return 'DOWN'
  return '—'
}

function relTime(iso: string) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return `il y a ${d}s`
  if (d < 3600) return `il y a ${Math.floor(d / 60)}m`
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`
  return `il y a ${Math.floor(d / 86400)}j`
}

function uptimeColor(pct: number | null) {
  if (pct === null) return '#6b7280'
  if (pct >= 99) return '#10b981'
  if (pct >= 95) return '#f59e0b'
  return '#ef4444'
}

// ── Heartbeat bar (last 90 pings) ────────────────────────────────────────────

function HeartbeatBar({ history }: { history: { status: string; response_ms?: number; checked_at: string }[] }) {
  const bars = 60
  const padded = [...Array(Math.max(0, bars - history.length)).fill(null), ...history.slice(-bars)]
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
      {padded.map((p, i) => (
        <div
          key={i}
          title={p ? `${p.status} — ${p.response_ms ?? '?'}ms — ${new Date(p.checked_at).toLocaleString('fr-FR')}` : 'Pas de données'}
          style={{
            flex: 1,
            height: p ? Math.max(10, Math.min(28, (p.response_ms || 200) / 20)) : 10,
            borderRadius: 2,
            background: p ? statusColor(p.status) : 'var(--bg-3)',
            opacity: p ? 1 : 0.35,
            transition: 'height 0.2s',
            cursor: p ? 'help' : 'default',
          }}
        />
      ))}
    </div>
  )
}

// ── Response time mini chart ──────────────────────────────────────────────────

function ResponseChart({ history }: { history: { status: string; response_ms?: number }[] }) {
  const vals = history.filter(h => h.response_ms).map(h => h.response_ms!)
  if (!vals.length) return null
  const max = Math.max(...vals, 1)
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 32 }}>
      {vals.slice(-30).map((v, i) => (
        <div key={i} style={{
          flex: 1, height: Math.max(3, (v / max) * 32), borderRadius: 1,
          background: v > 2000 ? '#ef4444' : v > 800 ? '#f59e0b' : 'var(--accent)',
          opacity: 0.8,
        }} />
      ))}
    </div>
  )
}

// ── Monitor Card ─────────────────────────────────────────────────────────────

function MonitorCard({ monitor, onCheck, onDelete, onToggle }: {
  monitor: Monitor
  onCheck: () => Promise<void>
  onDelete: () => Promise<void>
  onToggle: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [checking, setChecking] = useState(false)
  const [menu, setMenu] = useState(false)
  const s = monitor.latestPing?.status
  const sc = statusColor(s)
  const sb = statusBg(s)

  const doCheck = async () => {
    setChecking(true)
    await onCheck()
    setChecking(false)
  }

  return (
    <div
      className="animate-in"
      style={{
        background: 'var(--bg-1)',
        border: `1px solid var(--border-s)`,
        borderLeft: `4px solid ${monitor.enabled ? sc : 'var(--border-m)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        opacity: monitor.enabled ? 1 : 0.55,
        transition: 'border-color 0.3s',
      }}
    >
      {/* Card header */}
      <div
        style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {/* Pulse dot */}
          <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: monitor.enabled ? sc : 'var(--border-m)' }} />
            {s === 'up' && monitor.enabled && (
              <div style={{
                position: 'absolute', inset: -3, borderRadius: '50%',
                border: `2px solid ${sc}`, opacity: 0,
                animation: 'ping-ring 2s ease-out infinite',
              }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {monitor.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {monitor.url}
            </p>
          </div>

          {/* Status badge */}
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.07em',
            color: monitor.enabled ? sc : 'var(--t2)',
            background: monitor.enabled ? sb : 'var(--bg-3)',
            padding: '3px 8px', borderRadius: 6, flexShrink: 0,
          }}>
            {monitor.enabled ? statusLabel(s) : 'DÉSACTIVÉ'}
          </span>

          {/* Menu */}
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenu(v => !v)}
              style={{ width: 24, height: 24, background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
            >⋯</button>
            {menu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(false)} />
                <div style={{ position: 'absolute', top: 26, right: 0, zIndex: 20, background: 'var(--bg-2)', border: '1px solid var(--border-m)', borderRadius: 8, padding: 4, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <button onClick={() => { setMenu(false); doCheck() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--t0)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>
                    ▶ Vérifier maintenant
                  </button>
                  <button onClick={() => { setMenu(false); onToggle() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--t0)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>
                    {monitor.enabled ? '⏸ Désactiver' : '▶ Activer'}
                  </button>
                  <button onClick={() => { setMenu(false); onDelete() }} style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 5 }}>
                    🗑 Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Heartbeat bar */}
        <div style={{ marginBottom: 10 }}>
          <HeartbeatBar history={monitor.history} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {monitor.uptime24h !== null && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 1 }}>24h</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: uptimeColor(monitor.uptime24h) }}>{monitor.uptime24h}%</p>
            </div>
          )}
          {monitor.uptime7d !== null && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 1 }}>7 jours</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: uptimeColor(monitor.uptime7d) }}>{monitor.uptime7d}%</p>
            </div>
          )}
          {monitor.avgMs24h !== null && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 1 }}>Latence moy.</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: monitor.avgMs24h > 1500 ? '#f59e0b' : 'var(--t0)' }}>{monitor.avgMs24h}ms</p>
            </div>
          )}
          {monitor.latestPing?.response_ms && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 1 }}>Dernier ping</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{monitor.latestPing.response_ms}ms</p>
            </div>
          )}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 1 }}>Dernière vérification</p>
            <p style={{ fontSize: 11, color: 'var(--t2)' }}>{monitor.latestPing ? relTime(monitor.latestPing.checked_at) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-s)', padding: '14px 16px', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Latence (30 derniers checks)</p>
              <ResponseChart history={monitor.history} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--t2)' }}>plus ancien</span>
                <span style={{ fontSize: 10, color: 'var(--t2)' }}>maintenant</span>
              </div>
            </div>
            <div style={{ minWidth: 180 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Infos</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--t2)', width: 90, flexShrink: 0 }}>Type</span>
                  <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500 }}>{monitor.type === 'http' ? 'HTTP(S)' : 'Mot-clé'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--t2)', width: 90, flexShrink: 0 }}>Intervalle</span>
                  <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500 }}>{monitor.interval_min} min</span>
                </div>
                {monitor.latestPing?.status_code && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--t2)', width: 90, flexShrink: 0 }}>Code HTTP</span>
                    <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500 }}>{monitor.latestPing.status_code}</span>
                  </div>
                )}
                {monitor.latestPing?.error && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--t2)', width: 90, flexShrink: 0 }}>Erreur</span>
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 500, wordBreak: 'break-word' }}>{monitor.latestPing.error}</span>
                  </div>
                )}
                {monitor.keyword && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--t2)', width: 90, flexShrink: 0 }}>Mot-clé</span>
                    <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 500, fontFamily: 'monospace' }}>{monitor.keyword}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={doCheck}
              disabled={checking}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: 'white', border: 'none', cursor: checking ? 'wait' : 'pointer', opacity: checking ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {checking ? (
                <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} /> Vérification…</>
              ) : '▶ Vérifier maintenant'}
            </button>
            <a href={monitor.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--bg-3)', color: 'var(--t1)', border: '1px solid var(--border-m)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ouvrir l'URL
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add monitor form ──────────────────────────────────────────────────────────

function AddMonitorForm({ onAdd }: { onAdd: (data: { name: string; url: string; type: string; keyword?: string; interval_min: number }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('http')
  const [keyword, setKeyword] = useState('')
  const [interval, setInterval] = useState(5)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim() || !url.trim()) return
    setLoading(true)
    await onAdd({ name: name.trim(), url: url.trim(), type, keyword: keyword || undefined, interval_min: interval })
    setName(''); setUrl(''); setType('http'); setKeyword(''); setInterval(5)
    setOpen(false)
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-2)', border: '1px solid var(--border-m)',
    borderRadius: 8, color: 'var(--t0)', fontSize: 13, outline: 'none',
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '12px', borderRadius: 14, border: '2px dashed var(--border-m)', background: 'none', color: 'var(--t2)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'border-color 0.15s', fontWeight: 500 }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-m)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        Ajouter un monitor
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-m)', borderRadius: 14, padding: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 16 }}>Nouveau monitor</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Mon service" style={inp} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="http">HTTP(S) — code 2xx</option>
            <option value="keyword">Mot-clé dans la réponse</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intervalle (min)</label>
          <select value={interval} onChange={e => setInterval(Number(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
            {[1, 2, 5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>
        {type === 'keyword' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mot-clé attendu</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder='ex: "status":"ok"' style={inp} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={submit} disabled={loading || !name || !url} className="btn btn-primary" style={{ fontSize: 12 }}>
          {loading ? 'Ajout…' : 'Ajouter'}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--border-m)', color: 'var(--t1)', cursor: 'pointer' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function UptimeWidget() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAll, setCheckingAll] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitors')
      if (res.ok) {
        const data = await res.json()
        setMonitors(Array.isArray(data) ? data : [])
        setLastRefresh(new Date())
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    load().then(async () => {
      // Auto-check if no ping in the last 5 min (replaces Vercel cron on Hobby plan)
      setMonitors(prev => {
        const stale = prev.some(m => {
          if (!m.enabled) return false
          if (!m.latestPing) return true
          return Date.now() - new Date(m.latestPing.checked_at).getTime() > 5 * 60_000
        })
        if (stale) {
          fetch('/api/admin/monitors/check-all', { headers: { 'x-admin-check': 'true' } })
            .then(() => load())
        }
        return prev
      })
    })
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const checkAll = async () => {
    setCheckingAll(true)
    await fetch('/api/admin/monitors/check-all', { headers: { 'x-admin-check': 'true' } })
    await load()
    setCheckingAll(false)
  }

  const checkOne = async (id: string) => {
    await fetch(`/api/admin/monitors/${id}`, { method: 'POST' })
    await load()
  }

  const deleteMonitor = async (id: string) => {
    if (!confirm('Supprimer ce monitor ?')) return
    setMonitors(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/admin/monitors/${id}`, { method: 'DELETE' })
  }

  const toggleMonitor = async (id: string, enabled: boolean) => {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, enabled } : m))
    await fetch(`/api/admin/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    await load()
  }

  const addMonitor = async (data: { name: string; url: string; type: string; keyword?: string; interval_min: number }) => {
    const res = await fetch('/api/admin/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      await checkOne((await res.json()).id)
    }
  }

  // Summary stats
  const enabled = monitors.filter(m => m.enabled)
  const down = enabled.filter(m => m.latestPing?.status === 'down')
  const degraded = enabled.filter(m => m.latestPing?.status === 'degraded')
  const up = enabled.filter(m => m.latestPing?.status === 'up')
  const unchecked = enabled.filter(m => !m.latestPing)

  const overallStatus = down.length > 0 ? 'down' : degraded.length > 0 ? 'degraded' : unchecked.length > 0 ? null : 'up'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />)}
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @keyframes ping-ring { 0% { transform: scale(1); opacity: 0.8 } 100% { transform: scale(2.4); opacity: 0 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Global status banner */}
      <div style={{
        padding: '16px 20px', borderRadius: 14, marginBottom: 20,
        background: overallStatus === 'up' ? 'rgba(16,185,129,0.08)' : overallStatus === 'down' ? 'rgba(239,68,68,0.08)' : overallStatus === 'degraded' ? 'rgba(245,158,11,0.08)' : 'var(--bg-1)',
        border: `1px solid ${overallStatus === 'up' ? 'rgba(16,185,129,0.2)' : overallStatus === 'down' ? 'rgba(239,68,68,0.2)' : overallStatus === 'degraded' ? 'rgba(245,158,11,0.2)' : 'var(--border-s)'}`,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: overallStatus === 'up' ? 'rgba(16,185,129,0.15)' : overallStatus === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {overallStatus === 'up' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : overallStatus === 'down' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/></svg>
            )}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>
              {overallStatus === 'up' && `Tous les services en ligne`}
              {overallStatus === 'down' && `${down.length} service${down.length > 1 ? 's' : ''} hors ligne`}
              {overallStatus === 'degraded' && `${degraded.length} service${degraded.length > 1 ? 's' : ''} dégradé${degraded.length > 1 ? 's' : ''}`}
              {!overallStatus && `${monitors.length} monitor${monitors.length > 1 ? 's' : ''} configuré${monitors.length > 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
              {up.length} en ligne · {down.length} hors ligne · {degraded.length} dégradé{degraded.length > 1 ? 's' : ''} · {unchecked.length} non vérifié{unchecked.length > 1 ? 's' : ''}
              {lastRefresh && <span> · actualisé {relTime(lastRefresh.toISOString())}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={checkAll}
          disabled={checkingAll}
          style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: 'white', border: 'none', cursor: checkingAll ? 'wait' : 'pointer', opacity: checkingAll ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          {checkingAll ? (
            <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />Vérification…</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>Tout vérifier</>
          )}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['up', 'En ligne'], ['degraded', 'Dégradé (>3s)'], ['down', 'Hors ligne']].map(([s, l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: statusColor(s) }} />
            <span style={{ fontSize: 11, color: 'var(--t2)' }}>{l}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-3)', opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: 'var(--t2)' }}>Pas de données</span>
        </div>
      </div>

      {/* Monitor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 14, marginBottom: 16 }}>
        {monitors.map(m => (
          <MonitorCard
            key={m.id}
            monitor={m}
            onCheck={() => checkOne(m.id)}
            onDelete={() => deleteMonitor(m.id)}
            onToggle={() => toggleMonitor(m.id, !m.enabled)}
          />
        ))}
      </div>

      {monitors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t2)', fontSize: 13 }}>
          Aucun monitor configuré — ajoutez le premier ci-dessous
        </div>
      )}

      {/* Add form */}
      <AddMonitorForm onAdd={addMonitor} />
    </div>
  )
}
