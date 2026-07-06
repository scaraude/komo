'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mustSucceed } from '@/lib/actions/assert'

export async function proposeDateOption(
  slug: string,
  eventId: string,
  participantId: string,
  start: string,
  end: string,
) {
  if (end < start) throw new Error('La fin doit être après le début.')
  const supabase = await createClient()
  const { error } = await supabase.from('date_proposals').insert({
    event_id: eventId,
    start_date: start,
    end_date: end,
    created_by: participantId,
  })
  if (error) throw new Error('Impossible d\'ajouter ce créneau.')
  revalidatePath(`/e/${slug}`)
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

export async function fixDate(slug: string, eventId: string, proposalId: string) {
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('date_proposals').select('start_date, end_date').eq('id', proposalId).single()
  if (!proposal) throw new Error('Proposition introuvable.')

  mustSucceed(
    await supabase.from('events').update({
      date_start: proposal.start_date,
      date_end: proposal.end_date,
    }).eq('id', eventId).select('id'),
    "Seul un organisateur peut fixer la date.",
  )

  await supabase.from('date_proposals').delete().eq('event_id', eventId)

  revalidatePath(`/e/${slug}`)
}
