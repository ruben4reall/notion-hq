'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTimer } from '@/lib/timer-context'

const CAT_COLORS: Record<string, string> = {
  Travail: '#7c6af5', Meeting: '#4f8ef7', Code: '#0ec98c',
  Design: '#a855f7', Prospection: '#f59e0b', Pause: '#6b7280',
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function GlobalTimerBar() {
  const { active, elapsed, setActive } = useTimer()
  const path = usePathname()
  const router = useRouter()

  if (!active || path === '/time' || path === '/login' || path.startsWith('/auth') || path.startsWith('/org')) return null

  const color = CAT_COLORS[active.categorie] || '#7c6af5'

  const stop = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/time/${active.id}`, { method: 'PATCH' })
    setActive(null)
  }

  return (
    <div
      onClick={() => router.push('/time')}
      style={{
        position: 'fixed', top: 56, left: 0, right: 0, zIndex: 45,
        background: `${color}14`,
        borderBottom: `1px solid ${color}30`,
        padding: '6px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer',
        animation: 'slideDown 0.25s var(--ease-spring) both',
      }}
    >
      {/* Pulsing dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        animation: 'pulse-dot 1.5s ease-in-out infinite', flexShrink: 0,
      }} />

      <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: '0.02em' }}>
        {active.categorie}
      </span>

      <span style={{
        fontSize: 13, fontWeight: 800, color,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        flex: 1,
      }}>
        {fmt(elapsed)}
      </span>

      <span style={{ fontSize: 11, color: `${color}99` }}>
        Tap pour gérer →
      </span>

      {/* Stop button */}
      <button
        onClick={stop}
        style={{
          width: 22, height: 22, borderRadius: 6,
          background: color, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        title="Arrêter"
      >
        <div style={{ width: 6, height: 6, background: 'white', borderRadius: 1 }} />
      </button>
    </div>
  )
}
