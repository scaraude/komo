'use server'

import { createClient } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/auth'

/**
 * Envoie un magic link de connexion. Anti-énumération : on ne crée PAS de
 * compte (shouldCreateUser:false) et on renvoie TOUJOURS un succès, qu'un
 * compte existe ou non — sinon on révélerait quels emails sont enregistrés.
 * Le clic du lien (→ /auth/confirm) est ce qui prouve la possession.
 */
export async function requestLoginLink(email: string) {
  const clean = email.trim()
  if (!clean) return { ok: false as const }

  const supabase = await createClient()
  const origin = await siteOrigin()
  await supabase.auth.signInWithOtp({
    email: clean,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm?next=/mes-komos`,
    },
  })
  return { ok: true as const }
}

export type LoginState = { status: 'idle' | 'sent'; email: string }

export async function sendLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = (formData.get('email') ?? '').toString().trim()
  if (!email) return { status: 'idle', email: '' }
  await requestLoginLink(email)
  return { status: 'sent', email }
}
