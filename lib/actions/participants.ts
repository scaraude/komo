'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setSessionCookie } from '@/lib/session'

export async function joinEvent(slug: string, formData: FormData) {
  const pseudo = formData.get('pseudo')?.toString().trim()
  if (!pseudo || pseudo.length < 1) return

  const supabase = await createClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) redirect('/')

  const sessionToken = crypto.randomUUID()

  const { error } = await supabase.from('participants').insert({
    event_id: event.id,
    pseudo,
    session_token: sessionToken,
  })

  if (error) throw new Error('Impossible de rejoindre cet event.')

  await setSessionCookie(slug, sessionToken)
  redirect(`/e/${slug}`)
}
