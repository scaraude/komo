'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Sheet } from '@/components/ui/Sheet'
import { toggleActivitySignup } from '@/lib/actions/activities'
import { updatePartialDays, updatePresence } from '@/lib/actions/presence'
import { formatDayLabel, getDaysBetween } from '@/lib/calendar'
import { formatEventDates, hhmm } from '@/lib/format'
import { googleMapsUrl } from '@/lib/maps'
import { MODE_ICON } from '@/lib/transport/modes'
import {
  buildTimeline,
  classifyDayPresence,
  SLOT_LABEL,
  type DayPresence,
  type TimelineItem,
  type TimelineSlot,
} from '@/lib/timeline'
import type {
  Activity,
  ActivitySignup,
  Leg,
  Meal,
  MealOwner,
  Occupant,
  Participant,
  Product,
} from '@/lib/types'

type TimelineFilter = 'all' | 'transport' | 'food' | 'activity' | 'presence' | 'mine'

const FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'transport', label: '🚗 Transport' },
  { key: 'food', label: '🍽️ Bouffe' },
  { key: 'activity', label: '🎟️ Activités' },
  { key: 'presence', label: '👥 Présence' },
  { key: 'mine', label: '🔥 Moi' },
]

// Accents par type d'item — familles de la charte (le transport en encre :
// c'est l'ossature du séjour, les activités gardent le rouge héros).
const ACCENT = {
  transport: { knot: 'border-ink', bar: 'bg-ink', text: 'text-ink', pill: 'bg-track text-body' },
  arrival: { knot: 'border-lavender-deep', bar: 'bg-lavender-deep', text: 'text-lavender-deep', pill: 'bg-lavender-soft text-lavender-deep' },
  activity: { knot: 'border-terracotta', bar: 'bg-terracotta', text: 'text-terracotta', pill: 'bg-terracotta-soft text-terracotta' },
  apero: { knot: 'border-prune', bar: 'bg-prune', text: 'text-prune', pill: 'bg-prune-soft text-prune' },
  meal: { knot: 'border-olive', bar: 'bg-olive', text: 'text-olive-text', pill: 'bg-olive-soft text-olive-text-dk' },
} as const

// formatDayLabel renvoie « ven. 5 juil. » — on ne capitalise que la 1re lettre
// (la classe CSS `capitalize` mettrait aussi « Juil. » en majuscule).
function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isApero(label: string): boolean {
  return /ap[ée]ro/i.test(label)
}

function accentOf(item: TimelineItem) {
  if (item.kind === 'activity') return isApero(item.activity.label) ? ACCENT.apero : ACCENT.activity
  return ACCENT[item.kind]
}

function iconOf(item: TimelineItem): string {
  switch (item.kind) {
    case 'transport': return MODE_ICON[item.leg.mode] ?? '🚗'
    case 'arrival': return '👋'
    case 'activity': return isApero(item.activity.label) ? '🍻' : '🎟️'
    case 'meal': return item.meal.is_restaurant ? '🍴' : '🍳'
  }
}

function priceLabel(activity: Activity): string | null {
  if (activity.price == null || activity.price_type == null) return null
  const suffix = { total: '', per_person: ' / pers', per_group: ' / groupe' }[activity.price_type]
  return `${activity.price} €${suffix}`
}

type PresenceStatus = 'hot' | 'maybe' | 'unsure' | 'no'

// Emoji par état de présence — même langage que la liste des potes (PresenceCycle).
const PRESENCE_EMOJI: Record<DayPresence, string> = { in: '🔥', maybe: '🤔', out: '❌', pending: '❔' }

// Groupes affichés dans la sheet de présence, dans l'ordre.
const PRESENCE_GROUPS: { key: DayPresence; label: string }[] = [
  { key: 'in', label: 'Là ce jour' },
  { key: 'maybe', label: 'Peut-être' },
  { key: 'pending', label: 'Pas encore répondu' },
  { key: 'out', label: 'Pas ce jour' },
]

function emptyBreakdown(): Record<DayPresence, Participant[]> {
  return { in: [], maybe: [], out: [], pending: [] }
}

function presenceBreakdown(people: Participant[], day: string): Record<DayPresence, Participant[]> {
  const acc = emptyBreakdown()
  for (const p of people) acc[classifyDayPresence(p.presence_status, p.partial_days, day)].push(p)
  return acc
}

export function TimelinePanel({
  slug,
  eventId,
  participantId,
  dateStart,
  dateEnd,
  destination,
  participants,
  legs,
  occupants,
  meals,
  mealOwners,
  products,
  activities,
  initialSignups,
}: {
  slug: string
  eventId: string
  participantId: string
  dateStart: string
  dateEnd: string
  destination: string | null
  participants: Participant[]
  legs: Leg[]
  occupants: Occupant[]
  meals: Meal[]
  mealOwners: MealOwner[]
  products: Product[]
  activities: Activity[]
  initialSignups: ActivitySignup[]
}) {
  const me = participants.find((p) => p.id === participantId)
  const [signups, setSignups] = useState(initialSignups)
  const [filter, setFilter] = useState<TimelineFilter>('all')
  const [selected, setSelected] = useState<TimelineItem | null>(null)
  const [presenceDay, setPresenceDay] = useState<string | null>(null)
  const [myStatus, setMyStatus] = useState<PresenceStatus | null>(me?.presence_status ?? null)
  const [myDays, setMyDays] = useState<Record<string, boolean>>(
    (me?.partial_days as Record<string, boolean> | null) ?? {},
  )
  const [now, setNow] = useState<{ day: string; minutes: number; label: string } | null>(null)
  const [, startTransition] = useTransition()

  // Un event sur un seul jour n'a pas de partial_days : la présence y est globale.
  const isMultiDayEvent = dateStart !== dateEnd
  const eventDays = useMemo(() => getDaysBetween(dateStart, dateEnd), [dateStart, dateEnd])
  const eventDaySet = useMemo(() => new Set(eventDays), [eventDays])

  const pseudoOf = useMemo(() => {
    const map = new Map(participants.map((p) => [p.id, p.pseudo]))
    return (id: string) => map.get(id) ?? '?'
  }, [participants])

  // Participants avec MA présence surchargée (optimiste) → compteurs à jour sans refetch.
  const people = useMemo(
    () =>
      participants.map((p) =>
        p.id === participantId ? { ...p, presence_status: myStatus, partial_days: myDays } : p,
      ),
    [participants, participantId, myStatus, myDays],
  )

  const timeline = useMemo(
    () => buildTimeline({ dateStart, dateEnd, legs, occupants, meals, mealOwners, products, activities, signups }),
    [dateStart, dateEnd, legs, occupants, meals, mealOwners, products, activities, signups],
  )

  // Repère « maintenant » — calculé au montage (jamais en SSR : heure du client).
  useEffect(() => {
    function tick() {
      const d = new Date()
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setNow({
        day: iso,
        minutes: d.getHours() * 60 + d.getMinutes(),
        label: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      })
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Pendant le séjour, on ouvre le fil sur aujourd'hui.
  const didAutoScroll = useRef(false)
  useEffect(() => {
    if (!now || didAutoScroll.current) return
    didAutoScroll.current = true
    if (now.day > dateStart && timeline.days.some((d) => d.day === now.day)) {
      document.getElementById(`fil-day-${now.day}`)?.scrollIntoView()
    }
  }, [now, dateStart, timeline])

  function matchesFilter(item: TimelineItem): boolean {
    switch (filter) {
      case 'all':
        return true
      case 'presence':
        // Vue dédiée : aucun item du fil, la présence remplace le contenu du jour.
        return false
      case 'transport':
        return item.kind === 'transport' || item.kind === 'arrival'
      case 'food':
        return item.kind === 'meal'
      case 'activity':
        return item.kind === 'activity'
      case 'mine':
        if (item.kind === 'meal') return item.owners.some((o) => o.participant_id === participantId)
        if (item.kind === 'activity') return item.signups.some((s) => s.participant_id === participantId)
        return item.occupants.some((o) => o.participant_id === participantId)
    }
  }

  function handleToggleSignup(activity: Activity) {
    const joined = signups.some((s) => s.activity_id === activity.id && s.participant_id === participantId)
    const prev = signups
    setSignups(
      joined
        ? prev.filter((s) => !(s.activity_id === activity.id && s.participant_id === participantId))
        : [...prev, {
            id: `optimistic-${activity.id}`,
            event_id: eventId,
            activity_id: activity.id,
            participant_id: participantId,
            created_at: new Date().toISOString(),
          }],
    )
    startTransition(async () => {
      try {
        await toggleActivitySignup(slug, eventId, activity.id, participantId, !joined)
      } catch {
        setSignups(prev)
      }
    })
  }

  // Ma présence pour un jour. Être présent sur le fil = participer au séjour
  // (statut « chaud ») ; « pas ce jour » ne décoche que ce jour (partial_days).
  // Sur un event mono-jour, pas de partial_days : on bascule le statut global.
  function updateMyDay(day: string, present: boolean) {
    const prevStatus = myStatus
    const prevDays = myDays
    let nextStatus: PresenceStatus | null
    let nextDays: Record<string, boolean>
    if (isMultiDayEvent) {
      nextStatus = 'hot'
      nextDays = { ...myDays }
      if (present) delete nextDays[day]
      else nextDays[day] = false
    } else {
      nextStatus = present ? 'hot' : 'no'
      nextDays = {}
    }
    setMyStatus(nextStatus)
    setMyDays(nextDays)
    startTransition(async () => {
      try {
        if (nextStatus !== prevStatus) await updatePresence(slug, participantId, nextStatus)
        if (isMultiDayEvent) await updatePartialDays(slug, participantId, nextDays)
      } catch {
        setMyStatus(prevStatus)
        setMyDays(prevDays)
      }
    })
  }

  const unscheduled = timeline.unscheduled.filter(matchesFilter)

  // Jour précédent dans le séjour — base des arrivées/départs. null au 1er jour.
  const prevEventDay = (d: string): string | null => {
    const i = eventDays.indexOf(d)
    return i > 0 ? eventDays[i - 1]! : null
  }
  const prevDayForSheet = presenceDay != null ? prevEventDay(presenceDay) : null

  return (
    <section>
      <h1 className="mb-1 font-serif text-[30px] text-ink">Le fil</h1>
      <p className="mb-4 text-[13.5px] text-muted">
        {`${formatEventDates(dateStart, dateEnd)}${destination ? ` · ${destination}` : ''} — tout le séjour, dans l'ordre`}
      </p>

      {/* Filtres */}
      <div className="mb-3 flex gap-[6px] overflow-x-auto pb-1" role="group" aria-label="Filtrer le fil">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`shrink-0 rounded-full border-[1.5px] px-3 py-[5px] text-[12px] font-bold transition-colors ${
              filter === f.key ? 'border-ink bg-ink text-paper' : 'border-line-2 bg-card text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Le fil */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute bottom-3 left-[43px] top-3 w-[2px] [background:repeating-linear-gradient(to_bottom,var(--color-line-3)_0_6px,transparent_6px_12px)]"
        />

        {timeline.days.map(({ day, items }) => {
          const showPresence = eventDaySet.has(day)
          // Vue présence : on ne montre que les jours du séjour (pas les débords).
          if (filter === 'presence' && !showPresence) return null
          const visible = filter === 'presence' ? [] : items.filter(matchesFilter)
          if (filter !== 'all' && filter !== 'presence' && visible.length === 0) return null
          const breakdown = showPresence ? presenceBreakdown(people, day) : emptyBreakdown()
          const mine = classifyDayPresence(myStatus, myDays, day)
          const isToday = now?.day === day
          // Index d'insertion du repère « maintenant » dans la journée courante.
          const nowIndex = isToday ? visible.filter((i) => i.sortMinutes <= now.minutes).length : -1

          let lastSlot: TimelineSlot | null = null

          return (
            <section key={day} id={`fil-day-${day}`} className="scroll-mt-2">
              {/* En-tête de jour sticky : jour + présence (cliquable pour gérer) */}
              <div className="sticky top-2 z-10 mb-[10px] ml-[16px] mt-[18px] w-fit max-w-[calc(100%-16px)]">
                {showPresence ? (
                  <DayHeaderButton
                    label={capitalizeFirst(formatDayLabel(day))}
                    breakdown={breakdown}
                    mine={mine}
                    onOpen={() => setPresenceDay(day)}
                  />
                ) : (
                  <div className="flex items-center rounded-full border-[1.5px] border-line-2 bg-card py-[6px] px-[13px] shadow-[0_3px_10px_rgba(60,45,20,.08)]">
                    <span className="whitespace-nowrap font-serif text-[14.5px] text-ink">
                      {capitalizeFirst(formatDayLabel(day))}
                    </span>
                  </div>
                )}
              </div>

              {filter === 'presence' ? (
                <DayPresenceView people={people} day={day} prevDay={prevEventDay(day)} />
              ) : (
                <>
                  {visible.map((item, idx) => {
                    const showSlot = item.slot != null && item.slot !== lastSlot
                    if (item.slot != null) lastSlot = item.slot
                    return (
                      <div key={item.id}>
                        {isToday && idx === nowIndex && <NowLine label={now.label} />}
                        {showSlot && item.slot && (
                          <div className="mb-[2px] ml-[64px] mt-[14px] text-[10.5px] font-bold uppercase tracking-[1.6px] text-muted-2">
                            {SLOT_LABEL[item.slot]}
                          </div>
                        )}
                        {item.kind === 'arrival' ? (
                          <ArrivalFlag item={item} pseudoOf={pseudoOf} destination={destination} />
                        ) : (
                          <ItemCard item={item} pseudoOf={pseudoOf} destination={destination} participantId={participantId} onOpen={() => setSelected(item)} />
                        )}
                      </div>
                    )
                  })}
                  {isToday && nowIndex === visible.length && <NowLine label={now.label} />}

                  {filter === 'all' && visible.length === 0 && (
                    <Link
                      href="?tab=activites"
                      className="ml-[64px] block rounded-[16px] border-[1.5px] border-dashed border-[var(--color-dashed)] px-[14px] py-[11px] text-[13px] font-semibold text-muted"
                    >
                      Rien de prévu ce jour-là — proposer un truc +
                    </Link>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>

      {/* Items sans jour */}
      {unscheduled.length > 0 && (
        <div className="mt-7">
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.8px] text-muted-2">
            À caler sur un jour
          </h3>
          <div className="flex flex-col gap-2">
            {unscheduled.map((item) =>
              item.kind === 'arrival' ? null : (
                <ItemCard
                  key={item.id}
                  item={item}
                  pseudoOf={pseudoOf}
                  destination={destination}
                  participantId={participantId}
                  onOpen={() => setSelected(item)}
                  floating
                />
              ),
            )}
          </div>
        </div>
      )}

      {/* Détail + action, dans le langage de l'app : bottom sheet */}
      {selected && (
        <Sheet variant="bottom" onClose={() => setSelected(null)} labelledBy="fil-sheet-title">
          <ItemSheet
            item={selected}
            pseudoOf={pseudoOf}
            destination={destination}
            participantId={participantId}
            signups={signups}
            onToggleSignup={handleToggleSignup}
          />
        </Sheet>
      )}

      {/* Présence d'un jour : voir qui est là + régler la sienne */}
      {presenceDay && (
        <Sheet variant="bottom" onClose={() => setPresenceDay(null)} labelledBy="fil-presence-title">
          <PresenceDaySheet
            day={presenceDay}
            prevDay={prevDayForSheet}
            people={people}
            participantId={participantId}
            mine={classifyDayPresence(myStatus, myDays, presenceDay)}
            isMultiDayEvent={isMultiDayEvent}
            onSetPresent={(present) => updateMyDay(presenceDay, present)}
          />
        </Sheet>
      )}
    </section>
  )
}

// ============================================================

function AvatarStack({ people, variant }: { people: Participant[]; variant: 'solid' | 'outline' }) {
  const cls =
    variant === 'solid'
      ? 'bg-ink text-paper'
      : 'bg-card text-body border-line-3'
  return (
    <span className="flex" aria-hidden>
      {people.slice(0, 4).map((p) => (
        <Avatar
          key={p.id}
          pseudo={p.pseudo}
          className={`-ml-[7px] h-[22px] w-[22px] border-2 border-card text-[9.5px] first:ml-0 ${cls}`}
        />
      ))}
    </span>
  )
}

// Ligne fine de présence d'un jour : présents (gris), arrivées vs la veille
// (vert), départs — présents la veille, plus là aujourd'hui (rouge estompé).
// Tooltip par nom : « arrive ce jour-là » / « pas ce jour-là ».
function RosterLine({
  people,
  day,
  prevDay,
  className = '',
}: {
  people: Participant[]
  day: string
  prevDay: string | null
  className?: string
}) {
  const isIn = (p: Participant, d: string) =>
    classifyDayPresence(p.presence_status, p.partial_days, d) === 'in'
  const roster = people
    .filter((p) => isIn(p, day))
    .map((p) => ({ p, arrival: prevDay != null && !isIn(p, prevDay) }))
  const departures = prevDay ? people.filter((p) => !isIn(p, day) && isIn(p, prevDay)) : []
  if (roster.length === 0 && departures.length === 0) return null

  return (
    <p className={className}>
      {roster.map((e, i) => (
        <span
          key={e.p.id}
          title={e.arrival ? `${e.p.pseudo} arrive ce jour-là` : `${e.p.pseudo} · là ce jour`}
          className={e.arrival ? 'font-semibold text-olive-text' : 'text-muted'}
        >
          {e.p.pseudo}
          {(i < roster.length - 1 || departures.length > 0) && (
            <span className="text-disabled"> · </span>
          )}
        </span>
      ))}
      {departures.map((p, i) => (
        <span
          key={p.id}
          title={`${p.pseudo} · pas ce jour-là`}
          className="text-terracotta"
          style={{ opacity: 0.5 }}
        >
          {p.pseudo}
          {i < departures.length - 1 && <span className="text-disabled"> · </span>}
        </span>
      ))}
    </p>
  )
}

// Vue « Présence » d'un jour, en gros et visible : qui arrive (↗ vert),
// qui est sur place (neutre), qui repart (↘ rouge).
function DayPresenceView({
  people,
  day,
  prevDay,
}: {
  people: Participant[]
  day: string
  prevDay: string | null
}) {
  const isIn = (p: Participant, d: string) =>
    classifyDayPresence(p.presence_status, p.partial_days, d) === 'in'
  const present = people.filter((p) => isIn(p, day))
  const arrivalIds = new Set(
    (prevDay ? present.filter((p) => !isIn(p, prevDay)) : []).map((p) => p.id),
  )
  const arrivals = present.filter((p) => arrivalIds.has(p.id))
  const staying = present.filter((p) => !arrivalIds.has(p.id))
  const departures = prevDay ? people.filter((p) => !isIn(p, day) && isIn(p, prevDay)) : []

  return (
    <div className="mb-4 ml-[64px] mt-1 flex flex-col gap-[14px] rounded-[16px] border-[1.5px] border-line-2 bg-card p-4 shadow-card">
      {arrivals.length > 0 && <PresenceGroup label="Arrivent" tone="green" people={arrivals} />}
      {staying.length > 0 && <PresenceGroup label="Sur place" tone="neutral" people={staying} />}
      {departures.length > 0 && <PresenceGroup label="Repartent" tone="red" people={departures} />}
      {present.length === 0 && departures.length === 0 && (
        <p className="text-[13px] text-muted">Personne n&apos;a confirmé ce jour-là pour l&apos;instant.</p>
      )}
    </div>
  )
}

function PresenceGroup({
  label,
  people,
  tone,
}: {
  label: string
  people: Participant[]
  tone: 'green' | 'neutral' | 'red'
}) {
  const labelCls = { green: 'text-olive-text-dk', neutral: 'text-muted-2', red: 'text-terracotta' }[tone]
  const chipCls = {
    green: 'bg-olive-soft text-olive-text-dk',
    neutral: 'border-[1.5px] border-line-2 bg-card text-ink',
    red: 'bg-terracotta-soft text-terracotta',
  }[tone]
  const arrow = { green: '↗ ', neutral: '', red: '↘ ' }[tone]

  return (
    <div>
      <div className={`mb-[8px] text-[11.5px] font-bold uppercase tracking-[0.8px] ${labelCls}`}>
        {arrow}
        {label} · {people.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => (
          <span
            key={p.id}
            className={`flex items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-[11px] text-[12.5px] font-semibold ${chipCls}`}
          >
            <Avatar pseudo={p.pseudo} className="h-[24px] w-[24px] bg-ink text-[10px] text-paper" />
            {p.pseudo}
          </span>
        ))}
      </div>
    </div>
  )
}

function DayHeaderButton({
  label,
  breakdown,
  mine,
  onOpen,
}: {
  label: string
  breakdown: Record<DayPresence, Participant[]>
  mine: DayPresence
  onOpen: () => void
}) {
  const confirmed = breakdown.in
  const maybe = breakdown.maybe
  // Avatars : les confirmés en priorité, sinon les « peut-être » en contour.
  const stack = confirmed.length > 0 ? confirmed : maybe
  const summary =
    confirmed.length > 0
      ? `${confirmed.length} là${maybe.length > 0 ? ` · ${maybe.length} ?` : ''}`
      : maybe.length > 0
        ? `${maybe.length} peut-être`
        : 'à confirmer'

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Présence du ${label} : ${confirmed.length} confirmés. Voir et modifier.`}
      className={`flex items-center gap-[9px] rounded-full border-[1.5px] bg-card py-[6px] pl-[13px] pr-[10px] shadow-[0_3px_10px_rgba(60,45,20,.08)] transition-colors active:scale-[0.99] ${
        mine === 'pending' ? 'border-terracotta' : 'border-line-2'
      }`}
    >
      <span className="whitespace-nowrap font-serif text-[14.5px] text-ink">{label}</span>
      {stack.length > 0 && (
        <AvatarStack people={stack} variant={confirmed.length > 0 ? 'solid' : 'outline'} />
      )}
      <span className="whitespace-nowrap text-[11.5px] font-bold text-muted">{summary}</span>
      <span aria-hidden className="text-[13px] font-bold text-muted-2">
        ›
      </span>
    </button>
  )
}

function PresenceDaySheet({
  day,
  prevDay,
  people,
  participantId,
  mine,
  isMultiDayEvent,
  onSetPresent,
}: {
  day: string
  prevDay: string | null
  people: Participant[]
  participantId: string
  mine: DayPresence
  isMultiDayEvent: boolean
  onSetPresent: (present: boolean) => void
}) {
  const breakdown = presenceBreakdown(people, day)
  const meName = people.find((p) => p.id === participantId)?.pseudo ?? 'Toi'

  const hint =
    mine === 'pending'
      ? "Tu n'as pas encore dit si tu venais."
      : mine === 'maybe'
        ? 'Tu es noté « peut-être » — confirme si tu es sûr.'
        : null

  const selfBtn = (active: boolean, activeCls: string) =>
    `flex-1 rounded-[13px] border-[1.5px] px-3 py-[10px] text-[13.5px] font-bold transition-colors ${
      active ? activeCls : 'border-line-2 bg-card text-body'
    }`

  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-terracotta">Présence</div>
      <h2 id="fil-presence-title" className="mb-[2px] mt-1 font-serif text-[22px] text-ink">
        Qui est là
      </h2>
      <p className="text-[13px] font-semibold text-muted">{capitalizeFirst(formatDayLabel(day))}</p>

      {/* Mon contrôle — clair : Je suis là / Pas ce jour */}
      <div className="mt-4 rounded-[16px] border-[1.5px] border-line-2 bg-soft p-[13px]">
        <div className="mb-[10px] flex items-center gap-2">
          <Avatar pseudo={meName} className="h-[26px] w-[26px] bg-ink text-[11px] text-paper" />
          <span className="text-[14px] font-bold text-ink">Toi</span>
          <span className="ml-auto text-[16px]" aria-hidden>
            {PRESENCE_EMOJI[mine]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetPresent(true)}
            aria-pressed={mine === 'in'}
            className={selfBtn(mine === 'in', 'border-olive bg-olive text-white')}
          >
            Je suis là
          </button>
          <button
            type="button"
            onClick={() => onSetPresent(false)}
            aria-pressed={mine === 'out'}
            className={selfBtn(mine === 'out', 'border-ink bg-ink text-paper')}
          >
            {isMultiDayEvent ? 'Pas ce jour' : 'Pas là'}
          </button>
        </div>
        {hint && <p className="mt-[9px] text-[12px] font-semibold text-muted">{hint}</p>}
      </div>

      {/* Tout le monde, groupé par état */}
      {PRESENCE_GROUPS.map((g) => {
        const list = breakdown[g.key].filter((p) => p.id !== participantId)
        if (list.length === 0) return null
        return (
          <div key={g.key} className="mt-4">
            <div className="mb-[7px] text-[11.5px] font-bold uppercase tracking-[0.8px] text-muted-2">
              {PRESENCE_EMOJI[g.key]} {g.label} · {list.length}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full border-[1.5px] border-line-2 bg-card py-[3px] pl-[3px] pr-[10px] text-[12px] font-semibold text-ink"
                >
                  <Avatar pseudo={p.pseudo} className="h-[22px] w-[22px] bg-ink text-[9.5px] text-paper" />
                  {p.pseudo}
                </span>
              ))}
            </div>
          </div>
        )
      })}

      {/* Même ligne fine que sur le fil, avec les tooltips par nom */}
      <RosterLine
        people={people}
        day={day}
        prevDay={prevDay}
        className="mt-4 border-t-[1.5px] border-line-2 pt-3 text-[12.5px] leading-[1.7]"
      />
    </div>
  )
}

// ============================================================

function NowLine({ label }: { label: string }) {
  return (
    <div className="relative my-[8px] ml-[44px] border-t-2 border-terracotta" aria-label={`Maintenant, ${label}`}>
      <span className="animate-pulse-dot absolute -left-[6px] -top-[6px] h-[10px] w-[10px] rounded-full bg-terracotta" />
      <span className="absolute -top-[9px] right-0 rounded-full bg-terracotta px-2 text-[9.5px] font-bold tracking-[0.5px] text-on-dark">
        {label}
      </span>
    </div>
  )
}

function ArrivalFlag({
  item,
  pseudoOf,
  destination,
}: {
  item: Extract<TimelineItem, { kind: 'arrival' }>
  pseudoOf: (id: string) => string
  destination: string | null
}) {
  const names = item.occupants.map((o) => pseudoOf(o.participant_id))
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '')
  const place = item.leg.arrival_city ?? destination
  return (
    <div className="relative ml-[64px] flex items-center gap-2 py-[7px] pr-2 text-[12.5px] font-bold text-lavender-deep">
      <span aria-hidden className="absolute -left-[26px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full bg-lavender-deep" />
      <span className="absolute -left-[64px] w-[36px] text-right text-[11px] font-bold tabular-nums text-muted">
        {item.time}
      </span>
      <span aria-hidden>👋</span>
      <span className="min-w-0">
        {names.length > 0 ? shown : item.leg.label} arrive{names.length > 1 ? 'nt' : ''}
        {place ? ` · ${place}` : ''}
      </span>
    </div>
  )
}

function ItemCard({
  item,
  pseudoOf,
  destination,
  participantId,
  onOpen,
  floating = false,
}: {
  item: Exclude<TimelineItem, { kind: 'arrival' }>
  pseudoOf: (id: string) => string
  destination: string | null
  participantId: string
  onOpen: () => void
  floating?: boolean
}) {
  const accent = accentOf(item)

  let title = ''
  let meta: React.ReactNode = null
  const pills: string[] = []

  if (item.kind === 'transport') {
    const { leg } = item
    title = leg.label
    const route = `${leg.departure_city ?? destination ?? '?'} → ${leg.arrival_city ?? destination ?? '?'}`
    const windowEnd = hhmm(leg.departure_time_end)
    meta = `${leg.direction === 'aller' ? 'Aller' : 'Retour'} · ${route}${windowEnd ? ` · jusqu'à ${windowEnd}` : ''}`
    if (leg.total_seats != null) {
      const free = Math.max(0, leg.total_seats - item.occupants.length)
      pills.push(free > 0 ? `${free} place${free > 1 ? 's' : ''}` : 'complet')
    }
  } else if (item.kind === 'activity') {
    const { activity } = item
    title = activity.label
    const price = priceLabel(activity)
    meta = price ?? (item.time ? null : 'sans heure fixe')
    const count = item.signups.length
    if (count > 0) pills.push(`${count} inscrit${count > 1 ? 's' : ''}${activity.max_participants != null ? ` / ${activity.max_participants}` : ''}`)
    if (item.signups.some((s) => s.participant_id === participantId)) pills.push('j’y vais 🔥')
  } else {
    const { meal } = item
    title = meal.label
    const ownerNames = item.owners.map((o) => pseudoOf(o.participant_id))
    meta = meal.is_restaurant
      ? 'Au resto'
      : ownerNames.length > 0
        ? `Resp. ${ownerNames.join(', ')}`
        : 'personne aux fourneaux'
    if (item.productCount > 0) pills.push(`${item.productCount} produit${item.productCount > 1 ? 's' : ''}`)
  }

  return (
    <button
      onClick={onOpen}
      className={`relative mb-2 block rounded-[16px] border-[1.5px] border-line-2 bg-card px-[15px] py-[11px] text-left shadow-card transition-transform active:scale-[0.99] ${
        floating ? 'w-full' : 'ml-[64px] w-[calc(100%-64px)]'
      }`}
    >
      <span aria-hidden className={`absolute inset-y-[12px] left-0 w-[4px] rounded-r-full ${accent.bar}`} />
      {!floating && (
        <span aria-hidden className={`absolute -left-[27px] top-[14px] h-[14px] w-[14px] rounded-full border-[3.5px] bg-card ${accent.knot}`} />
      )}
      {!floating && item.time && (
        <span className="absolute -left-[64px] top-[13px] w-[36px] text-right text-[11px] font-bold tabular-nums text-muted">
          {item.time}
        </span>
      )}
      <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
        <span aria-hidden className="text-[15px]">{iconOf(item)}</span>
        <span className="min-w-0 truncate">{title}</span>
      </span>
      {(meta || pills.length > 0) && (
        <span className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-muted">
          {meta && <span className="min-w-0">{meta}</span>}
          {pills.map((p) => (
            <span key={p} className={`rounded-full px-2 py-[1.5px] text-[10.5px] font-bold ${accent.pill}`}>
              {p}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

// ============================================================

function ItemSheet({
  item,
  pseudoOf,
  destination,
  participantId,
  signups,
  onToggleSignup,
}: {
  item: TimelineItem
  pseudoOf: (id: string) => string
  destination: string | null
  participantId: string
  signups: ActivitySignup[]
  onToggleSignup: (activity: Activity) => void
}) {
  const accent = accentOf(item)

  const eyebrow = {
    transport: 'Transport',
    arrival: 'Arrivée',
    activity: isApero(item.kind === 'activity' ? item.activity.label : '') ? 'Apéro' : 'Activité',
    meal: 'Bouffe',
  }[item.kind]

  let title: string
  let metaLine: string
  let people: { id: string; pseudo: string }[] = []
  let peopleLabel = ''

  if (item.kind === 'transport' || item.kind === 'arrival') {
    const { leg } = item
    title = leg.label
    const route = `${leg.departure_city ?? destination ?? '?'} → ${leg.arrival_city ?? destination ?? '?'}`
    const t1 = hhmm(leg.departure_time)
    const tArr = hhmm(leg.arrival_time)
    metaLine = `${leg.direction === 'aller' ? 'Aller' : 'Retour'} · ${route}${t1 ? ` · ${t1}` : ''}${tArr ? ` → ${tArr}` : ''}`
    people = item.occupants.map((o) => ({ id: o.participant_id, pseudo: pseudoOf(o.participant_id) }))
    peopleLabel = 'À bord'
  } else if (item.kind === 'activity') {
    const { activity } = item
    title = activity.label
    const parts = [
      activity.activity_date ? formatDayLabel(activity.activity_date) : null,
      item.time,
      priceLabel(activity),
    ].filter(Boolean)
    metaLine = parts.join(' · ') || 'à caler'
    const current = signups.filter((s) => s.activity_id === activity.id)
    people = current.map((s) => ({ id: s.participant_id, pseudo: pseudoOf(s.participant_id) }))
    peopleLabel = `${current.length} inscrit${current.length > 1 ? 's' : ''}${activity.max_participants != null ? ` / ${activity.max_participants}` : ''}`
  } else {
    const { meal } = item
    title = meal.label
    metaLine = [
      meal.meal_date ? formatDayLabel(meal.meal_date) : 'à caler',
      SLOT_LABEL[item.slot],
      meal.is_restaurant ? 'au resto' : null,
    ].filter(Boolean).join(' · ')
    people = item.owners.map((o) => ({ id: o.participant_id, pseudo: pseudoOf(o.participant_id) }))
    peopleLabel = 'Aux fourneaux'
  }

  const joined =
    item.kind === 'activity' &&
    signups.some((s) => s.activity_id === item.activity.id && s.participant_id === participantId)

  const primaryBtn = 'flex-1 rounded-[14px] bg-terracotta px-4 py-[11px] text-center text-[13.5px] font-bold text-on-dark active:bg-terracotta-dk'
  const ghostBtn = 'flex-1 rounded-[14px] border-[1.5px] border-line-2 bg-card px-4 py-[11px] text-center text-[13.5px] font-bold text-ink'

  return (
    <div>
      <div className={`text-[11px] font-bold uppercase tracking-[1.2px] ${accent.text}`}>{eyebrow}</div>
      <h2 id="fil-sheet-title" className="mb-[2px] mt-1 font-serif text-[22px] text-ink">
        {iconOf(item)} {title}
      </h2>
      <p className="text-[13px] font-semibold text-muted">{metaLine}</p>

      {item.kind === 'activity' && item.activity.comment && (
        <p className="mt-2 text-[13px] italic text-body">« {item.activity.comment} »</p>
      )}

      <div className="mt-4">
        <div className="mb-[6px] text-[11.5px] font-bold uppercase tracking-[0.8px] text-muted-2">
          {peopleLabel}
        </div>
        {people.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {people.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5 rounded-full border-[1.5px] border-line-2 bg-card py-[3px] pl-[3px] pr-[10px] text-[12px] font-semibold text-ink">
                <Avatar pseudo={p.pseudo} className="h-[22px] w-[22px] bg-ink text-[9.5px] text-paper" />
                {p.pseudo}
                {p.id === participantId && <span className="text-terracotta">(toi)</span>}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Personne pour l&apos;instant.</p>
        )}
      </div>

      {/* Liens externes (billet, résa, resto) */}
      {(item.kind === 'transport' || item.kind === 'arrival') && item.leg.link_url && (
        <a href={item.leg.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-[13px] font-bold text-terracotta">
          Voir le billet ↗
        </a>
      )}
      {(item.kind === 'transport' || item.kind === 'arrival') && (item.leg.arrival_city ?? destination) && (
        <a
          href={googleMapsUrl((item.leg.arrival_city ?? destination)!)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-[13px] font-bold text-terracotta"
        >
          📍 Ouvrir dans Maps ↗
        </a>
      )}
      {item.kind === 'activity' && item.activity.booking_url && (
        <a href={item.activity.booking_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-[13px] font-bold text-terracotta">
          Voir la résa ↗
        </a>
      )}
      {item.kind === 'meal' && item.meal.links.length > 0 && (
        <a href={item.meal.links[0]} target="_blank" rel="noopener noreferrer" className="mt-3 block text-[13px] font-bold text-terracotta">
          Voir le resto ↗
        </a>
      )}

      <div className="mt-5 flex gap-2">
        {item.kind === 'activity' && (
          <button onClick={() => onToggleSignup(item.activity)} className={joined ? ghostBtn : primaryBtn}>
            {joined ? 'Je me désinscris' : 'J’y vais 🔥'}
          </button>
        )}
        {(item.kind === 'transport' || item.kind === 'arrival') && (
          <Link href="?tab=transport" className={primaryBtn}>
            Ouvrir dans Transport
          </Link>
        )}
        {item.kind === 'meal' && (
          <Link href="?tab=bouffe" className={primaryBtn}>
            Liste de courses
          </Link>
        )}
        {item.kind === 'activity' && (
          <Link href="?tab=activites" className={ghostBtn}>
            Voir dans Activités
          </Link>
        )}
      </div>
    </div>
  )
}
