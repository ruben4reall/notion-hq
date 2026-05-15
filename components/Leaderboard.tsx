'use client'

import { useState, useEffect } from 'react'

interface LeaderEntry {
  utilisateur: string
  totalMinutes: number
  sessions: number
  avgSession: number
  byCategory: Record<string, number>
}

const CAT_COLORS: Record<string, string> = {
  Travail: '#7c6af5', Meeting: '#4f8ef7', Code: '#0ec98c',
  Design: '#a855f7', Prospection: '#f59e0b', Pause: '#6b7280',
}

function fmt(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m}m`
}

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard() {
  const [data, setData] = useState<LeaderEntry[]>([])
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/time/leaderboard?days=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  const max = data[0]?.totalMinutes || 1

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="section-title" style={{ margin: 0 }}>Leaderboard</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: period === d ? 'var(--accent)' : 'var(--bg-3)',
                color: period === d ? 'white' : 'var(--t1)',
              }}
            >
              {d === 7 ? '7j' : d === 30 ? '30j' : '90j'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />)}
        </div>
      ) : data.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', padding: '20px 0' }}>
          Aucune session sur cette période
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((entry, i) => {
            const pct = (entry.totalMinutes / max) * 100
            const topCat = Object.entries(entry.byCategory).sort((a, b) => b[1] - a[1])[0]
            const topColor = topCat ? (CAT_COLORS[topCat[0]] || '#7c6af5') : 'var(--accent)'
            return (
              <div key={entry.utilisateur} style={{
                background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px',
                border: i === 0 ? `1px solid ${topColor}33` : '1px solid var(--border-s)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{MEDALS[i] || `${i + 1}.`}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>
                      {entry.utilisateur.split(' ')[0]}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>
                      {entry.sessions} session{entry.sessions > 1 ? 's' : ''} · moy. {fmt(entry.avgSession)}
                    </p>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: topColor, letterSpacing: '-0.03em', flexShrink: 0 }}>
                    {fmt(entry.totalMinutes)}
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: topColor, borderRadius: 100,
                    transition: 'width 0.6s var(--ease-out)',
                  }} />
                </div>

                {/* Category breakdown */}
                {Object.keys(entry.byCategory).length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {Object.entries(entry.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, min]) => (
                        <span key={cat} style={{
                          fontSize: 10, fontWeight: 500,
                          color: CAT_COLORS[cat] || 'var(--t2)',
                          background: `${CAT_COLORS[cat] || '#888'}18`,
                          padding: '2px 7px', borderRadius: 100,
                        }}>
                          {cat} {fmt(min)}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
