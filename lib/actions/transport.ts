'use server'

import { revalidatePath } from 'next/cache'
import { createClientWithHeaders } from '@/lib/supabase/server'
import { getSessionToken, getCreatorToken } from '@/lib/session'
import { computeSuggestions } from '@/lib/transport/solver'
import type { Assignment } from '@/lib/transport/solver'

async function getSupabaseWithSession(slug: string) {
  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) throw new Error('Non authentifié.')
  return createClientWithHeaders({ 'x-session-token': sessionToken })
}

export async function createLeg(
  slug: string,
  eventId: string,
  participantId: string,
  direction: 'aller' | 'retour',
  formData: FormData
) {
  const supabase = await getSupabaseWithSession(slug)

  const mode = formData.get('mode')?.toString() as 'car' | 'rental' | 'train' | 'bus' | 'navette'
  const label = formData.get('label')?.toString().trim() ?? ''
  const departureCity = formData.get('departure_city')?.toString().trim() ?? ''
  const rawTime = formData.get('departure_time')?.toString() || null
  const totalSeats = parseInt(formData.get('total_seats')?.toString() ?? '4', 10)
  const trunkSize = (formData.get('trunk_size')?.toString() || null) as 'small' | 'medium' | 'large' | null
  const linkUrl = formData.get('link_url')?.toString().trim() || null

  let departureTime: string | null = null
  if (rawTime) {
    const { data: event } = await supabase
      .from('events')
      .select('date_start, date_end')
      .eq('id', eventId)
      .single()
    const eventDate = direction === 'retour' ? event?.date_end : event?.date_start
    if (eventDate) departureTime = `${eventDate}T${rawTime}:00`
  }

  const { data: leg, error } = await supabase
    .from('transport_legs')
    .insert({
      event_id: eventId,
      direction,
      mode,
      label,
      departure_city: departureCity,
      departure_time: departureTime,
      total_seats: totalSeats,
      trunk_size: trunkSize,
      link_url: linkUrl,
      driver_id: participantId,
    })
    .select('id')
    .single()

  if (error || !leg) throw new Error('Impossible de créer le trajet.')

  await supabase.from('transport_occupants').insert({
    leg_id: leg.id,
    participant_id: participantId,
    is_driver: true,
    locked: false,
  })
}

export async function joinLeg(slug: string, legId: string, participantId: string) {
  const supabase = await getSupabaseWithSession(slug)
  const { error } = await supabase.from('transport_occupants').insert({
    leg_id: legId,
    participant_id: participantId,
    is_driver: false,
    locked: false,
  })
  if (error) throw new Error('Impossible de rejoindre ce trajet.')
}

export async function leaveLeg(slug: string, legId: string, participantId: string) {
  const supabase = await getSupabaseWithSession(slug)
  await supabase
    .from('transport_occupants')
    .delete()
    .eq('leg_id', legId)
    .eq('participant_id', participantId)
    .eq('is_driver', false)
}

export async function suggestAssignments(
  slug: string,
  eventId: string,
  direction: 'aller' | 'retour',
): Promise<{ assignments: Assignment[]; unresolved: string[] }> {
  const supabase = await getSupabaseWithSession(slug)

  const { data: legs } = await supabase
    .from('transport_legs').select('id, total_seats, departure_city')
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

  const assignments = computeSuggestions(unassigned, legs ?? [], occupants ?? [])
  const assignedSet = new Set(assignments.map((a) => a.participantId))
  const unresolved = unassigned.filter((p) => !assignedSet.has(p.id)).map((p) => p.id)

  return { assignments, unresolved }
}

export async function applyAssignments(slug: string, assignments: Assignment[]) {
  const creatorToken = await getCreatorToken(slug)
  if (!creatorToken) throw new Error('Non autorisé.')
  const supabase = await createClientWithHeaders({ 'x-creator-token': creatorToken })

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
  const supabase = await getSupabaseWithSession(slug)
  await supabase
    .from('participants')
    .update({ departure_city: city, luggage_size: luggageSize })
    .eq('id', participantId)
}
