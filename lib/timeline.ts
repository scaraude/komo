import type {
  Activity,
  ActivitySignup,
  Leg,
  Meal,
  MealOwner,
  Occupant,
  Product,
} from './types'
import { getDaysBetween } from './calendar'
import { hhmm } from './format'

// Le fil du séjour : projection chronologique en lecture des modules existants
// (transports, repas, activités). Les granularités temporelles diffèrent par
// design — transports en timestamptz, activités en jour + heure optionnelle,
// repas en jour seul — d'où les « créneaux » pour intercaler les items sans heure.

export type TimelineSlot = 'morning' | 'noon' | 'afternoon' | 'evening'

export const SLOT_LABEL: Record<TimelineSlot, string> = {
  morning: 'Matin ☀️',
  noon: 'Midi',
  afternoon: 'Aprem',
  evening: 'Soir 🌙',
}

// Heure pivot de chaque créneau, pour trier les items sans heure parmi les datés.
const SLOT_MINUTES: Record<TimelineSlot, number> = {
  morning: 8 * 60 + 30,
  noon: 12 * 60 + 30,
  afternoon: 15 * 60,
  evening: 20 * 60,
}

// À minutes égales : le transport ouvre le moment, le repas le clôt.
const KIND_ORDER = { transport: 0, arrival: 1, activity: 2, meal: 3 } as const

type BaseItem = { id: string; day: string; sortMinutes: number }

export type TimelineItem =
  | (BaseItem & { kind: 'transport'; time: string | null; slot: null; leg: Leg; occupants: Occupant[] })
  | (BaseItem & { kind: 'arrival'; time: string; slot: null; leg: Leg; occupants: Occupant[] })
  | (BaseItem & { kind: 'activity'; time: string | null; slot: TimelineSlot | null; activity: Activity; signups: ActivitySignup[] })
  | (BaseItem & { kind: 'meal'; time: null; slot: TimelineSlot; meal: Meal; owners: MealOwner[]; productCount: number })

export type TimelineDay = { day: string; items: TimelineItem[] }
export type Timeline = { days: TimelineDay[]; unscheduled: TimelineItem[] }

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

// Devine le créneau d'un repas depuis son label — les repas n'ont volontairement
// pas d'heure en base. Défaut : soir (le repas « par défaut » d'un séjour).
export function guessMealSlot(label: string): TimelineSlot {
  const l = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/petit|p'tit|ptit|brunch|matin|breakfast|cafe/.test(l)) return 'morning'
  if (/midi|dejeuner|\bdej\b|pique|picnic|lunch|sandwich/.test(l)) return 'noon'
  if (/gouter|quatre[- ]heures/.test(l)) return 'afternoon'
  return 'evening'
}

// Présence d'une personne pour un jour donné :
//  - 'in'      : chaud et ce jour non décoché (partial_days : absent = présent)
//  - 'out'     : a dit non, ou chaud mais a explicitement zappé ce jour
//  - 'maybe'   : probable / pas sûr
//  - 'pending' : n'a pas encore répondu
export type DayPresence = 'in' | 'maybe' | 'out' | 'pending'

export function classifyDayPresence(
  status: string | null,
  partialDays: unknown,
  day: string,
): DayPresence {
  if (status === 'hot') {
    const days = partialDays as Record<string, boolean> | null
    return days?.[day] === false ? 'out' : 'in'
  }
  if (status === 'maybe' || status === 'unsure') return 'maybe'
  if (status === 'no') return 'out'
  return 'pending'
}

// Les personnes présentes (confirmées) ce jour-là.
export function presentOnDay<T extends { presence_status: string | null; partial_days: unknown }>(
  participants: T[],
  day: string,
): T[] {
  return participants.filter((p) => classifyDayPresence(p.presence_status, p.partial_days, day) === 'in')
}

export function buildTimeline(input: {
  dateStart: string
  dateEnd: string
  legs: Leg[]
  occupants: Occupant[]
  meals: Meal[]
  mealOwners: MealOwner[]
  products: Product[]
  activities: Activity[]
  signups: ActivitySignup[]
}): Timeline {
  const eventDays = getDaysBetween(input.dateStart, input.dateEnd)
  const firstDay = eventDays[0]!
  const lastDay = eventDays[eventDays.length - 1]!

  const items: TimelineItem[] = []
  const unscheduled: TimelineItem[] = []

  for (const leg of input.legs) {
    const occupants = input.occupants.filter((o) => o.leg_id === leg.id)
    const time = hhmm(leg.departure_time) ?? null
    // Sans heure : l'aller ouvre son premier jour, le retour clôt le dernier.
    const day = leg.departure_time?.slice(0, 10) ?? (leg.direction === 'aller' ? firstDay : lastDay)
    items.push({
      kind: 'transport',
      id: `leg-${leg.id}`,
      day,
      time,
      slot: null,
      sortMinutes: time ? timeToMinutes(time) : leg.direction === 'aller' ? 0 : 24 * 60,
      leg,
      occupants,
    })
    // Drapeau d'arrivée sur place. Les retours « arrivent » chez eux : pas de drapeau.
    if (leg.direction === 'aller' && leg.arrival_time) {
      const arrivalTime = hhmm(leg.arrival_time)!
      items.push({
        kind: 'arrival',
        id: `arrival-${leg.id}`,
        day: leg.arrival_time.slice(0, 10),
        time: arrivalTime,
        slot: null,
        sortMinutes: timeToMinutes(arrivalTime),
        leg,
        occupants,
      })
    }
  }

  for (const activity of input.activities) {
    const time = activity.start_time?.slice(0, 5) ?? null
    const item: TimelineItem = {
      kind: 'activity',
      id: `activity-${activity.id}`,
      day: activity.activity_date ?? '',
      time,
      slot: time ? null : 'afternoon',
      sortMinutes: time ? timeToMinutes(time) : SLOT_MINUTES.afternoon,
      activity,
      signups: input.signups.filter((s) => s.activity_id === activity.id),
    }
    if (activity.activity_date) items.push(item)
    else unscheduled.push(item)
  }

  for (const meal of input.meals) {
    const slot = guessMealSlot(meal.label)
    const item: TimelineItem = {
      kind: 'meal',
      id: `meal-${meal.id}`,
      day: meal.meal_date ?? '',
      time: null,
      slot,
      sortMinutes: SLOT_MINUTES[slot],
      meal,
      owners: input.mealOwners.filter((o) => o.meal_id === meal.id),
      productCount: input.products.filter((p) => p.meal_id === meal.id).length,
    }
    if (meal.meal_date) items.push(item)
    else unscheduled.push(item)
  }

  // Un trajet peut déborder du séjour (départ la veille…) : on affiche aussi ces jours.
  const dayKeys = [...new Set([...eventDays, ...items.map((i) => i.day)])].sort()
  const days = dayKeys.map((day) => ({
    day,
    items: items
      .filter((i) => i.day === day)
      .sort((a, b) => a.sortMinutes - b.sortMinutes || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
  }))

  return { days, unscheduled }
}
