'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  {
    id: 'dashboard',
    href: '/',
    emoji: '🏠',
    title: 'Dashboard',
    desc: 'Ton hub central. KPIs en temps réel, tâches urgentes, pipeline et top idées — tout d\'un coup d\'œil.',
    tip: 'Le bandeau rouge en haut t\'alerte si tu as des tâches en retard.',
    color: '#7c6af5',
  },
  {
    id: 'kanban',
    href: '/kanban',
    emoji: '📋',
    title: 'Kanban',
    desc: 'Glisse tes tâches de Backlog → Done. Assigne-les à Ruben ou Alexandre, filtre par personne.',
    tip: 'Les cartes en rouge sont en retard. En amber = deadline aujourd\'hui.',
    color: '#4f8ef7',
  },
  {
    id: 'crm',
    href: '/crm',
    emoji: '🤝',
    title: 'CRM Pipeline',
    desc: 'Suis tes prospects de la prise de contact jusqu\'à la signature. Vue Kanban avec drag & drop.',
    tip: 'Assigne chaque prospect à un commercial et filtre par assigné.',
    color: '#0ec98c',
  },
  {
    id: 'calendar',
    href: '/calendar',
    emoji: '📅',
    title: 'Calendrier',
    desc: 'Connecte ton calendrier Apple ou Google via une URL iCal. Tes événements apparaissent ici.',
    tip: 'Va dans Paramètres → Calendrier pour coller ton URL iCal.',
    color: '#f59e0b',
  },
  {
    id: 'ideas',
    href: '/ideas',
    emoji: '💡',
    title: 'Idées',
    desc: 'Capture tes idées, vote pour les meilleures, fais-les passer de Brute → Validée.',
    tip: 'Le vote ▲ fait remonter les meilleures idées en haut de liste.',
    color: '#a855f7',
  },
  {
    id: 'time',
    href: '/time',
    emoji: '⏱',
    title: 'Temps',
    desc: 'Lance un timer par catégorie (Travail, Code, Meeting…). Le leaderboard montre qui bosse le plus.',
    tip: 'Quand un timer tourne, une barre apparaît en haut sur toutes les pages.',
    color: '#f43f5e',
  },
]

const KEY = 'onboarding_v1'

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const done = localStorage.getItem(KEY)
      if (!done) setShow(true)
    } catch {}
  }, [])

  const complete = () => {
    try { localStorage.setItem(KEY, '1') } catch {}
    setShow(false)
  }

  const reset = () => {
    try { localStorage.removeItem(KEY) } catch {}
    setShow(true)
  }

  return { show, complete, reset }
}

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const router = useRouter()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) {
      onClose()
    } else {
      setStep(s => s + 1)
    }
  }

  const goTo = () => {
    onClose()
    router.push(current.href)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom)',
    }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,12,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: 'var(--bg-1)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border-m)', borderBottom: 'none',
        padding: '24px 24px 32px',
        animation: 'floatIn 0.35s var(--ease-spring) both',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 100,
                background: i === step ? current.color : 'var(--bg-4)',
                transition: 'all 0.3s var(--ease-spring)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div key={step} style={{ animation: 'fadeIn 0.2s ease both' }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: `${current.color}18`,
            border: `1px solid ${current.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, marginBottom: 16,
          }}>
            {current.emoji}
          </div>

          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.025em', marginBottom: 8 }}>
            {current.title}
          </p>
          <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.6, marginBottom: 12 }}>
            {current.desc}
          </p>

          {/* Tip */}
          <div style={{
            background: `${current.color}0d`, border: `1px solid ${current.color}22`,
            borderRadius: 10, padding: '10px 12px', marginBottom: 24,
          }}>
            <p style={{ fontSize: 12, color: current.color, fontWeight: 500 }}>
              💡 {current.tip}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={goTo}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 10,
              background: 'var(--bg-3)', border: '1px solid var(--border-m)',
              color: 'var(--t1)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Voir {current.title} →
          </button>
          <button
            onClick={next}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 10,
              background: current.color, border: 'none',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 16px ${current.color}44`,
            }}
          >
            {isLast ? 'Commencer 🚀' : 'Suivant →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onClose}
            style={{
              display: 'block', margin: '14px auto 0', background: 'none',
              border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
            }}
          >
            Passer le guide
          </button>
        )}
      </div>
    </div>
  )
}
