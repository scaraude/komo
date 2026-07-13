import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env/server'
import { clientEnv } from '@/lib/env/client'
import { PREF_COLUMN, PREF_DEFAULTS, type NotificationType } from '@/lib/notifications/prefs'

// Cœur d'envoi des notifications. Appelé depuis les server actions après les
// événements métier (nouvelle activité / transport / repas, arrivée d'un pote).
//
// Deux canaux pour un même événement :
//   1. INSERT dans `notifications` → alimente le centre de notifs in-app (menu).
//   2. Web Push → notif système sur les appareils souscrits.
//
// Tout passe par le client service_role (admin) : on lit/écrit pour AUTRUI
// (les autres membres de l'event), ce que la RLS par-utilisateur interdirait.
// La fonction n'échoue JAMAIS bruyamment : une notif ratée ne doit pas casser
// l'action métier qui l'a déclenchée.

// Onglet ciblé sur la page de l'event, pour le deep-link au clic de la notif.
const TYPE_TAB: Record<NotificationType, string> = {
  activity_created: '?tab=activites',
  transport_created: '?tab=transport',
  meal_created: '?tab=bouffe',
  participant_joined: '',
}

// Construit le corps du message à partir du type, de l'acteur et du sujet.
function buildBody(type: NotificationType, actor: string, subject: string): string {
  switch (type) {
    case 'activity_created':
      return `${actor} a proposé une activité : ${subject}`
    case 'transport_created':
      return `${actor} a proposé un trajet${subject ? ` : ${subject}` : ''}`
    case 'meal_created':
      return `${actor} a ajouté un repas : ${subject}`
    case 'participant_joined':
      return `${actor} a rejoint le Komo`
  }
}

/**
 * Notifie tous les membres (avec compte) d'un event, SAUF l'acteur, pour un
 * événement métier donné — en respectant leurs préférences. `subject` = libellé
 * de l'entité créée (nom d'activité / repas, label du trajet). Pour
 * `participant_joined`, l'acteur EST le nouvel arrivant : on ne le notifie pas.
 */
export async function notifyEventMembers(params: {
  eventId: string
  type: NotificationType
  actorParticipantId: string
  subject?: string
}): Promise<void> {
  const { eventId, type, actorParticipantId, subject = '' } = params
  try {
    const admin = createAdminClient()

    // Event (titre + slug pour l'URL) et acteur (pseudo) en parallèle.
    const [{ data: event }, { data: actor }] = await Promise.all([
      admin.from('events').select('title, slug').eq('id', eventId).single(),
      admin.from('participants').select('pseudo').eq('id', actorParticipantId).single(),
    ])
    if (!event) return
    const actorName = actor?.pseudo ?? 'Quelqu’un'

    // Destinataires : membres de l'event ayant un compte, hors acteur.
    const { data: members } = await admin
      .from('participants')
      .select('id, user_id')
      .eq('event_id', eventId)
      .not('user_id', 'is', null)
    const userIds = [
      ...new Set(
        (members ?? [])
          .filter((m) => m.id !== actorParticipantId && m.user_id)
          .map((m) => m.user_id as string),
      ),
    ]
    if (!userIds.length) return

    // Préférences (défauts si pas de ligne).
    const { data: prefsRows } = await admin
      .from('notification_prefs')
      .select('*')
      .in('user_id', userIds)
    const prefsByUser = new Map((prefsRows ?? []).map((p) => [p.user_id, p]))
    const col = PREF_COLUMN[type]
    const recipients = userIds.filter((uid) => {
      const row = prefsByUser.get(uid)
      return row ? row[col] : PREF_DEFAULTS[col]
    })
    if (!recipients.length) return

    const title = event.title
    const body = buildBody(type, actorName, subject)
    const url = `/e/${event.slug}${TYPE_TAB[type]}`

    // 1. Centre de notifs in-app.
    const { error: notifError } = await admin.from('notifications').insert(
      recipients.map((uid) => ({ user_id: uid, event_id: eventId, type, title, body, url })),
    )
    if (notifError) console.error('notifyEventMembers insert failed', notifError)

    // 2. Web Push (best-effort, seulement si les clés VAPID sont configurées).
    await sendPush(admin, recipients, { title, body, url })
  } catch (err) {
    console.error('notifyEventMembers failed', err)
  }
}

type Admin = ReturnType<typeof createAdminClient>

async function sendPush(
  admin: Admin,
  recipients: string[],
  payload: { title: string; body: string; url: string },
): Promise<void> {
  const publicKey = clientEnv.vapidPublicKey
  const privateKey = serverEnv.vapidPrivateKey
  if (!publicKey || !privateKey) return

  webpush.setVapidDetails('mailto:contact@komoapp.fr', publicKey, privateKey)

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipients)
  if (!subs?.length) return

  const json = JSON.stringify({ ...payload, icon: '/icon-192.png' })
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        )
      } catch (err: unknown) {
        // 404/410 : endpoint mort → on purge la souscription.
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }),
  )
}
