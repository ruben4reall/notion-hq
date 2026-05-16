'use client'

import { useAuth } from '@/context/AuthContext'
import { useOnboarding, TourOverlay } from './Onboarding'

export function OnboardingWatcher() {
  const { status } = useAuth()
  const { show, complete, startSection } = useOnboarding()

  if (status !== 'authenticated' || !show) return null

  return <TourOverlay onComplete={complete} startSectionId={startSection} />
}
