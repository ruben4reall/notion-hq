'use client'

import Link from 'next/link'
import { useTimer } from '@/lib/timer-context'
import { useSession } from 'next-auth/react'

const CAT_COLORS: Record<string, string> = {
  Travail: '#7c6af5', Meeting: '#4f8ef7', Code: '#0ec98c',
  Design: '#a855f7', Prospection: '#f59e0b', Pause: '#6b7280',
}

function fmtShort(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TimeWidget() {
  const { data: session } = useSession()
  const { active, elapsed, setActive } = useTimer()

  const stop = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!active) return
    await fetch(`/api/time/${active.id}`, { method: 'PATCH' })
    setActive(null)
  }

  if (!session?.user || !active) return null

  const color = CAT_COLORS[active.categorie] || '#7c6af5'

  return (
    <Link
      href="/time"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: `${color}18`, border: `1px solid ${color}44`,
        borderRadius: 100, padding: '3px 10px 3px 8px',
        textDecoration: 'none', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      title={`Session en cours : ${active.categorie}`}
    >
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        animation: 'pulse-dot 1.5s ease-in-out infinite', flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {fmtShort(elapsed)}
      </span>
      <button
        onClick={stop}
        style={{
          width: 14, height: 14, borderRadius: 3, background: color,
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
        title="Arrêter"
      >
        <div style={{ width: 5, height: 5, background: 'white', borderRadius: 1 }} />
      </button>
    </Link>
  )
}
