'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin,
  useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { CarCard } from './CarCard'
import { UnassignedZone } from './UnassignedZone'
import { ProposeVehicleForm } from './ProposeVehicleForm'
import { SuggestModal } from './SuggestModal'
import { DashedAddButton } from '@/components/ui/DashedAddButton'
import { Avatar } from '@/components/ui/Avatar'
import { joinLeg, leaveLeg, moveOccupant } from '@/lib/actions/transport'
import { randomId } from '@/lib/uuid'
import { pseudoOf as resolvePseudo, needsTransport } from '@/lib/participants'
import type { Leg, Occupant, Participant } from '@/lib/types'

// useSyncExternalStore sans mises à jour : false au SSR + à l'hydratation, true
// ensuite côté client. @dnd-kit génère ses ids via un compteur module → on ne
// monte le DnD qu'après l'hydratation pour éviter un mismatch (cf. MealsPanel).
const subscribeNoop = () => () => {}

// id de drop de la zone « non affectés ».
const UNASSIGNED_DROP = 'unassigned'

export function TransportPanel({
  slug,
  eventId,
  participantId,
  legs,
  occupants: initialOccupants,
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
  // Source de vérité unique des occupants (toutes directions confondues), pour
  // pouvoir déplacer un participant d'une carte à l'autre en optimiste.
  const [occupants, setOccupants] = useState(initialOccupants)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Souris : drag dès 6px. Tactile : appui long 200ms (le tap reste un tap, donc
  // les boutons Rejoindre/Quitter restent utilisables au doigt).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const dndReady = useSyncExternalStore(subscribeNoop, () => true, () => false)

  const directionLegs = legs.filter((l) => l.direction === direction)
  const occupantsOf = (legId: string) => occupants.filter((o) => o.leg_id === legId)
  const assignedIds = new Set(
    occupants
      .filter((o) => directionLegs.some((l) => l.id === o.leg_id))
      .map((o) => o.participant_id)
  )
  const unassigned = participants.filter(
    (p) => needsTransport(p) && !assignedIds.has(p.id)
  )

  // ---- Mutations optimistes (boutons + drag partagent le même state) ----
  function handleJoin(legId: string, pid: string) {
    const optimistic: Occupant = {
      id: randomId(), leg_id: legId, participant_id: pid,
      is_driver: false, locked: false, created_at: new Date().toISOString(),
    }
    const prev = occupants
    setOccupants((o) => [...o, optimistic])
    startTransition(() => joinLeg(slug, legId, pid).catch(() => setOccupants(prev)))
  }

  function handleLeave(legId: string, pid: string) {
    const prev = occupants
    setOccupants((o) => o.filter((x) => !(x.leg_id === legId && x.participant_id === pid && !x.is_driver)))
    startTransition(() => leaveLeg(slug, legId, pid).catch(() => setOccupants(prev)))
  }

  // Déplacement (drag). from/to null = zone « non affectés ».
  function handleMove(fromLegId: string | null, toLegId: string | null, pid: string) {
    if (fromLegId === toLegId) return
    const prev = occupants
    setOccupants((o) => {
      const without = fromLegId
        ? o.filter((x) => !(x.leg_id === fromLegId && x.participant_id === pid))
        : o
      if (!toLegId) return without
      return [...without, {
        id: randomId(), leg_id: toLegId, participant_id: pid,
        is_driver: false, locked: false, created_at: new Date().toISOString(),
      }]
    })
    startTransition(() => moveOccupant(slug, fromLegId, toLegId, pid).catch(() => setOccupants(prev)))
  }

  // Aperçu suivant le curseur : on retrouve le pseudo du participant déplacé.
  // Un occupant porte l'id de sa ligne ; un non-affecté l'id `unassigned:<pid>`.
  const activeOccupant = activeId ? occupants.find((o) => o.id === activeId) ?? null : null
  const activeUnassignedPid = activeId?.startsWith('unassigned:') ? activeId.slice('unassigned:'.length) : null
  const activePid = activeOccupant?.participant_id ?? activeUnassignedPid
  const activePseudo = activePid ? resolvePseudo(participants, activePid) : null

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (e.over == null) return
    const id = String(e.active.id)
    const overId = String(e.over.id)
    const toLegId = overId === UNASSIGNED_DROP ? null : overId

    // Source : occupant existant (carte) ou participant non affecté.
    const occ = occupants.find((o) => o.id === id)
    const pid = occ?.participant_id ?? (id.startsWith('unassigned:') ? id.slice('unassigned:'.length) : null)
    if (!pid) return
    const fromLegId = occ?.leg_id ?? null
    if (fromLegId === toLegId) return

    // On ne déplace jamais un conducteur·ice ni un occupant verrouillé.
    if (occ && (occ.is_driver || occ.locked)) return

    // Capacité : refuser le dépôt sur un véhicule plein (modes voiture/loc).
    if (toLegId) {
      const target = legs.find((l) => l.id === toLegId)
      if (target) {
        const tracksSeats = target.mode === 'car' || target.mode === 'rental'
        if (tracksSeats) {
          const taken = occupants.filter((o) => o.leg_id === toLegId).length
          if (taken >= (target.total_seats ?? 4)) return
        }
      }
    }

    handleMove(fromLegId, toLegId, pid)
  }

  const carCards = (
    <div className="flex flex-col gap-[11px]">
      {directionLegs.length === 0 && (
        <p className="text-muted text-[13px] py-4 text-center">Aucun trajet proposé pour l&apos;instant.</p>
      )}
      {directionLegs.map((leg) => (
        <CarCard key={leg.id} slug={slug} leg={leg}
          occupants={occupantsOf(leg.id)}
          participants={participants}
          currentParticipantId={participantId}
          eventDestination={eventDestination}
          draggable={dndReady}
          onJoin={() => handleJoin(leg.id, participantId)}
          onLeave={() => handleLeave(leg.id, participantId)}
          onEdit={() => setEditingLeg(leg)}
        />
      ))}
    </div>
  )

  const addBar = (
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
  )

  const body = (
    <>
      {carCards}
      {addBar}
      <UnassignedZone participants={unassigned} draggable={dndReady} dropId={UNASSIGNED_DROP} />
    </>
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

      {dndReady ? (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          {body}
          <DragOverlay>
            {activePseudo ? (
              <span className="inline-flex items-center gap-1.5 rounded-[20px] border-[1.5px] border-terracotta bg-card px-[12px] py-[7px] text-[13px] font-medium text-body shadow-[0_8px_24px_rgba(60,45,20,0.18)] cursor-grabbing">
                <Avatar pseudo={activePseudo} className="h-5 w-5 bg-terracotta text-[11px] text-white" />
                {activePseudo}
              </span>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        body
      )}

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
