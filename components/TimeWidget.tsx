'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const CAT_COLORS: Record<string, string> = {
  Travail: '#7c6af5', Meeting: '#4f8ef7', Code: '#0ec98c',
  Design: '#a855f7', Prospection: '#f59e0b', Pause: '#6b7280',
}

function fmtShort(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
}

interface ActiveSession { id: string; categorie: string; debut: string }

export function TimeWidget() {
  const { data: session } = useSession()
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval>>()

  const load = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/time?days=1')
      if (res.ok) { const { active: a } = await res.json(); setActive(a || null) }
    } catch {}
  }, [session?.user])

  useEffect(() => { load() }, [load])

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
      {/* Pulsing dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        animation: 'pulse-dot 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {fmtShort(elapsed)}
      </span>
      {/* Stop button */}
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
