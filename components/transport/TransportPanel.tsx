'use client'

import { useState } from 'react'
import { CarCard } from './CarCard'
import { UnassignedZone } from './UnassignedZone'
import { ProposeVehicleForm } from './ProposeVehicleForm'
import { SuggestModal } from './SuggestModal'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
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
  eventDestination,
  eventDateStart,
  eventDateEnd,
}: {
  slug: string
  eventId: string
  participantId: string
  legs: Leg[]
  occupants: Occupant[]
  participants: Participant[]
  initialDirection: 'aller' | 'retour'
  isCreator: boolean
  eventDestination: string
  eventDateStart: string | null
  eventDateEnd: string | null
}) {
  const [direction, setDirection] = useState<'aller' | 'retour'>(initialDirection)
  const [showForm, setShowForm] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [editingLeg, setEditingLeg] = useState<Leg | null>(null)

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
      {/* Segmented aller/retour */}
      <div className="bg-track rounded-[13px] p-[5px] flex gap-[4px] mb-[18px]">
        {(['aller', 'retour'] as const).map((d) => (
          <button key={d} onClick={() => setDirection(d)}
            className={`flex-1 text-center rounded-[9px] py-[10px] text-[13px] transition-colors ${
              direction === d ? 'bg-ink text-white font-bold' : 'text-[#6b665c]'
            }`}>
            {d === 'aller' ? 'Aller' : 'Retour'}
          </button>
        ))}
      </div>

      {/* Liste de cartes-trajet */}
      <div className="flex flex-col gap-[11px]">
        {directionLegs.length === 0 && (
          <p className="text-muted text-[13px] py-4 text-center">Aucun trajet proposé pour l&apos;instant.</p>
        )}
        {directionLegs.map((leg) => (
          <CarCard key={leg.id} slug={slug} leg={leg}
            occupants={occupants.filter((o) => o.leg_id === leg.id)}
            participants={participants}
            currentParticipantId={participantId}
            eventDestination={eventDestination}
            onEdit={() => setEditingLeg(leg)}
          />
        ))}
      </div>

      <div className="mt-[11px] flex gap-2">
        <DashedAddButton onClick={() => setShowForm(true)}
          className="flex-1 rounded-[18px] p-[16px] text-center">
          ＋ Je propose un trajet
        </DashedAddButton>
        {isCreator && unassigned.length > 0 && (
          <button onClick={() => setShowSuggest(true)}
            aria-label="Auto-affecter les trajets"
            title="Auto-affecter"
            className="px-[18px] bg-card border-[1.5px] border-line-3 rounded-[18px] font-bold text-ink hover:bg-soft transition-colors">
            ✨
          </button>
        )}
      </div>

      {/* Zone sans transport — VIR-16 */}
      <UnassignedZone participants={unassigned} />

      {showForm && (
        <ProposeVehicleForm slug={slug} eventId={eventId} participantId={participantId}
          direction={direction} eventDestination={eventDestination}
          eventDateStart={eventDateStart} eventDateEnd={eventDateEnd}
          onClose={() => setShowForm(false)} />
      )}
      {editingLeg && (
        <ProposeVehicleForm slug={slug} eventId={eventId} participantId={participantId}
          direction={editingLeg.direction as 'aller' | 'retour'} eventDestination={eventDestination}
          eventDateStart={eventDateStart} eventDateEnd={eventDateEnd}
          initial={editingLeg} onClose={() => setEditingLeg(null)} />
      )}
      {showSuggest && (
        <SuggestModal slug={slug} eventId={eventId} direction={direction}
          participants={participants} legs={legs} onClose={() => setShowSuggest(false)} />
      )}
    </section>
  )
}
