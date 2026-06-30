'use server'

import { createClient } from '@/lib/supabase/server'
import { ensureUser } from '@/lib/auth'
import { PREF_DEFAULTS, type NotificationPrefValues } from '@/lib/notifications/prefs'
import type { Notification } from '@/lib/types'

// Actions du menu utilisateur : souscriptions Web Push, préférences, et lecture
// du centre de notifs. Écritures via le client authentifié (RLS user = auth.uid).

// Forme sérialisée d'un PushSubscription (JSON.parse(JSON.stringify(sub))).
type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Enregistre (ou rafraîchit) la souscription Web Push du navigateur courant. */
export async function savePushSubscription(sub: PushSubscriptionInput): Promise<void> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return
  const { userId, supabase } = await ensureUser()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: 'endpoint' },
    )
  if (error) {
    console.error('savePushSubscription failed', error)
    throw new Error("Impossible d'activer les notifications.")
  }
}

/** Retire la souscription Web Push du navigateur courant. */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return
  const { supabase } = await ensureUser()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

/** Préférences de notif de l'utilisateur courant (défauts si pas de ligne). */
export async function getNotificationPrefs(): Promise<NotificationPrefValues> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ...PREF_DEFAULTS }
  const { data } = await supabase
    .from('notification_prefs')
    .select('on_activity_created, on_transport_created, on_meal_created, on_participant_joined')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  return data ?? { ...PREF_DEFAULTS }
}

/** Met à jour (upsert) les préférences de notif de l'utilisateur courant. */
export async function updateNotificationPrefs(prefs: NotificationPrefValues): Promise<void> {
  const { userId, supabase } = await ensureUser()
  const { error } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) {
    console.error('updateNotificationPrefs failed', error)
    throw new Error('Impossible d’enregistrer tes préférences.')
  }
}

/** Les 30 dernières notifs de l'utilisateur courant (vide si non connecté). */
export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30)
  return data ?? []
}

/** Marque toutes les notifs non lues de l'utilisateur courant comme lues. */
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .is('read_at', null)
}
