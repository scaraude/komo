'use server'

import { revalidatePath } from 'next/cache'
import { ensureUser } from '@/lib/auth'

// Module activités. RLS membre-de-l'event (is_event_member → auth.uid()), donc
// on DOIT écrire via le client authentifié de ensureUser() (cf. note dans
// lib/actions/meals.ts), sinon la requête part en anonyme et la RLS la rejette.

// Neutralise les schémas d'URL piégés (javascript:, data:…). URL sans schéma →
// préfixée en https://. Schéma non-http(s) → rejeté (null).
function safeHttpUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null
  return `https://${v}`
}

export type ActivityInput = {
  label: string
  activityDate?: string | null
  startTime?: string | null
  price?: number | null
  priceType?: 'total' | 'per_person' | 'per_group' | null
  groupSize?: number | null
  minParticipants?: number | null
  maxParticipants?: number | null
  bookingUrl?: string | null
}

export async function proposeActivity(
  slug: string,
  eventId: string,
  participantId: string,
  input: ActivityInput,
) {
  const label = input.label.trim()
  if (!label) throw new Error("Nom de l'activité requis.")

  // Le prix n'a de sens qu'avec un mode de découpage, et inversement.
  const priceType = input.price != null && input.price > 0 ? (input.priceType ?? 'total') : null
  const price = priceType ? input.price ?? null : null
  const groupSize = priceType === 'per_group' ? input.groupSize ?? null : null

  const min = input.minParticipants ?? null
  const max = input.maxParticipants ?? null
  if (min != null && max != null && min > max) {
    throw new Error('Le minimum ne peut pas dépasser le maximum.')
  }

  const { supabase } = await ensureUser()
  const { data, error } = await supabase.from('activities').insert({
    event_id: eventId,
    label,
    activity_date: input.activityDate || null,
    start_time: input.startTime || null,
    price,
    price_type: priceType,
    group_size: groupSize,
    min_participants: min,
    max_participants: max,
    booking_url: safeHttpUrl(input.bookingUrl),
    created_by: participantId,
  }).select().single()
  if (error || !data) {
    console.error('proposeActivity insert failed', error)
    throw new Error("Impossible de proposer cette activité.")
  }
  revalidatePath(`/e/${slug}`)
  return data
}

// Inscription : on s'inscrit / se désinscrit soi-même (toggle sur soi).
// join=true → INSERT (plafonné à max_participants), join=false → DELETE.
export async function toggleActivitySignup(
  slug: string,
  eventId: string,
  activityId: string,
  participantId: string,
  join: boolean,
) {
  const { supabase } = await ensureUser()

  if (join) {
    // Plafond de capacité vérifié côté serveur (la RLS ne sait pas compter).
    const { data: activity } = await supabase
      .from('activities').select('max_participants').eq('id', activityId).single()
    if (activity?.max_participants != null) {
      const { count } = await supabase
        .from('activity_signups')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId)
      if ((count ?? 0) >= activity.max_participants) {
        throw new Error("C'est complet sur cette activité.")
      }
    }

    const { error } = await supabase
      .from('activity_signups')
      .insert({ event_id: eventId, activity_id: activityId, participant_id: participantId })
    // 23505 = déjà inscrit : l'état voulu est atteint, on ignore.
    if (error && error.code !== '23505') {
      console.error('toggleActivitySignup insert failed', error)
      throw new Error("Impossible de t'inscrire.")
    }
  } else {
    const { error } = await supabase
      .from('activity_signups')
      .delete()
      .eq('activity_id', activityId)
      .eq('participant_id', participantId)
    if (error) {
      console.error('toggleActivitySignup delete failed', error)
      throw new Error('Impossible de te désinscrire.')
    }
  }
  revalidatePath(`/e/${slug}`)
}

export async function deleteActivity(slug: string, activityId: string) {
  const { supabase } = await ensureUser()
  // Les inscriptions partent en cascade (FK on delete cascade).
  const { error } = await supabase.from('activities').delete().eq('id', activityId)
  if (error) {
    console.error('deleteActivity failed', error)
    throw new Error("Impossible de supprimer cette activité.")
  }
  revalidatePath(`/e/${slug}`)
}
