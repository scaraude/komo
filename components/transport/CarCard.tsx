'use client'

import { useState, useTransition } from 'react'
import { deleteLeg, joinLeg, leaveLeg } from '@/lib/actions/transport'
import type { Leg, Occupant, Participant } from '@/lib/types'
import { randomId } from '@/lib/uuid'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { useUndo } from '@/components/ui/undo'
import { MODE_ICON } from '@/lib/transport/modes'
import { hhmm } from '@/lib/format'

const TRUNK_LABELS: Record<string, string> = {
  small: 'petit coffre', medium: 'coffre moyen', large: 'grand coffre',
}

export function CarCard({
  slug,
  leg,
  occupants,
  participants,
  currentParticipantId,
  eventDestination,
  onEdit,
}: {
  slug: string
  leg: Leg
  occupants: Occupant[]
  participants: Participant[]
  currentParticipantId: string
  eventDestination: string
  onEdit: () => void
}) {
  const [localOccupants, setLocalOccupants] = useState(occupants)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [, startTransition] = useTransition()
  const requestUndo = useUndo()

  const totalSeats = leg.total_seats ?? 4
  const free = totalSeats - localOccupants.length
  const myOccupant = localOccupants.find((o) => o.participant_id === currentParticipantId)
  const isMember = !!myOccupant
  const isAuthor = leg.created_by === currentParticipantId
  const othersCount = localOccupants.filter((o) => o.participant_id !== currentParticipantId).length
  const isBillet = leg.mode === 'train' || leg.mode === 'bus'
  const tracksSeats = leg.mode === 'car' || leg.mode === 'rental'

  // Itinéraire départ → arrivée. Un côté null = hérite du lieu de l'event
  // (garanti par la contrainte : seul le côté event peut être null).
  const from = leg.departure_city ?? eventDestination
  const to = leg.arrival_city ?? eventDestination
  const route = `${from} → ${to}`

  // Date « 23/07 ». Heure : départ→arrivée (train) « 08:12 → 10:45 », plage de
  // départ (voiture/loc) « 08:00–10:00 », ou heure simple.
  const dateLabel = leg.departure_time
    ? `${leg.departure_time.slice(8, 10)}/${leg.departure_time.slice(5, 7)}`
    : null
  const t1 = hhmm(leg.departure_time)
  const t2 = hhmm(leg.departure_time_end)
  const tArr = hhmm(leg.arrival_time)
  const timeLabel = t1 && tArr
    ? `${t1} → ${tArr}`
    : t1 && t2
      ? `${t1}–${t2}`
      : t1 || t2 || tArr || null

  function participantFor(id: string) {
    return participants.find((p) => p.id === id)
  }

  function handleJoin() {
    const newOccupant: Occupant = {
      id: randomId(),
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

  function handleDelete() {
    setRemoved(true) // retrait optimiste
    setConfirmingDelete(false)
    requestUndo({
      message: 'Trajet supprimé',
      commit: () => deleteLeg(slug, leg.id),
      undo: () => setRemoved(false),
    })
  }

  if (removed) return null

  return (
    <Card className="rounded-[18px] overflow-hidden">
      <div className="p-[15px_16px] flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink flex items-center gap-1.5">
            <span>{MODE_ICON[leg.mode] ?? '🚗'}</span>
            {leg.label}
          </p>
          <p className="text-[13px] text-muted mt-0.5">
            {route}
            {leg.vehicle_ref && ` · n° ${leg.vehicle_ref}`}
            {dateLabel && ` · ${dateLabel}`}
            {timeLabel && ` · ${timeLabel}`}
            {leg.trunk_size && ` · ${TRUNK_LABELS[leg.trunk_size]}`}
          </p>
          {leg.comment && (
            <p className="text-[13px] text-body mt-1 italic">« {leg.comment} »</p>
          )}
        </div>
        {tracksSeats ? (
          <span className={`shrink-0 rounded-[14px] px-[11px] py-[4px] text-[11.5px] font-bold ${
            free === 0 ? 'bg-[#efe7d8] text-muted' : 'bg-olive-soft text-olive-text'
          }`}>
            {free === 0 ? 'complet' : `${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`}
          </span>
        ) : localOccupants.length > 0 ? (
          <span className="shrink-0 bg-olive-soft text-olive-text rounded-[14px] px-[11px] py-[4px] text-[11.5px] font-bold">
            {localOccupants.length} à bord
          </span>
        ) : null}
      </div>

      {(localOccupants.length > 0 || !isMember) && (
        <div className="px-[16px] pb-[14px] flex flex-col gap-2 border-t border-line-2 pt-[12px]">
          {localOccupants.map((o) => {
            const p = participantFor(o.participant_id)
            return (
              <div key={o.id} className="flex items-center gap-2">
                <Avatar pseudo={p?.pseudo ?? ''} className="h-7 w-7 bg-ink text-xs text-white" />
                <span className="text-[14px] font-medium text-ink">{p?.pseudo ?? '…'}</span>
                {o.is_driver && <span className="text-[12px] text-muted ml-auto">conducteur·ice</span>}
              </div>
            )
          })}

          {tracksSeats
            ? /* Capacité plafonnée : places libres en pointillés. */
              Array.from({ length: free }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-[var(--color-dashed)] flex items-center justify-center shrink-0">
                    <span className="text-muted text-xs">+</span>
                  </div>
                  {i === 0 && !isMember && free > 0 && (
                    <button onClick={handleJoin} className="text-[14px] text-terracotta font-semibold hover:underline">
                      Rejoindre
                    </button>
                  )}
                </div>
              ))
            : /* Capacité illimitée : Rejoindre toujours dispo si non-membre. */
              !isMember && (
                <button onClick={handleJoin} className="flex items-center gap-2 text-left">
                  <span className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-[var(--color-dashed)] flex items-center justify-center shrink-0">
                    <span className="text-muted text-xs">+</span>
                  </span>
                  <span className="text-[14px] text-terracotta font-semibold">Rejoindre</span>
                </button>
              )}
        </div>
      )}

      {confirmingDelete ? (
        <div className="px-[16px] py-[11px] border-t border-line-2 bg-prune-soft flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink leading-[1.35] min-w-0">
            Supprimer ce trajet&nbsp;?
            {othersCount > 0 && (
              <span className="block text-muted">
                {othersCount > 1
                  ? `${othersCount} personnes perdront leur place`
                  : '1 personne perdra sa place'}
                .
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setConfirmingDelete(false)}
              className="text-[12px] text-muted px-2 py-[6px]">Annuler</button>
            <button onClick={handleDelete}
              className="text-[12px] font-bold text-white bg-prune rounded-[9px] px-3 py-[6px] active:translate-y-px transition-transform">
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        /* Barre d'actions : toujours affichée — l'édition est ouverte à tout membre. */
        <div className="px-[16px] py-[10px] border-t border-line-2 flex items-center justify-between gap-3">
          {leg.link_url ? (
            <a href={leg.link_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-terracotta font-semibold underline">
              {isBillet ? 'Lien / billet →' : 'Lien résa →'}
            </a>
          ) : <span />}
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={onEdit}
              className="text-[12px] text-muted hover:text-olive transition-colors inline-flex items-center gap-1">
              <span aria-hidden>✎</span> Modifier
            </button>
            {isMember && !myOccupant?.is_driver && (
              <button onClick={handleLeave} className="text-[12px] text-muted hover:text-terracotta transition-colors">Quitter</button>
            )}
            {isAuthor && (
              <button onClick={() => setConfirmingDelete(true)}
                className="text-[12px] text-muted hover:text-prune transition-colors inline-flex items-center gap-1">
                <span aria-hidden>🗑</span> Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
