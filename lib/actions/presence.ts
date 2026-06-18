'use server'

import { createClientWithHeaders } from '@/lib/supabase/server'
import { getSessionToken } from '@/lib/session'

type PresenceStatus = 'hot' | 'maybe' | 'unsure' | 'no'

export async function updatePresence(slug: string, participantId: string, status: PresenceStatus) {
  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) throw new Error('Non authentifié.')
  const supabase = await createClientWithHeaders({ 'x-session-token': sessionToken })
  const { error } = await supabase
    .from('participants')
    .update({ presence_status: status })
    .eq('id', participantId)
  if (error) throw new Error('Impossible de mettre à jour ton statut.')
}

export async function updatePartialDays(
  slug: string,
  participantId: string,
  days: Record<string, boolean>
) {
  const sessionToken = await getSessionToken(slug)
  if (!sessionToken) throw new Error('Non authentifié.')
  const supabase = await createClientWithHeaders({ 'x-session-token': sessionToken })
  const { error } = await supabase
    .from('participants')
    .update({ partial_days: days })
    .eq('id', participantId)
  if (error) throw new Error('Impossible de mettre à jour tes jours.')
}
