import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Event } from '@/lib/types'

/**
 * L'event d'un slug, dédupliqué pour la durée de la requête : le layout (pour
 * les métadonnées OG) et la page le demandent tous les deux sur un même rendu.
 */
export const getEventBySlug = cache(async (slug: string): Promise<Event | null> => {
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('*').eq('slug', slug).single()
  return data
})
