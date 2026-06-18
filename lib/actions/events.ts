'use server'

import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { setCreatorCookie } from '@/lib/session'

export async function createEvent(formData: FormData) {
  const title = formData.get('title')?.toString().trim()
  const destination = formData.get('destination')?.toString().trim()
  const eventType = (formData.get('event_type')?.toString() ?? 'autre') as 'weekend' | 'soiree' | 'concert' | 'road_trip' | 'sport' | 'autre'
  const sondage = formData.get('sondage') === '1'
  const dateStart = sondage ? null : (formData.get('date_start')?.toString() || null)
  const dateEnd = sondage ? null : (formData.get('date_end')?.toString() || null)

  if (!title || !destination) return
  if (!sondage && (!dateStart || !dateEnd)) return

  const supabase = await createClient()
  const slug = nanoid(8)
  const creatorToken = crypto.randomUUID()

  const { error } = await supabase.from('events').insert({
    slug,
    creator_token: creatorToken,
    title,
    destination,
    date_start: dateStart,
    date_end: dateEnd,
    event_type: eventType,
  })

  if (error) throw new Error("Impossible de créer l'event.")

  await setCreatorCookie(slug, creatorToken)
  redirect(`/e/${slug}/join`)
}

export async function updateDeadline(slug: string, deadline: string) {
  const { getCreatorToken } = await import('@/lib/session')
  const { createClientWithHeaders } = await import('@/lib/supabase/server')
  const creatorToken = await getCreatorToken(slug)
  if (!creatorToken) throw new Error('Non autorisé.')
  const supabase = await createClientWithHeaders({ 'x-creator-token': creatorToken })
  await supabase
    .from('events')
    .update({ presence_deadline: deadline || null })
    .eq('slug', slug)
}
