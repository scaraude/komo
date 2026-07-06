'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mustSucceed } from '@/lib/actions/assert'
import type { DateProposal } from '@/lib/types'

export async function proposeDateOption(
  slug: string,
  eventId: string,
  participantId: string,
  start: string,
  end: string,
): Promise<DateProposal> {
  if (end < start) throw new Error('La fin doit être après le début.')
  const supabase = await createClient()
  // Proposer un créneau vaut « je peux » : le vote de l'auteur est pré-rempli.
  const { data, error } = await supabase.from('date_proposals').insert({
    event_id: eventId,
    start_date: start,
    end_date: end,
    created_by: participantId,
    votes: { [participantId]: true },
  }).select().single()
  if (error || !data) throw new Error('Impossible d\'ajouter ce créneau.')
  revalidatePath(`/e/${slug}`)
  return data
}

export async function voteDate(
  slug: string,
  proposalId: string,
  participantId: string,
  vote: boolean,
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_date_vote', {
    p_proposal: proposalId,
    p_participant: participantId,
    p_vote: vote,
  })
  if (error) throw new Error('Vote impossible.')
  revalidatePath(`/e/${slug}`)
}

export async function fixDate(slug: string, eventId: string, start: string, end: string) {
  if (end < start) throw new Error('La fin doit être après le début.')
  const supabase = await createClient()

  mustSucceed(
    await supabase.from('events').update({
      date_start: start,
      date_end: end,
    }).eq('id', eventId).select('id'),
    "Seul un organisateur peut fixer la date.",
  )

  await supabase.from('date_proposals').delete().eq('event_id', eventId)

  revalidatePath(`/e/${slug}`)
}

export async function deleteDateProposal(slug: string, proposalId: string) {
  const supabase = await createClient()
  mustSucceed(
    await supabase.from('date_proposals').delete().eq('id', proposalId).select('id'),
    'Tu ne peux supprimer que tes propres créneaux.',
  )
  revalidatePath(`/e/${slug}`)
}
