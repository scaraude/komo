'use client'

import { useState, useTransition } from 'react'
import { updatePartialDays } from '@/lib/actions/presence'
import { WEEKDAYS, getDaysBetween, buildMonths } from '@/lib/calendar'

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
  const inEvent = new Set(days)
  const months = buildMonths(days)
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
      <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2 mb-3">
        Tu viens quels jours ?
      </p>

      <div className="bg-card border-[1.5px] border-line-2 rounded-[20px] p-[18px_16px] shadow-[0_2px_10px_rgba(60,45,20,.05)] flex flex-col gap-5">
        {months.map((m) => (
          <div key={m.key}>
            <div className="text-center text-[14px] font-bold text-ink mb-[14px] capitalize">
              {m.label}
            </div>

            <div className="grid grid-cols-7 gap-[4px] text-[11px] text-disabled font-bold text-center mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w.key}>{w.label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-[6px]">
              {m.cells.map((iso, idx) => {
                if (!iso) return <div key={`pad-${idx}`} aria-hidden />
                const dayNum = Number(iso.slice(8, 10))
                const isInEvent = inEvent.has(iso)

                if (!isInEvent) {
                  return (
                    <div
                      key={iso}
                      className="py-[10px] rounded-[11px] text-center text-[14px] font-semibold text-disabled-2"
                    >
                      {dayNum}
                    </div>
                  )
                }

                const checked = daysState[iso] ?? true
                return (
                  <button
                    key={iso}
                    onClick={() => handleToggle(iso)}
                    className={`py-[10px] rounded-[11px] text-center text-[14px] font-semibold cursor-pointer transition-colors ${
                      checked
                        ? 'bg-olive text-white'
                        : 'bg-olive-soft text-olive-text-dk'
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex gap-4 pt-1">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="w-3 h-3 rounded-[4px] bg-olive" />
            je viens
          </span>
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="w-3 h-3 rounded-[4px] bg-olive-soft" />
            dispo
          </span>
        </div>
      </div>
    </div>
  )
}
