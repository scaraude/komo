'use server'

import { createClient } from '@/lib/supabase/server'

type PresenceStatus = 'hot' | 'maybe' | 'unsure' | 'no'

export async function updatePresence(slug: string, participantId: string, status: PresenceStatus) {
  // Authz RLS : participants_update_own_or_org (user_id = auth.uid()).
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { error } = await supabase
    .from('participants')
    .update({ partial_days: days })
    .eq('id', participantId)
  if (error) throw new Error('Impossible de mettre à jour tes jours.')
}
