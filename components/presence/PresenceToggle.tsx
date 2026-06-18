'use client'

import { useState, useTransition } from 'react'
import { updatePresence } from '@/lib/actions/presence'

type Status = 'hot' | 'maybe' | 'unsure' | 'no' | null

const OPTIONS = [
  { value: 'hot' as const, emoji: '🔥', label: 'Chaud' },
  { value: 'maybe' as const, emoji: '🤔', label: 'Probable' },
  { value: 'unsure' as const, emoji: '😬', label: 'Pas sûr' },
  { value: 'no' as const, emoji: '❌', label: 'Non' },
]

export function PresenceToggle({
  slug,
  participantId,
  initialStatus,
}: {
  slug: string
  participantId: string
  initialStatus: Status
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [, startTransition] = useTransition()

  function handleSelect(next: Status) {
    if (next === status || !next) return
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {OPTIONS.map((opt) => {
        const isActive = status === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
              isActive
                ? 'border-ink bg-ink text-paper shadow-none translate-y-0.5'
                : 'border-ink bg-card text-ink shadow-[0_3px_0_rgba(26,20,16,0.9)] hover:translate-y-0.5 hover:shadow-none'
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
