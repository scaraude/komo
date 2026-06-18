'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createClientWithHeaders } from '@/lib/supabase/server'
import { setSessionCookie, getCreatorToken } from '@/lib/session'

export async function joinEvent(slug: string, formData: FormData) {
  const pseudo = formData.get('pseudo')?.toString().trim()
  if (!pseudo || pseudo.length < 1) return

  const supabase = await createClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, creator_token')
    .eq('slug', slug)
    .single()

  if (eventError || !event) redirect('/')

  const sessionToken = crypto.randomUUID()
  const creatorToken = await getCreatorToken(slug)
  const role = (creatorToken && creatorToken === event.creator_token) ? 'créateur' : 'participant'

  const { error } = await supabase.from('participants').insert({
    event_id: event.id,
    pseudo,
    session_token: sessionToken,
    role,
  })

  if (error) throw new Error('Impossible de rejoindre cet event.')

  await setSessionCookie(slug, sessionToken)
  redirect(`/e/${slug}`)
}

export async function promoteParticipant(
  slug: string,
  targetId: string,
  newRole: 'co_organisateur' | 'participant',
) {
  const creatorToken = await getCreatorToken(slug)
  if (!creatorToken) throw new Error('Non autorisé.')
  const supabase = await createClientWithHeaders({ 'x-creator-token': creatorToken })
  await supabase.from('participants').update({ role: newRole }).eq('id', targetId)
  revalidatePath(`/e/${slug}`)
}
