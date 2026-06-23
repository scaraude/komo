'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mustSucceed } from '@/lib/actions/assert'

export async function proposeDateOption(
  slug: string,
  eventId: string,
  participantId: string,
  date: string,
) {
  const supabase = await createClient()
  const { error } = await supabase.from('date_proposals').insert({
    event_id: eventId,
    proposed_date: date,
    created_by: participantId,
  })
  if (error) throw new Error('Impossible d\'ajouter cette date.')
  revalidatePath(`/e/${slug}`)
}

export async function voteDate(
  slug: string,
  proposalId: string,
  participantId: string,
  vote: boolean,
) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('date_proposals').select('votes').eq('id', proposalId).single()
  if (!data) return // proposition optimiste pas encore en DB

  const votes = { ...(data.votes as Record<string, boolean>), [participantId]: vote }
  const { error } = await supabase
    .from('date_proposals').update({ votes }).eq('id', proposalId)
  if (error) throw new Error('Vote impossible.')
  revalidatePath(`/e/${slug}`)
}

export async function fixDate(slug: string, eventId: string, proposalId: string) {
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('date_proposals').select('proposed_date').eq('id', proposalId).single()
  if (!proposal) throw new Error('Proposition introuvable.')

  mustSucceed(
    await supabase.from('events').update({
      date_start: proposal.proposed_date,
      date_end: proposal.proposed_date,
    }).eq('id', eventId).select('id'),
    "Seul un organisateur peut fixer la date.",
  )

  await supabase.from('date_proposals').delete().eq('event_id', eventId)

  revalidatePath(`/e/${slug}`)
}
