'use server'

import { ensureUser } from '@/lib/auth'
import { serverEnv } from '@/lib/env/server'

// Feedback in-app. Deux couches : stockage Supabase (source de vérité) + ping
// Discord best-effort. RLS = insert pour tout user authentifié (anon inclus),
// donc on écrit via le client de ensureUser().

export async function sendFeedback(input: {
  message: string
  eventId?: string | null
  userAgent?: string | null
}) {
  const message = input.message?.trim()
  if (!message) throw new Error('Message vide.')
  if (message.length > 2000) throw new Error('Message trop long (2000 max).')

  const { userId, supabase } = await ensureUser()
  const { error } = await supabase.from('feedback').insert({
    message,
    event_id: input.eventId ?? null,
    user_id: userId,
    user_agent: input.userAgent ?? null,
  })
  if (error) {
    console.error('sendFeedback insert failed', error)
    throw new Error("Impossible d'envoyer le feedback.")
  }

  // Ping Discord (format webhook = { content }). Best-effort : un webhook absent
  // ou en échec ne doit JAMAIS faire échouer l'envoi côté utilisateur.
  const webhook = serverEnv.feedbackWebhookUrl
  if (webhook) {
    try {
      const context = input.eventId ? `\n— event \`${input.eventId}\`` : ''
      // Discord rejette (400) au-delà de 2000 caractères : on plafonne.
      const content = `💬 **Nouveau feedback Komo**\n${message}${context}`.slice(0, 2000)
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        // Un webhook lent/bloqué ne doit pas figer l'action serveur.
        signal: AbortSignal.timeout(2000),
      })
    } catch (e) {
      console.error('feedback webhook failed', e)
    }
  }
}
