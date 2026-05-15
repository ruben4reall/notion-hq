'use client'

import { useAuth } from '@/context/AuthContext'
import { useOnboarding, OnboardingModal } from './Onboarding'

export function OnboardingWatcher() {
  const { status } = useAuth()
  const { show, complete } = useOnboarding()

  if (status !== 'authenticated' || !show) return null

  return <OnboardingModal onClose={complete} />
}
