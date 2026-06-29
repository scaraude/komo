'use client'

import { useState } from 'react'
import { LandingForm } from './LandingForm'
import { LandingHero } from './LandingHero'

/**
 * Orchestre l'accueil : hero signature « Crew. Plan. Go. », puis formulaire de
 * création au clic sur « Go. » (transition intra-page, sans rechargement).
 */
export function LandingExperience({ showEmail }: { showEmail: boolean }) {
  const [started, setStarted] = useState(false)

  return started ? (
    <LandingForm showEmail={showEmail} onBack={() => setStarted(false)} />
  ) : (
    <LandingHero onGo={() => setStarted(true)} />
  )
}
