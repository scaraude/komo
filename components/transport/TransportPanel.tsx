'use client'

import { useState } from 'react'
import { CarCard } from './CarCard'
import { UnassignedZone } from './UnassignedZone'
import { ProposeVehicleForm } from './ProposeVehicleForm'
import { SuggestModal } from './SuggestModal'
import type { Database } from '@/lib/database.types'

type Leg = Database['public']['Tables']['transport_legs']['Row']
type Occupant = Database['public']['Tables']['transport_occupants']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

export function TransportPanel({
  slug,
  eventId,
  participantId,
  legs,
  occupants,
  participants,
  initialDirection,
  isCreator,
}: {
  slug: string
  eventId: string
  participantId: string
  legs: Leg[]
  occupants: Occupant[]
  participants: Participant[]
  initialDirection: 'aller' | 'retour'
  isCreator: boolean
}) {
  const [direction, setDirection] = useState<'aller' | 'retour'>(initialDirection)
  const [showForm, setShowForm] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)

  const directionLegs = legs.filter((l) => l.direction === direction)
  const assignedIds = new Set(
    occupants
      .filter((o) => directionLegs.some((l) => l.id === o.leg_id))
      .map((o) => o.participant_id)
  )
  const unassigned = participants.filter(
    (p) => ['hot', 'maybe', 'unsure'].includes(p.presence_status ?? '') && !assignedIds.has(p.id)
  )

  return (
    <section>
      {/* Toggle aller/retour — VIR-17 */}
      <div className="inline-flex border-2 border-ink rounded-full overflow-hidden mb-6 shadow-[3px_3px_0_rgba(26,20,16,0.9)]">
        {(['aller', 'retour'] as const).map((d) => (
          <button key={d} onClick={() => setDirection(d)}
            className={`px-5 py-2 text-sm font-bold transition-colors ${
              direction === d ? 'bg-ink text-paper' : 'bg-card text-ink'
            }`}>
            {d === 'aller' ? '→ Aller' : '← Retour'}
          </button>
        ))}
      </div>

      {/* CarCards — VIR-15 */}
      <div className="flex flex-col gap-4">
        {directionLegs.length === 0 && (
          <p className="text-muted text-sm py-4 text-center">Aucun trajet proposé pour l'instant.</p>
        )}
        {directionLegs.map((leg) => (
          <CarCard key={leg.id} slug={slug} leg={leg}
            occupants={occupants.filter((o) => o.leg_id === leg.id)}
            participants={participants}
            currentParticipantId={participantId}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => setShowForm(true)}
          className="flex-1 py-3 border-2 border-dashed border-ink rounded-2xl text-sm font-semibold text-muted hover:border-terracotta hover:text-terracotta transition-colors">
          + Je propose un trajet
        </button>
        {isCreator && unassigned.length > 0 && (
          <button onClick={() => setShowSuggest(true)}
            className="px-4 py-3 border-2 border-ink rounded-2xl text-sm font-bold bg-card hover:bg-ink hover:text-paper transition-colors">
            ✨
          </button>
        )}
      </div>

      {/* Zone sans transport — VIR-16 */}
      <UnassignedZone participants={unassigned} />

      {showForm && (
        <ProposeVehicleForm slug={slug} eventId={eventId} participantId={participantId}
          direction={direction} onClose={() => setShowForm(false)} />
      )}
      {showSuggest && (
        <SuggestModal slug={slug} eventId={eventId} direction={direction}
          participants={participants} legs={legs} onClose={() => setShowSuggest(false)} />
      )}
    </section>
  )
}
