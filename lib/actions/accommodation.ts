'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  const parsedPrice = priceRaw ? parseFloat(priceRaw) : null
  const price_per_night = parsedPrice != null && Number.isFinite(parsedPrice) ? parsedPrice : null

  const supabase = await createClient()
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
  const supabase = await createClient()
  const { error } = await supabase.rpc('toggle_accommodation_vote', {
    p_option: optionId,
    p_participant: participantId,
  })
  if (error) throw new Error('Vote impossible.')
  revalidatePath(`/e/${slug}`)
}
