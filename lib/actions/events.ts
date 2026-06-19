'use server'

import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { ensureUser, siteOrigin } from '@/lib/auth'

export async function createEvent(formData: FormData) {
  const title = formData.get('title')?.toString().trim()
  const destination = formData.get('destination')?.toString().trim()
  const eventType = (formData.get('event_type')?.toString() ?? 'autre') as 'weekend' | 'soiree' | 'concert' | 'road_trip' | 'sport' | 'autre'
  const sondage = formData.get('sondage') === '1'
  const dateStart = sondage ? null : (formData.get('date_start')?.toString() || null)
  const dateEnd = sondage ? null : (formData.get('date_end')?.toString() || null)
  const email = formData.get('email')?.toString().trim() || null

  if (!title || !destination) return
  if (!sondage && (!dateStart || !dateEnd)) return

  // Crée une session anonyme si besoin → l'auteur est identifié par auth.uid().
  // On réutilise le client authentifié renvoyé (la RLS insert exige
  // created_by = auth.uid()).
  const { userId, supabase } = await ensureUser()
  const slug = nanoid(8)

  const { error } = await supabase.from('events').insert({
    slug,
    title,
    destination,
    date_start: dateStart,
    date_end: dateEnd,
    event_type: eventType,
    created_by: userId,
  })

  if (error) throw new Error("Impossible de créer l'event.")

  // Attache l'email à l'identité (best-effort, non bloquant) pour la récup.
  if (email) {
    const origin = await siteOrigin()
    await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${origin}/auth/confirm?next=/e/${slug}` },
    )
  }

  redirect(`/e/${slug}/join`)
}

export async function updateDeadline(slug: string, deadline: string) {
  // Authz déléguée à la RLS (events_update_creator : created_by = auth.uid()).
  const supabase = await createClient()
  await supabase
    .from('events')
    .update({ presence_deadline: deadline || null })
    .eq('slug', slug)
}
