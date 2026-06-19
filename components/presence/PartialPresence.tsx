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

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Index lundi=0 … dimanche=6 à partir d'une date ISO (yyyy-mm-dd)
function isoWeekdayIndex(iso: string): number {
  const js = new Date(`${iso}T00:00:00`).getDay() // 0=dim … 6=sam
  return (js + 6) % 7
}

type CalendarMonth = {
  key: string
  label: string
  // cellules de la grille : null = case vide (padding), sinon date ISO
  cells: (string | null)[]
}

// Construit les grilles calendaires (1 par mois) couvrant les jours de l'event.
function buildMonths(eventDays: string[]): CalendarMonth[] {
  const months: CalendarMonth[] = []
  const seen = new Map<string, CalendarMonth>()

  for (const iso of eventDays) {
    const monthKey = iso.slice(0, 7) // yyyy-mm
    if (seen.has(monthKey)) continue

    const first = new Date(`${monthKey}-01T00:00:00`)
    const year = first.getFullYear()
    const month = first.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: (string | null)[] = []
    // padding initial pour aligner le 1er sur lundi→dimanche
    const firstIso = `${monthKey}-01`
    for (let i = 0; i < isoWeekdayIndex(firstIso); i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${monthKey}-${String(d).padStart(2, '0')}`)
    }

    const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const cal: CalendarMonth = { key: monthKey, label, cells }
    seen.set(monthKey, cal)
    months.push(cal)
  }

  return months
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
              {WEEKDAYS.map((w, i) => (
                <div key={i}>{w}</div>
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
