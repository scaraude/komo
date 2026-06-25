import 'server-only'

/**
 * Variables d'environnement réservées au serveur. Jamais exposées au bundle
 * client (garde `server-only`). Point d'accès unique : interdit de lire
 * process.env ailleurs (cf. règle ESLint no-restricted-syntax).
 *
 * Politique : tout est obligatoire, SAUF GEOAPIFY_API_KEY qui reste optionnelle
 * en dev local (NODE_ENV === 'development') — l'autocomplete dégrade alors en
 * 503. En prod et en preview build (NODE_ENV === 'production'), elle est requise.
 */
const isDev = process.env.NODE_ENV === 'development'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`)
  }
  return value
}

export const serverEnv = {
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  geoapifyApiKey: isDev ? process.env.GEOAPIFY_API_KEY : required('GEOAPIFY_API_KEY'),
  // Optionnelle : webhook Discord pour le ping feedback. Absente → stockage seul.
  feedbackWebhookUrl: process.env.FEEDBACK_WEBHOOK_URL,
}
