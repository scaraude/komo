import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'
import { clientEnv } from '../env/client'

export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey
  )
}
