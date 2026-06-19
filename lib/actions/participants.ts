'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureUser } from '@/lib/auth'

export async function joinEvent(slug: string, formData: FormData) {
  const pseudo = formData.get('pseudo')?.toString().trim()
  if (!pseudo || pseudo.length < 1) return

  // Session anonyme si besoin → l'identité est auth.uid(). On réutilise le
  // client authentifié renvoyé (la RLS insert exige user_id = auth.uid()).
  const { userId, supabase } = await ensureUser()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('slug', slug)
    .single()

  if (eventError || !event) redirect('/')

  // Dédoublonnage : déjà participant de cet event (même user) ? on réutilise.
  // Couplé à l'index unique (event_id, user_id), ça tue les multi-comptes.
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const role = event.created_by === userId ? 'créateur' : 'participant'
    const { error } = await supabase.from('participants').insert({
      event_id: event.id,
      pseudo,
      user_id: userId,
      role,
    })
    if (error) throw new Error('Impossible de rejoindre cet event.')
  }

  redirect(`/e/${slug}`)
}

export async function promoteParticipant(
  slug: string,
  targetId: string,
  newRole: 'co_organisateur' | 'participant',
) {
  // Authz déléguée à la RLS (participants_update_own_or_org : orga de l'event).
  const supabase = await createClient()
  await supabase.from('participants').update({ role: newRole }).eq('id', targetId)
  revalidatePath(`/e/${slug}`)
}
