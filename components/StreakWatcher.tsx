'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { useOnboarding } from './Onboarding'
import { StreakModal, type StreakData } from './StreakModal'

export function StreakWatcher() {
  const { status } = useSession()
  const { show: onboardingVisible } = useOnboarding()
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (onboardingVisible) return // wait until onboarding is done
    if (fetchedRef.current) return
    fetchedRef.current = true

    const today = new Date().toDateString()
    const key = `streak_shown_${today}`
    if (localStorage.getItem(key)) return

    localStorage.setItem(key, '1')

    fetch('/api/streak', { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.isNew) setStreakData({ streak: d.streak, longest: d.longest }) })
      .catch(() => {})
  }, [status, onboardingVisible])

  if (!streakData) return null
  return <StreakModal data={streakData} onClose={() => setStreakData(null)} />
}
