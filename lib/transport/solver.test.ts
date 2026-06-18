import { computeSuggestions } from './solver'
import { describe, it, expect } from 'vitest'

const legs = [
  { id: 'leg1', total_seats: 4, departure_city: 'Paris' },
  { id: 'leg2', total_seats: 2, departure_city: 'Lyon' },
]

describe('computeSuggestions', () => {
  it('assigns participant to leg with matching departure city', () => {
    const result = computeSuggestions(
      [{ id: 'p1', departure_city: 'Paris' }],
      legs,
      [],
    )
    expect(result).toEqual([{ legId: 'leg1', participantId: 'p1' }])
  })

  it('falls back to leg with most free seats when no city match', () => {
    const result = computeSuggestions(
      [{ id: 'p1', departure_city: 'Bordeaux' }],
      legs,
      [],
    )
    expect(result).toEqual([{ legId: 'leg1', participantId: 'p1' }])
  })

  it('skips full legs', () => {
    const occupants = [
      { leg_id: 'leg1', participant_id: 'x1' },
      { leg_id: 'leg1', participant_id: 'x2' },
      { leg_id: 'leg1', participant_id: 'x3' },
      { leg_id: 'leg1', participant_id: 'x4' },
    ]
    const result = computeSuggestions(
      [{ id: 'p1', departure_city: 'Paris' }],
      legs,
      occupants,
    )
    expect(result).toEqual([{ legId: 'leg2', participantId: 'p1' }])
  })

  it('returns empty when all legs are full', () => {
    const occupants = [
      { leg_id: 'leg1', participant_id: 'x1' },
      { leg_id: 'leg1', participant_id: 'x2' },
      { leg_id: 'leg1', participant_id: 'x3' },
      { leg_id: 'leg1', participant_id: 'x4' },
      { leg_id: 'leg2', participant_id: 'x5' },
      { leg_id: 'leg2', participant_id: 'x6' },
    ]
    const result = computeSuggestions(
      [{ id: 'p1', departure_city: 'Paris' }],
      legs,
      occupants,
    )
    expect(result).toEqual([])
  })

  it('tracks seats across multiple assignments', () => {
    const smallLegs = [{ id: 'leg1', total_seats: 2, departure_city: 'Paris' }]
    const result = computeSuggestions(
      [
        { id: 'p1', departure_city: null },
        { id: 'p2', departure_city: null },
        { id: 'p3', departure_city: null },
      ],
      smallLegs,
      [],
    )
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.legId === 'leg1')).toBe(true)
  })
})
