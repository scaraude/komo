import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { clientEnv } from '../env/client'
import { serverEnv } from '../env/server'

/**
 * Client Supabase à privilèges service_role. Contourne la RLS — à n'utiliser
 * QUE côté serveur (Server Action / Route Handler), jamais exposé au client.
 * Sert aux opérations qui doivent voir au-delà de l'identité courante, ex.
 * tester l'existence d'un email via `email_is_registered`.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
