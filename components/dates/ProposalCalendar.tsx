'use client'

import { useMemo, useState } from 'react'
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

/** Un créneau proposé, prêt à être dessiné en bandeau sur le calendrier. */
export type CalendarProposal = {
  id: string
  start: string
  end: string
  /** Couleur du bandeau (déclinaison de la charte). */
  color: string
  /** Part des votes (0..1) — pilote l'opacité : plus le crew peut, plus le bandeau est franc. */
  intensity: number
  /** Libellé court affiché dans le bandeau (ex. « 3/5 »). */
  label: string
  ariaLabel: string
  selected: boolean
  /** Estompé (un participant est mis en avant et n'a pas voté ce créneau). */
  dimmed: boolean
  /** Tout le monde peut : le bandeau pulse. */
  full: boolean
}

/**
 * Le calendrier du sondage de dates : les créneaux proposés y vivent en
 * bandeaux colorés sous les jours (façon agenda), tapables pour voir le
 * détail. Passe en mode sélection (`selecting`) pour proposer un nouveau
 * créneau : clic début → clic fin, comme un comparateur de vols.
 */
export function ProposalCalendar({
  proposals,
  onProposalClick,
  selecting = false,
  range = null,
  onRangeChange,
  minDate,
}: {
  proposals: CalendarProposal[]
  onProposalClick: (id: string) => void
  selecting?: boolean
  range?: Period | null
  onRangeChange?: (period: Period) => void
  minDate?: string
}) {
  const min = minDate ?? todayIso()
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() =>
    (range?.start ?? proposals[0]?.start ?? min).slice(0, 7),
  )

  // Changement de mode : on oublie une éventuelle sélection en cours
  // (ajustement d'état pendant le rendu, pas d'effet nécessaire).
  const [previousSelecting, setPreviousSelecting] = useState(selecting)
  if (previousSelecting !== selecting) {
    setPreviousSelecting(selecting)
    setAnchor(null)
    setHovered(null)
  }

  // Chaque créneau garde sa « voie » d'une semaine à l'autre (coloriage
  // glouton d'intervalles : première voie libérée avant le début du créneau).
  const laneById = useMemo(() => {
    const laneEnds: string[] = []
    const byId: Record<string, number> = {}
    for (const proposal of [...proposals].sort((a, b) => a.start.localeCompare(b.start))) {
      let lane = laneEnds.findIndex((end) => end < proposal.start)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(proposal.end)
      } else {
        laneEnds[lane] = proposal.end
      }
      byId[proposal.id] = lane
    }
    return byId
  }, [proposals])

  const month = buildMonths([`${viewMonth}-01`])[0]!
  const canPrev = viewMonth > min.slice(0, 7)

  const cells = [...month.cells]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  // Plage affichée en mode sélection : pendant la saisie on suit l'ancre
  // (+ survol) ; sinon la valeur confirmée.
  const preview: Period | null = anchor ? order(anchor, hovered ?? anchor) : range

  function handleDayClick(iso: string) {
    if (!selecting || !onRangeChange || iso < min) return
    if (anchor) {
      onRangeChange(order(anchor, iso))
      setAnchor(null)
      setHovered(null)
    } else {
      setAnchor(iso)
      onRangeChange({ start: iso, end: iso })
    }
  }

  function renderDayCell(iso: string | null, index: number) {
    if (!iso) return <div key={`pad-${index}`} aria-hidden />
    const dayNumber = Number(iso.slice(8, 10))
    const past = iso < min

    if (!selecting || past) {
      return (
        <div
          key={iso}
          className={`py-[8px] text-center text-[13.5px] font-semibold ${
            past ? 'text-disabled-2' : 'text-ink'
          }`}
        >
          {dayNumber}
        </div>
      )
    }

    const inRange = !!preview && iso >= preview.start && iso <= preview.end
    const isEndpoint = !!preview && (iso === preview.start || iso === preview.end)

    return (
      <button
        key={iso}
        type="button"
        onClick={() => handleDayClick(iso)}
        onMouseEnter={() => anchor && setHovered(iso)}
        className={`cursor-pointer rounded-[11px] py-[8px] text-center text-[13.5px] font-semibold transition-colors ${
          isEndpoint
            ? 'bg-terracotta text-on-dark'
            : inRange
              ? 'bg-terracotta-soft text-terracotta'
              : 'text-ink hover:bg-soft'
        }`}
      >
        {dayNumber}
      </button>
    )
  }

  return (
    <div className="rounded-[20px] border-[1.5px] border-line-2 bg-card p-[18px_16px] shadow-[0_2px_10px_rgba(60,45,20,.05)]">
      <div className="mb-[14px] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonth(m, -1))}
          disabled={!canPrev}
          aria-label="Mois précédent"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors hover:bg-soft disabled:cursor-not-allowed disabled:text-disabled-2"
        >
          ‹
        </button>
        <span className="text-[14px] font-bold capitalize text-ink">{month.label}</span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonth(m, 1))}
          aria-label="Mois suivant"
          className="grid h-8 w-8 place-items-center rounded-full text-ink transition-colors hover:bg-soft"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-[4px] text-center text-[11px] font-bold text-disabled">
        {WEEKDAYS.map((w) => (
          <div key={w.key}>{w.label}</div>
        ))}
      </div>

      <div onMouseLeave={() => setHovered(null)}>
        {weeks.map((weekCells, weekIndex) => {
          const weekDays = weekCells.filter((c): c is string => c !== null)
          if (weekDays.length === 0) return null
          const weekStart = weekDays[0]!
          const weekEnd = weekDays[weekDays.length - 1]!
          const weekProposals = proposals.filter(
            (proposal) => proposal.start <= weekEnd && proposal.end >= weekStart,
          )
          const laneCount =
            weekProposals.length > 0
              ? Math.max(...weekProposals.map((proposal) => laneById[proposal.id] ?? 0)) + 1
              : 0

          return (
            <div key={weekIndex} className="mb-[2px]">
              <div className="grid grid-cols-7 gap-[6px]">{weekCells.map(renderDayCell)}</div>
              {Array.from({ length: laneCount }, (_, lane) => (
                <div
                  key={lane}
                  className={`mt-[3px] grid grid-cols-7 gap-[6px] ${
                    selecting ? 'pointer-events-none' : ''
                  }`}
                >
                  {weekProposals
                    .filter((proposal) => laneById[proposal.id] === lane)
                    .map((proposal) => {
                      const segmentStart = proposal.start < weekStart ? weekStart : proposal.start
                      const segmentEnd = proposal.end > weekEnd ? weekEnd : proposal.end
                      const startColumn = weekCells.indexOf(segmentStart) + 1
                      const span = weekCells.indexOf(segmentEnd) + 2 - startColumn
                      const roundedStart = segmentStart === proposal.start
                      const roundedEnd = segmentEnd === proposal.end
                      return (
                        <button
                          key={proposal.id}
                          type="button"
                          onClick={() => onProposalClick(proposal.id)}
                          aria-label={proposal.ariaLabel}
                          aria-pressed={proposal.selected}
                          style={{
                            gridColumn: `${startColumn} / span ${span}`,
                            backgroundColor: proposal.color,
                            opacity: selecting
                              ? 0.3
                              : proposal.dimmed
                                ? 0.18
                                : 0.55 + 0.45 * proposal.intensity,
                          }}
                          className={`h-[20px] min-w-0 cursor-pointer truncate text-[10.5px] font-bold text-white transition-all ${
                            roundedStart ? 'rounded-l-full' : ''
                          } ${roundedEnd ? 'rounded-r-full' : ''} ${
                            proposal.selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''
                          } ${proposal.full && !proposal.dimmed && !proposal.selected ? 'animate-pulse-dot' : ''}`}
                        >
                          {proposal.label}
                        </button>
                      )
                    })}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
