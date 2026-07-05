import { describe, it, expect } from 'vitest'
import { buildTimeline, classifyDayPresence, guessMealSlot, presentOnDay } from './timeline'
import type { Activity, ActivitySignup, Leg, Meal, MealOwner, Occupant, Product } from './types'

function leg(overrides: Partial<Leg>): Leg {
  return {
    id: 'leg-1',
    event_id: 'ev',
    direction: 'aller',
    mode: 'car',
    driver_id: null,
    created_by: null,
    label: 'Voiture de Marco',
    departure_city: 'Lyon',
    arrival_city: null,
    vehicle_ref: null,
    departure_time: null,
    departure_time_end: null,
    arrival_time: null,
    total_seats: null,
    trunk_size: null,
    link_url: null,
    comment: null,
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'act-1',
    event_id: 'ev',
    label: 'Canyoning',
    activity_date: null,
    start_time: null,
    price: null,
    price_type: null,
    group_size: null,
    min_participants: null,
    max_participants: null,
    booking_url: null,
    comment: null,
    created_by: null,
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function meal(overrides: Partial<Meal>): Meal {
  return {
    id: 'meal-1',
    event_id: 'ev',
    label: 'Barbecue',
    meal_date: null,
    is_restaurant: false,
    links: [],
    created_by: null,
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function build(input: {
  legs?: Leg[]
  occupants?: Occupant[]
  meals?: Meal[]
  mealOwners?: MealOwner[]
  products?: Product[]
  activities?: Activity[]
  signups?: ActivitySignup[]
}) {
  return buildTimeline({
    dateStart: '2026-07-10',
    dateEnd: '2026-07-12',
    legs: [],
    occupants: [],
    meals: [],
    mealOwners: [],
    products: [],
    activities: [],
    signups: [],
    ...input,
  })
}

describe('guessMealSlot', () => {
  it('détecte le matin (accents ignorés)', () => {
    expect(guessMealSlot('Petit déj')).toBe('morning')
    expect(guessMealSlot('Brunch du dimanche')).toBe('morning')
  })

  it('détecte le midi', () => {
    expect(guessMealSlot('Déjeuner')).toBe('noon')
    expect(guessMealSlot('Pique-nique au lac')).toBe('noon')
  })

  it('ne confond pas « petit déjeuner » avec le midi', () => {
    expect(guessMealSlot('Petit déjeuner')).toBe('morning')
  })

  it('tombe sur le soir par défaut', () => {
    expect(guessMealSlot('Barbecue')).toBe('evening')
    expect(guessMealSlot('Raclette')).toBe('evening')
  })
})

describe('buildTimeline', () => {
  it('couvre tous les jours du séjour, même vides', () => {
    const { days } = build({})
    expect(days.map((d) => d.day)).toEqual(['2026-07-10', '2026-07-11', '2026-07-12'])
    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('place un trajet à son heure de départ et trie la journée', () => {
    const { days } = build({
      legs: [leg({ departure_time: '2026-07-10T17:30:00+00:00' })],
      meals: [meal({ label: 'Pâtes du soir', meal_date: '2026-07-10' })],
      activities: [activity({ activity_date: '2026-07-10', start_time: '10:30:00' })],
    })
    const friday = days.find((d) => d.day === '2026-07-10')!
    expect(friday.items.map((i) => i.kind)).toEqual(['activity', 'transport', 'meal'])
    expect(friday.items[1]!.time).toBe('17:30')
  })

  it('ajoute un drapeau d’arrivée pour un aller avec arrival_time', () => {
    const { days } = build({
      legs: [leg({ departure_time: '2026-07-10T18:02:00+00:00', arrival_time: '2026-07-10T21:40:00+00:00' })],
    })
    const friday = days.find((d) => d.day === '2026-07-10')!
    expect(friday.items.map((i) => i.kind)).toEqual(['transport', 'arrival'])
    expect(friday.items[1]!.time).toBe('21:40')
  })

  it('n’ajoute pas de drapeau pour un retour', () => {
    const { days } = build({
      legs: [leg({ direction: 'retour', departure_time: '2026-07-12T16:00:00+00:00', arrival_time: '2026-07-12T18:00:00+00:00' })],
    })
    expect(days.flatMap((d) => d.items).map((i) => i.kind)).toEqual(['transport'])
  })

  it('sans heure : l’aller ouvre le premier jour, le retour clôt le dernier', () => {
    const { days } = build({
      legs: [
        leg({ id: 'l-aller', direction: 'aller' }),
        leg({ id: 'l-retour', direction: 'retour' }),
      ],
      activities: [activity({ activity_date: '2026-07-12', start_time: '10:00:00' })],
    })
    expect(days[0]!.items[0]!.id).toBe('leg-l-aller')
    const sunday = days.find((d) => d.day === '2026-07-12')!
    expect(sunday.items.map((i) => i.id)).toEqual(['activity-act-1', 'leg-l-retour'])
  })

  it('affiche un jour hors séjour si un trajet y déborde', () => {
    const { days } = build({
      legs: [leg({ departure_time: '2026-07-09T20:00:00+00:00' })],
    })
    expect(days.map((d) => d.day)).toEqual(['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12'])
  })

  it('intercale les repas par créneau parmi les items datés', () => {
    const { days } = build({
      meals: [
        meal({ id: 'm-dej', label: 'Petit déj', meal_date: '2026-07-11' }),
        meal({ id: 'm-soir', label: 'Barbecue', meal_date: '2026-07-11' }),
      ],
      activities: [
        activity({ id: 'a-canyon', activity_date: '2026-07-11', start_time: '10:30:00' }),
        activity({ id: 'a-apero', label: 'Apéro', activity_date: '2026-07-11', start_time: '19:00:00' }),
      ],
    })
    const saturday = days.find((d) => d.day === '2026-07-11')!
    expect(saturday.items.map((i) => i.id)).toEqual([
      'meal-m-dej', 'activity-a-canyon', 'activity-a-apero', 'meal-m-soir',
    ])
  })

  it('range les items sans jour dans unscheduled', () => {
    const { days, unscheduled } = build({
      meals: [meal({})],
      activities: [activity({})],
    })
    expect(days.every((d) => d.items.length === 0)).toBe(true)
    expect(unscheduled.map((i) => i.kind).sort()).toEqual(['activity', 'meal'])
  })
})

describe('classifyDayPresence', () => {
  it('chaud sans jour décoché → in', () => {
    expect(classifyDayPresence('hot', null, '2026-07-10')).toBe('in')
    expect(classifyDayPresence('hot', { '2026-07-11': false }, '2026-07-10')).toBe('in')
  })

  it('chaud mais jour décoché → out', () => {
    expect(classifyDayPresence('hot', { '2026-07-10': false }, '2026-07-10')).toBe('out')
  })

  it('probable / pas sûr → maybe', () => {
    expect(classifyDayPresence('maybe', null, '2026-07-10')).toBe('maybe')
    expect(classifyDayPresence('unsure', null, '2026-07-10')).toBe('maybe')
  })

  it('non → out, jamais répondu → pending', () => {
    expect(classifyDayPresence('no', null, '2026-07-10')).toBe('out')
    expect(classifyDayPresence(null, null, '2026-07-10')).toBe('pending')
  })
})

describe('presentOnDay', () => {
  const crew = [
    { id: 'p1', presence_status: 'hot', partial_days: null },
    { id: 'p2', presence_status: 'hot', partial_days: { '2026-07-10': false } },
    { id: 'p3', presence_status: 'maybe', partial_days: null },
    { id: 'p4', presence_status: null, partial_days: null },
  ]

  it('compte les chauds sans jour décoché', () => {
    expect(presentOnDay(crew, '2026-07-10').map((p) => p.id)).toEqual(['p1'])
    expect(presentOnDay(crew, '2026-07-11').map((p) => p.id)).toEqual(['p1', 'p2'])
  })
})
