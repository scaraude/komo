export type SolverParticipant = {
  id: string
  departure_city: string | null
}

export type SolverLeg = {
  id: string
  total_seats: number | null
  departure_city: string
}

export type SolverOccupant = {
  leg_id: string
  participant_id: string
}

export type Assignment = {
  legId: string
  participantId: string
}

export function computeSuggestions(
  unassigned: SolverParticipant[],
  legs: SolverLeg[],
  occupants: SolverOccupant[],
): Assignment[] {
  // seats taken per leg
  const taken = new Map<string, number>()
  for (const leg of legs) taken.set(leg.id, 0)
  for (const o of occupants) taken.set(o.leg_id, (taken.get(o.leg_id) ?? 0) + 1)

  const assignments: Assignment[] = []

  for (const p of unassigned) {
    // legs with free seats, sorted: same departure_city first, then most free seats
    const candidates = legs
      .filter((l) => {
        const seats = l.total_seats ?? 4
        return (taken.get(l.id) ?? 0) < seats
      })
      .sort((a, b) => {
        const cityA = p.departure_city?.toLowerCase()
        const aMatch = cityA && a.departure_city.toLowerCase().includes(cityA) ? 0 : 1
        const bMatch = cityA && b.departure_city.toLowerCase().includes(cityA) ? 0 : 1
        if (aMatch !== bMatch) return aMatch - bMatch
        const freeA = (a.total_seats ?? 4) - (taken.get(a.id) ?? 0)
        const freeB = (b.total_seats ?? 4) - (taken.get(b.id) ?? 0)
        return freeB - freeA
      })

    const best = candidates[0]
    if (!best) continue

    taken.set(best.id, (taken.get(best.id) ?? 0) + 1)
    assignments.push({ legId: best.id, participantId: p.id })
  }

  return assignments
}
