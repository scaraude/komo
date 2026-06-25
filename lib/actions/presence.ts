'use server'

import { createClient } from '@/lib/supabase/server'
import { ensureUser } from '@/lib/auth'
import { mustSucceed } from '@/lib/actions/assert'

type PresenceStatus = 'hot' | 'maybe' | 'unsure' | 'no'

// `status` null = retour à « non déclaré » (cycle ? → 🔥 → 🤔 → ❌ → ?).
// Tout membre peut changer le statut de n'importe qui : l'autorisation et le
// périmètre (colonne presence_status seule) sont gérés par la RPC set_presence
// (SECURITY DEFINER, contrôle is_event_member). Indispensable pour déclarer à
// la place des profils sans compte. Client authentifié obligatoire (ensureUser)
// pour que la RPC voie bien auth.uid().
export async function updatePresence(slug: string, participantId: string, status: PresenceStatus | null) {
  const { supabase } = await ensureUser()
  const { error } = await supabase.rpc('set_presence', { p_participant: participantId, p_status: status })
  if (error) throw new Error('Impossible de mettre à jour le statut.')
}

export async function updatePartialDays(
  slug: string,
  participantId: string,
  days: Record<string, boolean>
) {
  const supabase = await createClient()
  mustSucceed(
    await supabase.from('participants').update({ partial_days: days }).eq('id', participantId).select('id'),
    'Impossible de mettre à jour tes jours.',
  )
}
