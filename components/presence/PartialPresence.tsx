'use client'

import { useState, useTransition } from 'react'
import { updatePartialDays } from '@/lib/actions/presence'

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(start)
  const last = new Date(end)
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function PartialPresence({
  slug,
  participantId,
  initialDays,
  dateStart,
  dateEnd,
}: {
  slug: string
  participantId: string
  initialDays: Record<string, boolean> | null
  dateStart: string
  dateEnd: string
}) {
  const days = getDaysBetween(dateStart, dateEnd)
  const [daysState, setDaysState] = useState<Record<string, boolean>>(initialDays ?? {})
  const [, startTransition] = useTransition()

  function handleToggle(day: string) {
    const next = { ...daysState, [day]: !daysState[day] }
    const prev = daysState
    setDaysState(next)
    startTransition(async () => {
      try {
        await updatePartialDays(slug, participantId, next)
      } catch {
        setDaysState(prev)
      }
    })
  }

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold mb-3 text-muted">Tu viens quels jours ?</p>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const label = new Date(day).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'short',
          })
          const checked = daysState[day] ?? true
          return (
            <button key={day} onClick={() => handleToggle(day)}
              className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                checked ? 'border-olive bg-olive text-white' : 'border-ink bg-card text-muted line-through'
              }`}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
