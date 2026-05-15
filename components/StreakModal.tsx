'use client'

import { useState, useEffect, useMemo } from 'react'

export interface StreakData {
  streak: number
  longest: number
}

function getEmoji(n: number) {
  if (n >= 30) return '👑'
  if (n >= 14) return '🔥'
  if (n >= 7)  return '💪'
  if (n >= 4)  return '🌟'
  return '⚡'
}

function getMessage(n: number): [string, string] {
  if (n === 1)  return ["Jour 1", "C'est parti ! Premier pas du streak !"]
  if (n === 2)  return ["2 jours !", "Deux de suite, belle lancée !"]
  if (n === 3)  return ["3 jours !", "Le rythme est là, continue !"]
  if (n < 7)   return [`${n} jours !`, `${n} jours d'affilée — tu assures !`]
  if (n === 7)  return ["Une semaine !", "7 jours complets — impressionnant !"]
  if (n < 14)  return [`${n} jours !`, `Plus d'une semaine sans pause — incroyable !`]
  if (n === 14) return ["Deux semaines !", "14 jours consécutifs — tu es en feu !"]
  if (n < 30)  return [`${n} jours !`, `Quelle régularité — record en vue !`]
  if (n === 30) return ["Un mois !", "30 jours sans interruption — tu es une légende !"]
  return [`${n} jours !`, `Absolument inarrêtable — continue comme ça !`]
}

function isMilestone(n: number) {
  return [7, 14, 21, 30, 50, 100].includes(n)
}

// Fixed particle positions to avoid random hydration issues
const PARTICLES = [
  { emoji: '⭐', x: 12,  y: 18,  delay: 0 },
  { emoji: '✨', x: 82,  y: 12,  delay: 0.12 },
  { emoji: '🎉', x: 25,  y: 72,  delay: 0.08 },
  { emoji: '💫', x: 75,  y: 68,  delay: 0.2 },
  { emoji: '🌟', x: 50,  y: 8,   delay: 0.05 },
  { emoji: '🎊', x: 88,  y: 40,  delay: 0.16 },
  { emoji: '⚡', x: 8,   y: 50,  delay: 0.1 },
  { emoji: '✨', x: 60,  y: 82,  delay: 0.22 },
]

function useCountUp(target: number, duration = 900, delay = 300) {
  const [count, setCount] = useState(target <= 3 ? 0 : target - 3)
  useEffect(() => {
    const t0 = setTimeout(() => {
      const start = Date.now()
      const from = target <= 3 ? 0 : target - 3
      if (target === from) { setCount(target); return }
      const timer = setInterval(() => {
        const p = Math.min((Date.now() - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setCount(Math.round(from + eased * (target - from)))
        if (p >= 1) clearInterval(timer)
      }, 16)
      return () => clearInterval(timer)
    }, delay)
    return () => clearTimeout(t0)
  }, [target, duration, delay])
  return count
}

export function StreakModal({ data, onClose }: { data: StreakData; onClose: () => void }) {
  const count = useCountUp(data.streak)
  const emoji = getEmoji(data.streak)
  const [title, message] = getMessage(data.streak)
  const milestone = isMilestone(data.streak)
  const isRecord = data.streak > 1 && data.streak >= data.longest

  return (
    <div
      className="streak-overlay"
      onClick={onClose}
    >
      <div
        className="streak-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow behind number */}
        <div className="streak-glow" />

        {/* Milestone particles */}
        {milestone && PARTICLES.map((p, i) => (
          <div key={i} className="streak-particle" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
          }}>
            {p.emoji}
          </div>
        ))}

        {/* Emoji */}
        <div className="streak-emoji">{emoji}</div>

        {/* Big number */}
        <div className="streak-number">{count}</div>
        <div className="streak-label">
          {data.streak === 1 ? 'jour de streak' : 'jours de streak'}
        </div>

        {/* Title + message */}
        <p className="streak-title">{title}</p>
        <p className="streak-message">{message}</p>

        {/* Record badge */}
        {isRecord ? (
          <div className="streak-record-badge">
            🏆 Nouveau record personnel !
          </div>
        ) : data.longest > 0 ? (
          <div className="streak-best">
            Record : {data.longest} {data.longest === 1 ? 'jour' : 'jours'}
          </div>
        ) : null}

        {/* Progress dots for next milestone */}
        <NextMilestone streak={data.streak} />

        <button className="streak-btn" onClick={onClose}>
          Continuer →
        </button>
      </div>
    </div>
  )
}

function NextMilestone({ streak }: { streak: number }) {
  const milestones = [7, 14, 30, 50, 100]
  const next = milestones.find(m => m > streak)
  if (!next) return null
  const prev = milestones.find(m => m < next) ?? 0
  const progress = (streak - prev) / (next - prev)
  const remaining = next - streak

  return (
    <div style={{ width: '100%', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>
        <span>Prochain objectif : {next} jours</span>
        <span>{remaining} jour{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 100,
          background: 'linear-gradient(90deg, var(--accent), #a78bfa)',
          width: `${Math.min(progress * 100, 100)}%`,
          transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>
    </div>
  )
}
