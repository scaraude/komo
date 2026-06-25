'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mustSucceed } from '@/lib/actions/assert'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUser, siteOrigin } from '@/lib/auth'

export type JoinState = { status: 'idle' | 'verify' }

/**
 * Rejoindre un event. Signature `(slug, prevState, formData)` pour useActionState
 * (slug est bind côté form). Renvoie `verify` pour afficher « Vérifie tes mails »,
 * sinon redirige vers l'event.
 */
export async function joinEvent(
  slug: string,
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const profileId = formData.get('profileId')?.toString().trim() || null
  const pseudo = formData.get('pseudo')?.toString().trim()
  // Revendiquer un profil existant n'exige pas de pseudo (le profil en a déjà
  // un) ; créer un nouveau participant l'exige.
  if (!profileId && (!pseudo || pseudo.length < 1)) return { status: 'idle' }
  const email = formData.get('email')?.toString().trim() || null

  const supabase = await createClient()
  const origin = await siteOrigin()

  // Flux « relier » : un visiteur sans identité réelle (pas de session, ou
  // session anonyme) saisit un email DÉJÀ rattaché à un compte. Créer ici un
  // participant ferait un doublon sous une identité anonyme jetable (Supabase
  // refuse d'attacher un email déjà pris → l'anonyme reste anonyme). On envoie
  // donc un magic link : au clic il revient authentifié sur son identité
  // existante (→ /auth/confirm → cette page) et le dédoublonnage par user_id
  // le reconnaît. L'oracle d'existence vit côté service_role uniquement.
  if (email) {
    const { data: auth } = await supabase.auth.getUser()
    const current = auth.user
    if (!current || current.is_anonymous) {
      const admin = createAdminClient()
      const { data: registered } = await admin.rpc('email_is_registered', {
        p_email: email,
      })
      if (registered) {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${origin}/auth/confirm?next=/e/${slug}/join`,
          },
        })
        return { status: 'verify' }
      }
    }
  }

  // Session anonyme si besoin → l'identité est auth.uid(). On réutilise le
  // client authentifié renvoyé (la RLS insert exige user_id = auth.uid()).
  const { userId, supabase: authed } = await ensureUser()

  // Email libre → on l'attache à l'identité (best-effort). Le clic du mail de
  // confirmation finalise le lien et permet la reconnexion ultérieure.
  if (email) {
    await authed.auth.updateUser(
      { email },
      { emailRedirectTo: `${origin}/auth/confirm?next=/e/${slug}` },
    )
  }

  const { data: event, error: eventError } = await authed
    .from('events')
    .select('id, created_by')
    .eq('slug', slug)
    .single()

  if (eventError || !event) redirect('/')

  // Dédoublonnage : déjà participant de cet event (même user) ? on réutilise.
  // Couplé à l'index unique (event_id, user_id), ça tue les multi-comptes.
  const { data: existing } = await authed
    .from('participants')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    // Revendiquer un profil sans compte : on s'attribue la ligne (user_id null
    // → soi). On ne touche pas au role (le profil garde le sien) ni au pseudo
    // (il en a déjà un). Le filtre `user_id is null` rend l'op idempotente en
    // cas de course : 0 ligne touchée → quelqu'un a déjà revendiqué le profil,
    // on retombe sur la création d'un participant neuf.
    let claimed = false
    if (profileId) {
      const { data: rows, error: claimError } = await authed
        .from('participants')
        .update({ user_id: userId })
        .eq('id', profileId)
        .eq('event_id', event.id)
        .is('user_id', null)
        .select('id')
      if (claimError) throw new Error('Impossible de rejoindre cet event.')
      claimed = (rows?.length ?? 0) > 0
    }

    if (!claimed) {
      if (!pseudo || pseudo.length < 1) {
        throw new Error('Choisis un pseudo pour rejoindre cet event.')
      }
      const role = event.created_by === userId ? 'créateur' : 'participant'
      const { error } = await authed.from('participants').insert({
        event_id: event.id,
        pseudo,
        user_id: userId,
        role,
      })
      if (error) throw new Error('Impossible de rejoindre cet event.')
    }
  }

  redirect(`/e/${slug}`)
}

/**
 * Ajoute un profil participant SANS compte (user_id null) à l'event. Ouvert à
 * tout membre (RLS participants_insert_profile_by_member). Renvoie la ligne
 * créée pour la réconciliation optimiste côté client.
 */
export async function addParticipantProfile(slug: string, eventId: string, pseudoRaw: string) {
  const pseudo = pseudoRaw.trim()
  if (!pseudo) throw new Error('Pseudo requis.')
  if (pseudo.length > 40) throw new Error('Pseudo trop long (40 max).')

  const { supabase } = await ensureUser()
  const { data, error } = await supabase
    .from('participants')
    .insert({ event_id: eventId, pseudo, user_id: null, role: 'participant' })
    .select('id, pseudo')
    .single()
  if (error || !data) {
    console.error('addParticipantProfile failed', error)
    throw new Error("Impossible d'ajouter ce pote.")
  }
  revalidatePath(`/e/${slug}`)
  return data
}

/**
 * Rattachements d'un profil : ce qui serait supprimé/détaché avec lui. Renvoie
 * une liste de libellés FR ([] si rien). Sert à alerter avant suppression.
 */
export async function getProfileAttachments(participantId: string): Promise<string[]> {
  const supabase = await createClient()
  const head = { count: 'exact' as const, head: true }
  const [occ, drives, signups, mealOwn] = await Promise.all([
    supabase.from('transport_occupants').select('id', head).eq('participant_id', participantId),
    supabase.from('transport_legs').select('id', head).eq('driver_id', participantId),
    supabase.from('activity_signups').select('id', head).eq('participant_id', participantId),
    supabase.from('meal_owners').select('id', head).eq('participant_id', participantId),
  ])
  const links: string[] = []
  const trips = (occ.count ?? 0) + (drives.count ?? 0)
  if (trips) links.push(`${trips} trajet${trips > 1 ? 's' : ''}`)
  if (signups.count) links.push(`${signups.count} activité${signups.count > 1 ? 's' : ''}`)
  if (mealOwn.count) links.push(`${mealOwn.count} repas`)
  return links
}

/**
 * Supprime un profil SANS compte. La RLS
 * (participants_delete_profile_by_member) garantit : profil sans compte
 * (user_id null) + appelant membre de l'event. Les rattachements partent via
 * les FK (cascade pour occupants/signups/meal_owners ; set null pour driver_id).
 */
export async function deleteParticipantProfile(slug: string, participantId: string) {
  const supabase = await createClient()
  const result = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)
    .is('user_id', null)
    .select('id')
  mustSucceed(result, 'Suppression impossible.')
  revalidatePath(`/e/${slug}`)
}

/**
 * Quitter le Komo : l'utilisateur courant supprime sa propre ligne participant.
 * Le créateur ne peut pas quitter. Les rattachements (trajets, inscriptions,
 * repas…) partent via les FK on delete. Redirige ensuite vers /mes-komos.
 */
export async function leaveEvent(slug: string) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) redirect('/')

  const { data: event } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('slug', slug)
    .single()
  if (!event) redirect('/mes-komos')
  if (event.created_by === userId) {
    throw new Error('Le créateur ne peut pas quitter le Komo.')
  }

  const result = await supabase
    .from('participants')
    .delete()
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .select('id')
  mustSucceed(result, 'Impossible de quitter cet event.')
  redirect('/mes-komos')
}

export async function promoteParticipant(
  slug: string,
  targetId: string,
  newRole: 'co_organisateur' | 'participant',
) {
  // Authz déléguée à la RLS (participants_update_own_or_org : orga de l'event).
  const supabase = await createClient()
  const result = await supabase.from('participants').update({ role: newRole }).eq('id', targetId).select('id')
  mustSucceed(result, "Promotion impossible : tu n'es pas organisateur de cet event.")
  revalidatePath(`/e/${slug}`)
}
