'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureUser } from '@/lib/auth'
import { computeSuggestions } from '@/lib/transport/solver'
import type { Assignment } from '@/lib/transport/solver'

// Les écritures (legs / occupants / participants) sont protégées par des
// policies RLS basées sur `auth.uid()`. Il FAUT utiliser le client authentifié
// renvoyé par ensureUser() : un `createClient()` neuf ne relit pas forcément la
// session dans la même requête, la requête partirait en anonyme et la RLS la
// rejetterait (INSERT → erreur 42501 ; DELETE/UPDATE → 0 ligne silencieuse).
// Les lectures pures restent sur createClient() (policies select publiques).

export async function createLeg(
  slug: string,
  eventId: string,
  participantId: string,
  direction: 'aller' | 'retour',
  formData: FormData
) {
  const { supabase } = await ensureUser()

  const mode = formData.get('mode')?.toString() as 'car' | 'rental' | 'train' | 'bus' | 'navette'
  const label = formData.get('label')?.toString().trim() ?? ''
  // Géométrie du leg : le formulaire soumet directement départ + arrivée selon
  // la direction. Le côté event vaut '' quand non personnalisé → null → hérite
  // de events.destination. La contrainte CHECK garantit le côté participant.
  const departureCity = formData.get('departure_city')?.toString().trim() || null
  const arrivalCity = formData.get('arrival_city')?.toString().trim() || null
  const vehicleRef = formData.get('vehicle_ref')?.toString().trim() || null
  const rawDate = formData.get('departure_date')?.toString() || null
  const rawTime = formData.get('departure_time')?.toString() || null
  const rawTimeEnd = formData.get('departure_time_end')?.toString() || null
  const rawArrival = formData.get('arrival_time')?.toString() || null
  const seatsInput = parseInt(formData.get('total_seats')?.toString() ?? '4', 10)
  const trunkSize = (formData.get('trunk_size')?.toString() || null) as 'small' | 'medium' | 'large' | null
  const linkUrl = formData.get('link_url')?.toString().trim() || null
  const comment = formData.get('comment')?.toString().trim() || null

  // Seules voiture/location gèrent des places (et donc un·e chauffeur·euse).
  // Train/bus/navette = pas de places → total_seats null, pas d'occupant.
  // Pour voiture/location, la place de chauffeur·euse compte EN PLUS des places
  // passagers annoncées (total = passagers + 1) pour ne pas rogner une place.
  const tracksSeats = mode === 'car' || mode === 'rental'
  const isDriver = tracksSeats && formData.get('is_driver') !== 'false'
  const totalSeats = tracksSeats ? (isDriver ? seatsInput + 1 : seatsInput) : null
  // On inscrit le proposeur d'office : comme chauffeur·euse pour voiture/loc (si
  // le toggle est on), comme simple passager pour les modes illimités
  // (train/bus/navette) où total_seats null = capacité illimitée.
  const addSelf = tracksSeats ? isDriver : true

  // Date du trajet : celle saisie, sinon on retombe sur la date de l'event
  // (début pour un aller, fin pour un retour). Les heures s'y rattachent.
  let baseDate = rawDate
  if (!baseDate && (rawTime || rawTimeEnd || rawArrival)) {
    const { data: event } = await supabase
      .from('events')
      .select('date_start, date_end')
      .eq('id', eventId)
      .single()
    baseDate = (direction === 'retour' ? event?.date_end : event?.date_start) ?? null
  }
  const departureTime = baseDate && rawTime ? `${baseDate}T${rawTime}:00` : null
  const departureTimeEnd = baseDate && rawTimeEnd ? `${baseDate}T${rawTimeEnd}:00` : null
  const arrivalTime = baseDate && rawArrival ? `${baseDate}T${rawArrival}:00` : null

  const { data: leg, error } = await supabase
    .from('transport_legs')
    .insert({
      event_id: eventId,
      direction,
      mode,
      label,
      departure_city: departureCity,
      arrival_city: arrivalCity,
      vehicle_ref: vehicleRef,
      departure_time: departureTime,
      departure_time_end: departureTimeEnd,
      arrival_time: arrivalTime,
      total_seats: totalSeats,
      trunk_size: trunkSize,
      link_url: linkUrl,
      comment,
      driver_id: isDriver ? participantId : null,
      created_by: participantId,
    })
    .select('id')
    .single()

  if (error || !leg) throw new Error('Impossible de créer le trajet.')

  if (addSelf) {
    await supabase.from('transport_occupants').insert({
      leg_id: leg.id,
      participant_id: participantId,
      is_driver: isDriver,
      locked: false,
    })
  }

  // Rafraîchit le Server Component pour afficher le nouveau trajet sans reload.
  revalidatePath(`/e/${slug}`)
}

export async function joinLeg(slug: string, legId: string, participantId: string) {
  const { supabase } = await ensureUser()
  const { error } = await supabase.from('transport_occupants').insert({
    leg_id: legId,
    participant_id: participantId,
    is_driver: false,
    locked: false,
  })
  if (error) throw new Error('Impossible de rejoindre ce trajet.')
}

export async function leaveLeg(slug: string, legId: string, participantId: string) {
  const { supabase } = await ensureUser()
  await supabase
    .from('transport_occupants')
    .delete()
    .eq('leg_id', legId)
    .eq('participant_id', participantId)
    .eq('is_driver', false)
}

export async function deleteLeg(slug: string, legId: string) {
  const { supabase } = await ensureUser()
  // RLS (legs_delete_author) garantit que seul l'auteur peut supprimer.
  // Un refus se traduit par 0 ligne supprimée (sans erreur) — on le détecte
  // via .select() pour pouvoir rollback l'UI optimiste côté client.
  const { data, error } = await supabase
    .from('transport_legs')
    .delete()
    .eq('id', legId)
    .select('id')
  if (error) throw new Error('Impossible de supprimer ce trajet.')
  if (!data || data.length === 0) throw new Error("Tu n'es pas l'auteur de ce trajet.")
  // Les occupants sont supprimés en cascade (FK on delete cascade).
  revalidatePath(`/e/${slug}`)
}

export async function suggestAssignments(
  slug: string,
  eventId: string,
  direction: 'aller' | 'retour',
): Promise<{ assignments: Assignment[]; unresolved: string[] }> {
  const supabase = await createClient()

  const { data: legs } = await supabase
    .from('transport_legs').select('id, total_seats, departure_city, arrival_city')
    .eq('event_id', eventId).eq('direction', direction)

  const { data: occupants } = await supabase
    .from('transport_occupants').select('leg_id, participant_id')
    .in('leg_id', (legs ?? []).map((l) => l.id))

  const { data: participants } = await supabase
    .from('participants').select('id, departure_city, presence_status')
    .eq('event_id', eventId)

  const assignedIds = new Set((occupants ?? []).map((o) => o.participant_id))
  const unassigned = (participants ?? []).filter(
    (p) => ['hot', 'maybe', 'unsure'].includes(p.presence_status ?? '') && !assignedIds.has(p.id)
  )

  // Le solver matche sur le côté PARTICIPANT du leg (sa ville). Selon la
  // direction c'est departure_city (aller) ou arrival_city (retour) — la
  // contrainte garantit ce côté non-null.
  const solverLegs = (legs ?? []).map((l) => ({
    id: l.id,
    total_seats: l.total_seats,
    departure_city: (direction === 'aller' ? l.departure_city : l.arrival_city) ?? '',
  }))

  const assignments = computeSuggestions(unassigned, solverLegs, occupants ?? [])
  const assignedSet = new Set(assignments.map((a) => a.participantId))
  const unresolved = unassigned.filter((p) => !assignedSet.has(p.id)).map((p) => p.id)

  return { assignments, unresolved }
}

export async function applyAssignments(slug: string, assignments: Assignment[]) {
  // Authz RLS : occupants_insert autorise un orga à affecter dans son event.
  const { supabase } = await ensureUser()

  // Fetch existing occupants to avoid duplicates
  const legIds = [...new Set(assignments.map((a) => a.legId))]
  const { data: existing } = await supabase
    .from('transport_occupants').select('leg_id, participant_id')
    .in('leg_id', legIds)

  const existingPairs = new Set((existing ?? []).map((o) => `${o.leg_id}:${o.participant_id}`))

  const toInsert = assignments
    .filter((a) => !existingPairs.has(`${a.legId}:${a.participantId}`))
    .map((a) => ({ leg_id: a.legId, participant_id: a.participantId, is_driver: false, locked: false }))

  if (toInsert.length > 0) {
    const { error } = await supabase.from('transport_occupants').insert(toInsert)
    if (error) throw new Error('Impossible d\'appliquer les affectations.')
  }

  revalidatePath(`/e/${slug}`)
}

export async function updateDepartureInfo(
  slug: string,
  participantId: string,
  city: string,
  luggageSize: 'light' | 'medium' | 'large' | null
) {
  const { supabase } = await ensureUser()
  await supabase
    .from('participants')
    .update({ departure_city: city, luggage_size: luggageSize })
    .eq('id', participantId)
}
