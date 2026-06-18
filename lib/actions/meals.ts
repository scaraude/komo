'use server'

import { revalidatePath } from 'next/cache'
import { createClientWithHeaders } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/session'

async function getSupabase(slug: string) {
  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) throw new Error('Non authentifié.')
  return createClientWithHeaders({ 'x-session-token': sessionToken })
}

export async function addMealSlot(
  slug: string,
  eventId: string,
  participantId: string,
  day: string,
  type: 'midi' | 'soir',
  label: string,
) {
  const supabase = await getSupabase(slug)
  const { error } = await supabase.from('meal_slots').insert({
    event_id: eventId,
    day,
    type,
    label,
    created_by: participantId,
  })
  if (error) throw new Error('Impossible d\'ajouter ce repas.')
  revalidatePath(`/e/${slug}`)
}

export async function addContribution(
  slug: string,
  slotId: string,
  participantId: string,
  what: string,
  forCount: number,
) {
  const supabase = await getSupabase(slug)
  const { error } = await supabase.from('meal_contributions').insert({
    slot_id: slotId,
    participant_id: participantId,
    what,
    for_count: forCount,
  })
  if (error) throw new Error('Impossible d\'ajouter cette contribution.')
  revalidatePath(`/e/${slug}`)
}

export async function removeContribution(slug: string, contributionId: string) {
  const supabase = await getSupabase(slug)
  await supabase.from('meal_contributions').delete().eq('id', contributionId)
  revalidatePath(`/e/${slug}`)
}
