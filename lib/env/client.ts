/**
 * Variables d'environnement publiques (NEXT_PUBLIC_*), disponibles côté client
 * ET serveur. Point d'accès unique : interdit de lire process.env ailleurs
 * (cf. règle ESLint no-restricted-syntax).
 *
 * ⚠️ Next.js n'inline les NEXT_PUBLIC_* dans le bundle client que si elles sont
 * lues en accès *statique* (`process.env.NEXT_PUBLIC_X`). Ne PAS factoriser en
 * `process.env[name]` dynamique, sinon elles valent `undefined` dans le browser.
 */
function ensure(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`)
  }
  return value
}

export const clientEnv = {
  supabaseUrl: ensure(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: ensure(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  siteUrl: ensure(process.env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL'),
}
