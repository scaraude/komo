'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUser, siteOrigin } from '@/lib/auth'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * États du flow de join (email d'abord) :
 *  • email       : on attend l'email (étape initiale, visiteur non connecté)
 *  • need_pseudo : email libre (compte inexistant) → on demande le pseudo
 *  • verify      : email déjà enregistré → magic link envoyé, « Vérifie tes mails »
 */
export type JoinState =
  | { status: 'email' }
  | { status: 'need_pseudo'; email: string }
  | { status: 'verify' }

/**
 * Crée le participant (idempotent via dédoublonnage par user_id) puis redirige
 * vers l'event. Tous les chemins redirigent → Promise<never>.
 */
async function insertAndRedirect(
  client: ServerClient,
  slug: string,
  userId: string,
  pseudo: string,
): Promise<never> {
  const { data: event, error: eventError } = await client
    .from('events')
    .select('id, created_by')
    .eq('slug', slug)
    .single()

  if (eventError || !event) redirect('/')

  // Dédoublonnage : déjà participant de cet event (même user) ? on réutilise.
  // Couplé à l'index unique (event_id, user_id), ça tue les multi-comptes.
  const { data: existing } = await client
    .from('participants')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const role = event.created_by === userId ? 'créateur' : 'participant'
    const { error } = await client.from('participants').insert({
      event_id: event.id,
      pseudo,
      user_id: userId,
      role,
    })
    if (error) throw new Error('Impossible de rejoindre cet event.')
  }

  redirect(`/e/${slug}`)
}

/**
 * Flow de join « email d'abord » (visiteur non connecté), piloté par
 * useActionState — signature `(slug, prevState, formData)`, slug bind côté form.
 *
 *  1. Étape email : on teste l'email côté service_role.
 *     • déjà enregistré → magic link (« relier » : il revient authentifié sur
 *       son identité existante, sans recréer de doublon) → status `verify`.
 *     • libre          → on demande le pseudo → status `need_pseudo`.
 *  2. Étape pseudo (status précédent `need_pseudo`) : on crée l'identité, on
 *     attache l'email (best-effort), et on rejoint.
 */
export async function joinEvent(
  slug: string,
  prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const supabase = await createClient()
  const origin = await siteOrigin()

  // Étape 2 — on a déjà validé que l'email est libre, on finalise avec le pseudo.
  if (prev.status === 'need_pseudo') {
    const pseudo = formData.get('pseudo')?.toString().trim()
    if (!pseudo) return prev
    const { userId, supabase: authed } = await ensureUser()
    await authed.auth.updateUser(
      { email: prev.email },
      { emailRedirectTo: `${origin}/auth/confirm?next=/e/${slug}` },
    )
    return insertAndRedirect(authed, slug, userId, pseudo)
  }

  // Étape 1 — email.
  const email = formData.get('email')?.toString().trim()
  if (!email) return { status: 'email' }

  const admin = createAdminClient()
  const { data: registered } = await admin.rpc('email_is_registered', {
    p_email: email,
  })

  if (registered) {
    // Compte existant → magic link, pas de pseudo à redemander : au retour il
    // rejoint direct avec son identité (et son pseudo) existante.
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${origin}/auth/confirm?next=/e/${slug}/join`,
      },
    })
    return { status: 'verify' }
  }

  // Compte inexistant → on demande le pseudo (première connexion).
  return { status: 'need_pseudo', email }
}

/**
 * Join direct pour un visiteur DÉJÀ connecté (session présente). On réutilise
 * son pseudo existant (dernier participant connu) → aucune saisie. Si aucun
 * pseudo connu (cas limite), on prend celui du formulaire.
 */
export async function joinDirect(slug: string, formData: FormData): Promise<void> {
  const { userId, supabase } = await ensureUser()

  const { data: prior } = await supabase
    .from('participants')
    .select('pseudo')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const pseudo = prior?.pseudo ?? formData.get('pseudo')?.toString().trim()
  if (!pseudo) return

  await insertAndRedirect(supabase, slug, userId, pseudo)
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
