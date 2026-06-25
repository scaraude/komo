'use client'

import { useState, useTransition } from 'react'
import { updatePresence } from '@/lib/actions/presence'

type Status = 'hot' | 'maybe' | 'unsure' | 'no' | null

const DISPLAY: Record<'hot' | 'maybe' | 'unsure' | 'no', { emoji: string; label: string }> = {
  hot: { emoji: '🔥', label: 'Chaud' },
  maybe: { emoji: '🤔', label: 'Probable' },
  unsure: { emoji: '😬', label: 'Pas sûr' },
  no: { emoji: '❌', label: 'Non' },
}

// Cycle au clic : ? → 🔥 → 🤔 → ❌ → ?. Le statut legacy « pas sûr » (😬) n'est
// pas dans le cycle (indexOf = -1) : un clic le ramène donc à « non déclaré ».
const CYCLE: Status[] = [null, 'hot', 'maybe', 'no']

/**
 * Badge de statut de présence cliquable, dans la liste des potes. N'importe quel
 * membre peut faire évoluer le statut de n'importe qui (utile pour les profils
 * sans compte qui ne peuvent pas se déclarer). Optimiste + rollback.
 */
export function PresenceCycle({
  slug,
  participantId,
  initialStatus,
  pseudo,
}: {
  slug: string
  participantId: string
  initialStatus: Status
  pseudo: string
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [, startTransition] = useTransition()

  function handleClick() {
    const next = CYCLE[(CYCLE.indexOf(status) + 1) % CYCLE.length]!
    const prev = status
    setStatus(next)
    startTransition(async () => {
      try {
        await updatePresence(slug, participantId, next)
      } catch {
        setStatus(prev)
      }
    })
  }

  const conf = status ? DISPLAY[status] : null
  const label = conf ? conf.label : 'Non déclaré'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Statut de ${pseudo} : ${label}. Cliquer pour changer.`}
      title={`${label} — clic pour changer`}
      className="flex h-8 w-8 items-center justify-center rounded-full text-base transition-colors hover:bg-soft active:scale-95"
    >
      {conf ? conf.emoji : <span className="text-xs text-muted">?</span>}
    </button>
  )
}
