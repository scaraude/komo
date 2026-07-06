'use client'

import { useState } from 'react'
import { WEEKDAYS, buildMonths } from '@/lib/calendar'
import type { Period } from '@/lib/types'

/** Aujourd'hui au format ISO local `YYYY-MM-DD` (pas d'UTC : évite de griser
 *  « aujourd'hui » en fin de soirée). */
function todayIso(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Décale une clé de mois `YYYY-MM` de `delta` mois. */
function addMonth(monthKey: string, delta: number): string {
  const y = Number(monthKey.slice(0, 4))
  const m = Number(monthKey.slice(5, 7))
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Ordonne deux dates ISO en une période (début ≤ fin). */
function order(a: string, b: string): Period {
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

/**
 * Sélecteur de plage de dates, façon comparateur de vol : on clique une date
 * de début, puis une date de fin ; la plage entre les deux se remplit (avec un
 * aperçu au survol). Un jour = une plage d'un jour. Navigation mois par mois.
 */
export function RangeCalendar({
  value,
  onChange,
  minDate,
}: {
  value: Period | null
  onChange: (period: Period) => void
  minDate?: string
}) {
  const min = minDate ?? todayIso()
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() => (value?.start ?? min).slice(0, 7))

  const month = buildMonths([`${viewMonth}-01`])[0]!
  const canPrev = viewMonth > min.slice(0, 7)

  // Plage affichée : pendant la sélection on suit l'ancre (+ survol) ; sinon la
  // valeur confirmée.
  const preview: Period | null = anchor ? order(anchor, hovered ?? anchor) : value

  function handleClick(iso: string) {
    if (iso < min) return
    if (anchor) {
      onChange(order(anchor, iso))
      setAnchor(null)
      setHovered(null)
    } else {
      setAnchor(iso)
      onChange({ start: iso, end: iso })
    }
  }

  return (
    <div className="bg-card border-[1.5px] border-line-2 rounded-[20px] p-[18px_16px] shadow-[0_2px_10px_rgba(60,45,20,.05)]">
      <div className="flex items-center justify-between mb-[14px]">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonth(m, -1))}
          disabled={!canPrev}
          aria-label="Mois précédent"
          className="w-8 h-8 grid place-items-center rounded-full text-ink disabled:text-disabled-2 disabled:cursor-not-allowed hover:bg-soft transition-colors"
        >
          ‹
        </button>
        <span className="text-[14px] font-bold text-ink capitalize">{month.label}</span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonth(m, 1))}
          aria-label="Mois suivant"
          className="w-8 h-8 grid place-items-center rounded-full text-ink hover:bg-soft transition-colors"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[4px] text-[11px] text-disabled font-bold text-center mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w.key}>{w.label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[6px]" onMouseLeave={() => setHovered(null)}>
        {month.cells.map((iso, idx) => {
          if (!iso) return <div key={`pad-${idx}`} aria-hidden />
          const dayNum = Number(iso.slice(8, 10))
          const disabled = iso < min

          if (disabled) {
            return (
              <div
                key={iso}
                className="py-[10px] rounded-[11px] text-center text-[14px] font-semibold text-disabled-2"
              >
                {dayNum}
              </div>
            )
          }

          const inRange = !!preview && iso >= preview.start && iso <= preview.end
          const isEndpoint = !!preview && (iso === preview.start || iso === preview.end)

          return (
            <button
              key={iso}
              type="button"
              onClick={() => handleClick(iso)}
              onMouseEnter={() => anchor && setHovered(iso)}
              className={`py-[10px] rounded-[11px] text-center text-[14px] font-semibold cursor-pointer transition-colors ${
                isEndpoint
                  ? 'bg-terracotta text-on-dark'
                  : inRange
                    ? 'bg-terracotta-soft text-terracotta'
                    : 'text-ink hover:bg-soft'
              }`}
            >
              {dayNum}
            </button>
          )
        })}
      </div>
    </div>
  )
}
