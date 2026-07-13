'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { ensureUser, siteOrigin } from '@/lib/auth'

export async function createEvent(formData: FormData) {
  const title = formData.get('title')?.toString().trim()
  const destination = formData.get('destination')?.toString().trim()
  const eventTypeRaw = formData.get('event_type')?.toString() ?? 'autre'
  const eventType = (['weekend', 'soiree', 'concert', 'road_trip', 'sport', 'autre'].includes(eventTypeRaw)
    ? eventTypeRaw
    : 'autre') as 'weekend' | 'soiree' | 'concert' | 'road_trip' | 'sport' | 'autre'
  const poll = formData.get('poll') === '1'
  const dateStart = poll ? null : (formData.get('date_start')?.toString() || null)
  const dateEnd = poll ? null : (formData.get('date_end')?.toString() || null)
  const email = formData.get('email')?.toString().trim() || null

  if (!title || !destination) return
  if (!poll && (!dateStart || !dateEnd)) return

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

// Lien Tricount / cagnotte de l'event (URL de partage collée par un membre).
// Authz déléguée à la RPC set_event_tricount_url (tout membre de l'event, via
// is_event_member). Chaîne vide → on efface. Renvoie { ok } pour que l'UI
// réconcilie : un UPDATE direct bloqué par la RLS échouait en silence.
export async function updateTricountUrl(
  slug: string,
  url: string,
): Promise<{ ok: boolean }> {
  const raw = url.trim()
  // Prépend https:// si l'orga a collé sans schéma ; vide → null (retrait).
  const value = raw ? (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`) : null
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_event_tricount_url', {
    p_slug: slug,
    p_url: value,
  })
  if (error) return { ok: false }
  revalidatePath(`/e/${slug}`)
  return { ok: true }
}
