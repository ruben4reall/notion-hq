'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

export type SectionId = 'dashboard' | 'kanban' | 'crm' | 'notes' | 'calendar' | 'ideas' | 'time'

type TourStep = {
  section: SectionId
  page: string
  title: string
  desc: string
  tip?: string
  targetSelector?: string
  emoji: string
  color: string
}

export const SECTIONS: { id: SectionId; emoji: string; color: string }[] = [
  { id: 'dashboard', emoji: '🏠', color: '#7c6af5' },
  { id: 'kanban',    emoji: '📋', color: '#4f8ef7' },
  { id: 'crm',       emoji: '🤝', color: '#0ec98c' },
  { id: 'notes',     emoji: '📝', color: '#f59e0b' },
  { id: 'calendar',  emoji: '📅', color: '#06b6d4' },
  { id: 'ideas',     emoji: '💡', color: '#a855f7' },
  { id: 'time',      emoji: '⏱',  color: '#f43f5e' },
]

const OLD_KEY = 'onboarding_v1'
const SECTIONS_KEY = '_tour_sections_v2'

function getSectionsDone(): Partial<Record<SectionId, boolean>> {
  try { return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') } catch { return {} }
}

function isAllDone(): boolean {
  if (typeof window === 'undefined') return true
  try { if (localStorage.getItem(OLD_KEY) === '1') return true } catch {}
  const done = getSectionsDone()
  return SECTIONS.every(s => done[s.id])
}

// Module-level store so all useOnboarding() instances share the same state
let _show = false
let _startSection: SectionId | null = null
const _listeners = new Set<() => void>()

function _setGlobal(show: boolean, startSection: SectionId | null) {
  _show = show
  _startSection = startSection
  _listeners.forEach(fn => fn())
}

export function useOnboarding() {
  const [show, setShow] = useState(() => _show)
  const [startSection, setStartSection] = useState<SectionId | null>(() => _startSection)

  useEffect(() => {
    const sync = () => {
      setShow(_show)
      setStartSection(_startSection)
    }
    _listeners.add(sync)
    return () => { _listeners.delete(sync) }
  }, [])

  useEffect(() => {
    if (_show) return
    if (isAllDone()) return
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(({ done }) => {
        if (done) {
          try { localStorage.setItem(OLD_KEY, '1') } catch {}
        } else {
          _setGlobal(true, null)
        }
      })
      .catch(() => {
        try { if (!localStorage.getItem(OLD_KEY)) _setGlobal(true, null) } catch {}
      })
  }, [])

  const complete = useCallback(() => {
    try {
      localStorage.setItem(OLD_KEY, '1')
      const sections: Partial<Record<SectionId, boolean>> = {}
      SECTIONS.forEach(s => { sections[s.id] = true })
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections))
    } catch {}
    _setGlobal(false, null)
    fetch('/api/onboarding', { method: 'POST' }).catch(() => {})
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(OLD_KEY)
      localStorage.removeItem(SECTIONS_KEY)
    } catch {}
    _setGlobal(true, null)
    fetch('/api/onboarding', { method: 'DELETE' }).catch(() => {})
  }, [])

  const resetSection = useCallback((sectionId: SectionId) => {
    try {
      localStorage.removeItem(OLD_KEY)
      const sections = getSectionsDone()
      sections[sectionId] = false
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections))
    } catch {}
    _setGlobal(true, sectionId)
  }, [])

  return { show, complete, reset, resetSection, startSection }
}

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  const [dims, setDims] = useState({ w: 1920, h: 1080 })

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { w, h } = dims
  const PADDING = 10

  if (!rect) {
    return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 9000 }} />
  }

  const x1 = Math.max(0, rect.left - PADDING)
  const y1 = Math.max(0, rect.top - PADDING)
  const x2 = Math.min(w, rect.right + PADDING)
  const y2 = Math.min(h, rect.bottom + PADDING)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <mask id="tour-spotlight">
            <rect width={w} height={h} fill="white" />
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} rx="12" fill="black" />
          </mask>
        </defs>
        <rect width={w} height={h} fill="rgba(0,0,0,0.82)" mask="url(#tour-spotlight)" />
        <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} rx="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

function TourTooltip({
  step, sectionStepIndex, sectionTotal, targetRect, totalSteps, currentStepGlobal,
  onNext, onPrev, onSkip, isFirst, isLast,
}: {
  step: TourStep
  sectionStepIndex: number
  sectionTotal: number
  targetRect: DOMRect | null
  totalSteps: number
  currentStepGlobal: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const { t } = useLanguage()
  const [screenH, setScreenH] = useState(800)
  useEffect(() => {
    setScreenH(window.innerHeight)
    const update = () => setScreenH(window.innerHeight)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  let top: number
  const TOOLTIP_H = step.tip ? 290 : 240
  if (!targetRect) {
    top = Math.max(16, screenH / 2 - TOOLTIP_H / 2)
  } else if (targetRect.bottom + TOOLTIP_H + 24 < screenH) {
    top = targetRect.bottom + 20
  } else {
    top = Math.max(16, targetRect.top - TOOLTIP_H - 20)
  }

  return (
    <div
      key={`${step.section}-${sectionStepIndex}`}
      style={{
        position: 'fixed',
        top: Math.max(12, top),
        left: 16,
        right: 16,
        maxWidth: 420,
        margin: '0 auto',
        zIndex: 9002,
        background: 'var(--bg-1)',
        border: '1px solid var(--border-m)',
        borderRadius: 20,
        padding: '20px 20px 16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        animation: 'floatIn 0.25s var(--ease-spring) both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: `${step.color}18`, border: `1px solid ${step.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {step.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t0)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {step.title}
          </p>
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
            {t(step.section)} · {t('tourStep')} {sectionStepIndex + 1}/{sectionTotal}
          </p>
        </div>
        <button
          onClick={onSkip}
          style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 20, cursor: 'pointer', padding: 2, lineHeight: 1, flexShrink: 0, marginTop: -2 }}
        >
          ×
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.65, marginBottom: step.tip ? 10 : 14 }}>
        {step.desc}
      </p>

      {step.tip && (
        <div style={{
          background: `${step.color}0d`, border: `1px solid ${step.color}22`,
          borderRadius: 10, padding: '8px 12px', marginBottom: 14,
        }}>
          <p style={{ fontSize: 12, color: step.color, fontWeight: 500 }}>💡 {step.tip}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
        {Array.from({ length: sectionTotal }).map((_, i) => (
          <div key={i} style={{
            width: i === sectionStepIndex ? 16 : 5, height: 5, borderRadius: 100,
            background: i === sectionStepIndex ? step.color : 'var(--bg-4)',
            transition: 'all 0.3s var(--ease-spring)',
          }} />
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t2)' }}>
          {currentStepGlobal + 1}/{totalSteps}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {!isFirst && (
          <button
            onClick={onPrev}
            style={{
              padding: '9px 14px', borderRadius: 10,
              background: 'var(--bg-3)', border: '1px solid var(--border-m)',
              color: 'var(--t1)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← {t('back')}
          </button>
        )}
        <button
          onClick={onNext}
          style={{
            flex: 1, padding: '9px 16px', borderRadius: 10,
            background: step.color, border: 'none', color: 'white',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 16px ${step.color}50`,
          }}
        >
          {isLast ? t('tourBegin') : `${t('next')} →`}
        </button>
      </div>
    </div>
  )
}

export function TourOverlay({ onComplete, startSectionId }: { onComplete: () => void; startSectionId?: SectionId | null }) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()

  const STEPS: TourStep[] = [
    {
      section: 'dashboard', page: '/',
      emoji: '🏠', color: '#7c6af5',
      title: t('tourDashboard1Title'),
      desc: t('tourDashboard1Desc'),
      tip: t('tourDashboard1Tip'),
    },
    {
      section: 'dashboard', page: '/',
      emoji: '📊', color: '#7c6af5',
      title: t('tourDashboard2Title'),
      desc: t('tourDashboard2Desc'),
      tip: t('tourDashboard2Tip'),
      targetSelector: '[data-tour="kpi-grid"]',
    },
    {
      section: 'dashboard', page: '/',
      emoji: '✅', color: '#7c6af5',
      title: t('tourDashboard3Title'),
      desc: t('tourDashboard3Desc'),
      tip: t('tourDashboard3Tip'),
      targetSelector: '[data-tour="recent-tasks"]',
    },
    {
      section: 'kanban', page: '/kanban',
      emoji: '📋', color: '#4f8ef7',
      title: t('tourKanbanTitle'),
      desc: t('tourKanbanDesc'),
      tip: t('tourKanbanTip'),
      targetSelector: '[data-tour="kanban-board"]',
    },
    {
      section: 'crm', page: '/crm',
      emoji: '🤝', color: '#0ec98c',
      title: t('tourCrmTitle'),
      desc: t('tourCrmDesc'),
      tip: t('tourCrmTip'),
      targetSelector: '[data-tour="crm-pipeline"]',
    },
    {
      section: 'notes', page: '/notes',
      emoji: '📝', color: '#f59e0b',
      title: t('tourNotesTitle'),
      desc: t('tourNotesDesc'),
      tip: t('tourNotesTip'),
      targetSelector: '[data-tour="notes-workspace"]',
    },
    {
      section: 'calendar', page: '/calendar',
      emoji: '📅', color: '#06b6d4',
      title: t('tourCalendarTitle'),
      desc: t('tourCalendarDesc'),
      tip: t('tourCalendarTip'),
      targetSelector: '[data-tour="calendar-grid"]',
    },
    {
      section: 'ideas', page: '/ideas',
      emoji: '💡', color: '#a855f7',
      title: t('tourIdeasTitle'),
      desc: t('tourIdeasDesc'),
      tip: t('tourIdeasTip'),
      targetSelector: '[data-tour="ideas-board"]',
    },
    {
      section: 'time', page: '/time',
      emoji: '⏱', color: '#f43f5e',
      title: t('tourTimeTitle'),
      desc: t('tourTimeDesc'),
      tip: t('tourTimeTip'),
      targetSelector: '[data-tour="time-tracker"]',
    },
  ]

  const getInitialStep = useCallback(() => {
    if (startSectionId) {
      const idx = STEPS.findIndex(s => s.section === startSectionId)
      return idx >= 0 ? idx : 0
    }
    if (typeof window !== 'undefined') {
      const done = getSectionsDone()
      for (let i = 0; i < STEPS.length; i++) {
        if (!done[STEPS[i].section]) return i
      }
    }
    return 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSectionId])

  const [stepIndex, setStepIndex] = useState(getInitialStep)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipReady, setTooltipReady] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const step = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isNavigating = step && pathname !== step.page

  const sectionStepsArr = step ? STEPS.filter(s => s.section === step.section) : []
  const sectionIdx = step ? sectionStepsArr.indexOf(step) : 0
  const isLastInSection = sectionIdx === sectionStepsArr.length - 1
  const isLast = stepIndex === STEPS.length - 1 || (!!startSectionId && isLastInSection)

  useEffect(() => {
    if (!step || isNavigating) {
      setTargetRect(null)
      setTooltipReady(false)
      return
    }
    if (pollRef.current) clearTimeout(pollRef.current)
    setTargetRect(null)

    if (!step.targetSelector) {
      setTooltipReady(true)
      return
    }

    setTooltipReady(false)
    let attempts = 0
    const poll = () => {
      const el = document.querySelector(step.targetSelector!)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        setTooltipReady(true)
      } else if (attempts < 25) {
        attempts++
        pollRef.current = setTimeout(poll, 100)
      } else {
        setTooltipReady(true)
      }
    }
    pollRef.current = setTimeout(poll, 150)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [stepIndex, pathname, isNavigating])

  useEffect(() => {
    if (step && isNavigating) router.push(step.page)
  }, [step, isNavigating, router])

  useEffect(() => {
    if (!targetRect || !step?.targetSelector) return
    const update = () => {
      const el = document.querySelector(step.targetSelector!)
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [targetRect, step?.targetSelector])

  const markCurrentSectionDone = useCallback((currentStep: TourStep) => {
    try {
      const sections = getSectionsDone()
      sections[currentStep.section] = true
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections))
    } catch {}
  }, [])

  const next = useCallback(() => {
    if (!step) return
    if (isLast) {
      markCurrentSectionDone(step)
      onComplete()
      return
    }
    const nextStep = STEPS[stepIndex + 1]
    if (nextStep.section !== step.section) {
      markCurrentSectionDone(step)
      if (startSectionId) { onComplete(); return }
    }
    setStepIndex(s => s + 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLast, stepIndex, onComplete, markCurrentSectionDone, startSectionId])

  const prev = useCallback(() => {
    if (!isFirst) setStepIndex(s => s - 1)
  }, [isFirst])

  if (!step) return null

  if (isNavigating) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-m)', borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: step.color, animation: 'pulse-dot 1.2s ease infinite' }} />
          <p style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>{t('navigatingTo')} {t(step.section)}…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <SpotlightOverlay rect={targetRect} />
      {tooltipReady ? (
        <TourTooltip
          step={step}
          sectionStepIndex={sectionIdx}
          sectionTotal={sectionStepsArr.length}
          targetRect={targetRect}
          totalSteps={STEPS.length}
          currentStepGlobal={stepIndex}
          onNext={next}
          onPrev={prev}
          onSkip={onComplete}
          isFirst={isFirst}
          isLast={isLast}
        />
      ) : (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9002, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-1)', border: '1px solid var(--border-m)',
          borderRadius: 99, padding: '8px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%', background: step.color,
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}
    </>
  )
}

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  return <TourOverlay onComplete={onClose} />
}
