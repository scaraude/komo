import 'server-only'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Origine publique de la requête courante (pour bâtir les emailRedirectTo). */
export async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Identité courante (id de l'utilisateur Supabase Auth), ou null.
 * Lecture seule → utilisable dans un Server Component.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/**
 * Identité courante, en créant une session anonyme si besoin. Renvoie AUSSI
 * le client authentifié — il faut réutiliser celui-ci pour les écritures, car
 * la session fraîchement créée vit dans son état mémoire (le cookie n'est pas
 * forcément relu par un nouveau client dans la même requête).
 * Écrit des cookies → à n'appeler QUE depuis un Server Action / Route Handler.
 */
export async function ensureUser(): Promise<{ userId: string; supabase: ServerClient }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) return { userId: data.user.id, supabase }

  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error || !signed.user) throw new Error('Auth anonyme impossible.')
  return { userId: signed.user.id, supabase }
}
