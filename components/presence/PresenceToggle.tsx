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
    <div className="bg-track rounded-[15px] p-[5px] flex gap-[4px] mb-6">
      {OPTIONS.map((opt) => {
        const isActive = status === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`flex-1 text-center rounded-[11px] py-[13px] px-[2px] text-[12.5px] transition-all ${
              isActive
                ? 'bg-terracotta text-white font-bold shadow-[0_1px_3px_rgba(0,0,0,.15)]'
                : 'text-faint'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        )
      })}
    </div>
  )
}
