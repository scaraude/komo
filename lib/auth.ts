import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { clientEnv } from '@/lib/env/client'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export async function siteOrigin(): Promise<string> {
  return clientEnv.siteUrl
}

/**
 * Identité courante, dédupliquée pour la durée de la requête : `auth.getUser()`
 * est un appel réseau au serveur d'auth, et une même page l'appelle depuis
 * plusieurs composants (page, AppHeader, avatar…). Sans ce cache, chaque appel
 * repart sur le réseau et les latences s'additionnent en série.
 * Lecture seule → utilisable dans un Server Component.
 */
export const getAuthUser = cache(
  async (): Promise<{ id: string; email: string | null } | null> => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    return { id: data.user.id, email: data.user.email ?? null }
  },
)

export async function getUserId(): Promise<string | null> {
  const user = await getAuthUser()
  return user?.id ?? null
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
