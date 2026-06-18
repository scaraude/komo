'use client'

import { useState, useTransition } from 'react'
import { joinLeg, leaveLeg } from '@/lib/actions/transport'
import type { Database } from '@/lib/database.types'

type Leg = Database['public']['Tables']['transport_legs']['Row']
type Occupant = Database['public']['Tables']['transport_occupants']['Row']
type Participant = Database['public']['Tables']['participants']['Row']

const MODE_ICONS: Record<string, string> = {
  car: '🚗', rental: '🚙', train: '🚆', bus: '🚌', navette: '🚐',
}

const TRUNK_LABELS: Record<string, string> = {
  small: 'petit coffre', medium: 'coffre moyen', large: 'grand coffre',
}

export function CarCard({
  slug,
  leg,
  occupants,
  participants,
  currentParticipantId,
}: {
  slug: string
  leg: Leg
  occupants: Occupant[]
  participants: Participant[]
  currentParticipantId: string
}) {
  const [localOccupants, setLocalOccupants] = useState(occupants)
  const [, startTransition] = useTransition()

  const totalSeats = leg.total_seats ?? 4
  const free = totalSeats - localOccupants.length
  const isMember = localOccupants.some((o) => o.participant_id === currentParticipantId)

  function participantFor(id: string) {
    return participants.find((p) => p.id === id)
  }

  function handleJoin() {
    const newOccupant: Occupant = {
      id: crypto.randomUUID(),
      leg_id: leg.id,
      participant_id: currentParticipantId,
      is_driver: false,
      locked: false,
      created_at: new Date().toISOString(),
    }
    const prev = localOccupants
    setLocalOccupants([...localOccupants, newOccupant])
    startTransition(async () => {
      try {
        await joinLeg(slug, leg.id, currentParticipantId)
      } catch {
        setLocalOccupants(prev)
      }
    })
  }

  function handleLeave() {
    const prev = localOccupants
    setLocalOccupants(localOccupants.filter((o) => o.participant_id !== currentParticipantId))
    startTransition(async () => {
      try {
        await leaveLeg(slug, leg.id, currentParticipantId)
      } catch {
        setLocalOccupants(prev)
      }
    })
  }

  return (
    <div className="bg-card border-2 border-ink rounded-2xl shadow-[4px_4px_0_rgba(26,20,16,0.85)] overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm flex items-center gap-1.5">
            <span>{MODE_ICONS[leg.mode] ?? '🚗'}</span>
            {leg.label}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {leg.departure_city}
            {leg.departure_time && ` · ${leg.departure_time.slice(11, 16)}`}
            {leg.trunk_size && ` · ${TRUNK_LABELS[leg.trunk_size]}`}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
          free === 0 ? 'bg-ink text-paper border-ink' : 'bg-olive/15 text-olive border-olive/30'
        }`}>
          {free === 0 ? 'Complet' : `${free} libre${free > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        {localOccupants.map((o) => {
          const p = participantFor(o.participant_id)
          return (
            <div key={o.id} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center shrink-0">
                {p?.pseudo[0].toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium">{p?.pseudo ?? '…'}</span>
              {o.is_driver && <span className="text-xs text-muted ml-auto">conducteur·ice</span>}
            </div>
          )
        })}

        {Array.from({ length: free }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-line flex items-center justify-center shrink-0">
              <span className="text-muted text-xs">+</span>
            </div>
            {i === 0 && !isMember && free > 0 && (
              <button onClick={handleJoin} className="text-sm text-terracotta font-semibold hover:underline">
                Rejoindre
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-line flex items-center justify-between">
        {leg.link_url ? (
          <a href={leg.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky underline">
            Lien résa →
          </a>
        ) : <span />}
        {isMember && !localOccupants.find((o) => o.participant_id === currentParticipantId)?.is_driver && (
          <button onClick={handleLeave} className="text-xs text-muted hover:text-terracotta">Quitter</button>
        )}
      </div>
    </div>
  )
}
