'use client'

import { useSession } from 'next-auth/react'
import { useOnboarding, OnboardingModal } from './Onboarding'

export function OnboardingWatcher() {
  const { status } = useSession()
  const { show, complete } = useOnboarding()

  if (status !== 'authenticated' || !show) return null

  return <OnboardingModal onClose={complete} />
}
