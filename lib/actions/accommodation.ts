'use server'

import { revalidatePath } from 'next/cache'
import { createClientWithHeaders } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/session'

async function getSupabase(slug: string) {
  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) throw new Error('Non authentifié.')
  return createClientWithHeaders({ 'x-session-token': sessionToken })
}

export async function proposeAccommodation(
  slug: string,
  eventId: string,
  participantId: string,
  formData: FormData,
) {
  const label = formData.get('label')?.toString().trim()
  if (!label) throw new Error('Label requis.')
  const url = formData.get('url')?.toString().trim() || null
  const priceRaw = formData.get('price_per_night')?.toString()
  const price_per_night = priceRaw ? parseFloat(priceRaw) : null

  const supabase = await getSupabase(slug)
  const { error } = await supabase.from('accommodation_options').insert({
    event_id: eventId,
    label,
    url,
    price_per_night,
    proposed_by: participantId,
  })
  if (error) throw new Error('Impossible de proposer ce logement.')
  revalidatePath(`/e/${slug}`)
}

export async function voteAccommodation(
  slug: string,
  optionId: string,
  participantId: string,
) {
  const supabase = await getSupabase(slug)
  const { data } = await supabase
    .from('accommodation_options').select('votes').eq('id', optionId).single()
  if (!data) return // option optimiste pas encore en DB

  const votes = { ...(data.votes as Record<string, boolean>) }
  votes[participantId] = !votes[participantId]
  await supabase.from('accommodation_options').update({ votes }).eq('id', optionId)
  revalidatePath(`/e/${slug}`)
}
