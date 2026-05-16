'use client'

import { useState, useEffect, useRef } from 'react'
import { Leaderboard } from '@/components/Leaderboard'
import { useTimer } from '@/lib/timer-context'
import { useCache } from '@/lib/useCache'

interface TimeSession {
  id: string
  utilisateur: string
  categorie: string
  debut: string
  fin: string | null
  duree: number | null
  note: string
}

const CATEGORIES = [
  { id: 'Travail',   color: '#7c6af5', emoji: '💼' },
  { id: 'Meeting',   color: '#4f8ef7', emoji: '🤝' },
  { id: 'Code',      color: '#0ec98c', emoji: '💻' },
  { id: 'Design',    color: '#a855f7', emoji: '🎨' },
  { id: 'Prospection', color: '#f59e0b', emoji: '📞' },
  { id: 'Pause',     color: '#6b7280', emoji: '☕' },
]

function fmt(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}m`
}

function fmtLive(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const diff = Math.floor((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'Aujourd\'hui'
  if (diff === 1) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
}

function getCatColor(cat: string) {
  return CATEGORIES.find(c => c.id === cat)?.color || '#7c6af5'
}

function hexAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getCatEmoji(cat: string) {
  return CATEGORIES.find(c => c.id === cat)?.emoji || '⏱'
}

export default function TimePage() {
  const { setActive: setTimerCtx } = useTimer()
  const [days, setDays] = useState(7)
  const { data: timeData, loading, refresh } = useCache<{ sessions: TimeSession[]; active: TimeSession | null }>(`/api/time?days=${days}`, { ttl: 15_000 })
  const [sessions, setSessions] = useState<TimeSession[]>(timeData?.sessions ?? [])
  const [active, setActive] = useState<TimeSession | null>(timeData?.active ?? null)
  const [elapsed, setElapsed] = useState(0)
  const [startError, setStartError] = useState(false)
  const [selectedCat, setSelectedCat] = useState('Travail')
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (timeData) {
      setSessions(timeData.sessions || [])
      const a = timeData.active || null
      setActive(a)
      if (a) setSelectedCat(a.categorie)
    }
  }, [timeData])

  useEffect(() => {
    clearInterval(tickRef.current)
    if (active) {
      const tick = () => setElapsed(Math.floor((Date.now() - new Date(active.debut).getTime()) / 1000))
      tick()
      tickRef.current = setInterval(tick, 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(tickRef.current)
  }, [active])

  const start = async () => {
    setStartError(false)
    const res = await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorie: selectedCat }),
    })
    if (res.ok) {
      const s = await res.json()
      setActive(s)
      setTimerCtx({ id: s.id, categorie: s.categorie, debut: s.debut })
    } else {
      setStartError(true)
    }
  }

  const stop = async () => {
    if (!active) return
    await fetch(`/api/time/${active.id}`, { method: 'PATCH' })
    setActive(null)
    setElapsed(0)
    setTimerCtx(null)
    refresh()
  }

  // ── Stats ─────────────────────────────────────────────────
  const completed = sessions.filter(s => s.fin)

  const totalMin = completed.reduce((a, s) => a + (s.duree || 0), 0)

  const todayMin = completed.filter(s => {
    const d = new Date(s.debut)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  }).reduce((a, s) => a + (s.duree || 0), 0)

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    min: completed.filter(s => s.categorie === cat.id).reduce((a, s) => a + (s.duree || 0), 0),
  })).filter(c => c.min > 0).sort((a, b) => b.min - a.min)

  // Group by day
  const byDay: Record<string, TimeSession[]> = {}
  completed.forEach(s => {
    const key = new Date(s.debut).toDateString()
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(s)
  })

  const maxDayMin = Math.max(...Object.values(byDay).map(ss =>
    ss.reduce((a, s) => a + (s.duree || 0), 0)
  ), 1)

  const dayKeys = Object.keys(byDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Time Tracker</h1>
        <p className="page-subtitle">Suit ton temps de travail, par session et par catégorie</p>
      </div>

      {/* ── Timer widget ── */}
      <div data-tour="time-tracker" className="card" style={{ padding: 28, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        {/* Live display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em',
            color: active ? getCatColor(active.categorie) : 'var(--t2)',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.3s',
          }}>
            {fmtLive(elapsed)}
          </div>
          {active && (
            <p style={{ fontSize: 13, color: 'var(--t1)', marginTop: 4 }}>
              {getCatEmoji(active.categorie)} {active.categorie} · démarré à {new Date(active.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Category selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => !active && setSelectedCat(cat.id)}
              disabled={!!active}
              style={{
                padding: '6px 14px', borderRadius: 100, border: '1.5px solid',
                borderColor: selectedCat === cat.id ? cat.color : 'var(--border-m)',
                background: selectedCat === cat.id ? `${cat.color}22` : 'transparent',
                color: selectedCat === cat.id ? cat.color : 'var(--t2)',
                fontSize: 12, fontWeight: 600, cursor: active ? 'default' : 'pointer',
                opacity: active && active.categorie !== cat.id ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {cat.emoji} {cat.id}
            </button>
          ))}
        </div>

        {/* Start / Stop */}
        <button
          onClick={active ? stop : start}
          style={{
            padding: '12px 40px', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: active ? 'var(--red)' : getCatColor(selectedCat),
            color: 'white', fontSize: 15, fontWeight: 700,
            boxShadow: `0 4px 24px ${active ? 'rgba(244,63,94,0.4)' : hexAlpha(getCatColor(selectedCat), 0.33)}`,
            transition: 'all 0.2s var(--ease-spring)',
          }}
        >
          {active ? '⏹ Arrêter' : '▶ Démarrer'}
        </button>
        {startError && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>Impossible de démarrer la session. Réessaie.</p>}
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: "Aujourd'hui", value: fmt(todayMin), sub: `${completed.filter(s => new Date(s.debut).toDateString() === new Date().toDateString()).length} sessions` },
          { label: `${days} derniers jours`, value: fmt(totalMin), sub: `${completed.length} sessions` },
          { label: 'Moy. / jour', value: fmt(Math.round(totalMin / Math.max(days, 1))), sub: 'par jour travaillé' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--t2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', marginTop: 4, letterSpacing: '-0.03em' }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>

        {/* ── Category breakdown ── */}
        <div className="card" style={{ padding: 20 }}>
          <p className="section-title" style={{ marginBottom: 16 }}>Par catégorie</p>
          {byCategory.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', padding: '20px 0' }}>Aucune session</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byCategory.map(cat => (
                <div key={cat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{cat.emoji} {cat.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--t0)', fontWeight: 700 }}>{fmt(cat.min)}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 100,
                      background: cat.color,
                      width: `${(cat.min / totalMin) * 100}%`,
                      transition: 'width 0.6s var(--ease-spring)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Daily bar chart ── */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="section-title" style={{ margin: 0 }}>Par jour</p>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{ fontSize: 11, background: 'var(--bg-3)', border: '1px solid var(--border-s)', borderRadius: 6, color: 'var(--t1)', padding: '2px 6px', cursor: 'pointer' }}
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
            </select>
          </div>
          {dayKeys.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', padding: '20px 0' }}>Aucune session</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayKeys.slice(0, 7).map(key => {
                const daySessions = byDay[key]
                const dayTotal = daySessions.reduce((a, s) => a + (s.duree || 0), 0)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--t2)', width: 56, flexShrink: 0 }}>
                      {dayLabel(daySessions[0].debut)}
                    </span>
                    <div style={{ flex: 1, height: 18, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', inset: '0 auto 0 0',
                        width: `${(dayTotal / maxDayMin) * 100}%`,
                        background: 'var(--accent)', borderRadius: 4, opacity: 0.85,
                        transition: 'width 0.5s var(--ease-spring)',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 700, width: 36, textAlign: 'right', flexShrink: 0 }}>
                      {fmt(dayTotal)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Session log ── */}
      <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-s)' }}>
          <p className="section-title" style={{ margin: 0 }}>Historique des sessions</p>
        </div>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
          </div>
        ) : completed.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
            Lance ton premier chrono !
          </div>
        ) : (
          <div>
            {dayKeys.slice(0, 7).map(key => (
              <div key={key}>
                <div style={{ padding: '8px 20px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-s)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {dayLabel(byDay[key][0].debut)}
                  </span>
                </div>
                {byDay[key].map(s => (
                  <div key={s.id} style={{
                    padding: '12px 20px', borderBottom: '1px solid var(--border-s)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: getCatColor(s.categorie),
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--t2)', width: 48, flexShrink: 0 }}>
                      {new Date(s.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--t1)', flex: 1 }}>
                      {getCatEmoji(s.categorie)} {s.categorie}
                      {s.note && <span style={{ color: 'var(--t2)', marginLeft: 8 }}>— {s.note}</span>}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', fontVariantNumeric: 'tabular-nums' }}>
                      {s.duree !== null ? fmt(s.duree) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ marginTop: 24 }}>
        <Leaderboard />
      </div>
    </div>
  )
}
