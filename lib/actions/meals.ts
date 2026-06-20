'use server'

import { revalidatePath } from 'next/cache'
import { ensureUser } from '@/lib/auth'

// Refonte bouffe : repas (meals) + produits (products). RLS membre-de-l'event.
//
// IMPORTANT : les policies INSERT/UPDATE/DELETE exigent `is_event_member`, donc
// `auth.uid()`. On DOIT utiliser le client authentifié renvoyé par ensureUser()
// pour toutes les écritures — un `createClient()` neuf ne relit pas forcément la
// session dans la même requête, la requête partirait alors en anonyme et la RLS
// la rejetterait (erreur 42501 « new row violates row-level security policy »).

type NewItem = { name: string; quantity?: number | null; unit?: string }

export async function createMeal(
  slug: string,
  eventId: string,
  participantId: string,
  label: string,
  items: NewItem[] = [],
) {
  const clean = label.trim()
  if (!clean) throw new Error('Nom du repas requis.')
  const { supabase } = await ensureUser()

  const { data: meal, error } = await supabase
    .from('meals')
    .insert({ event_id: eventId, label: clean, created_by: participantId })
    .select('id')
    .single()
  if (error || !meal) {
    console.error('createMeal insert failed', error)
    throw new Error("Impossible d'ajouter ce repas.")
  }

  // Produits saisis dans le repas : taggés avec le nom du repas.
  const rows = items
    .map((it) => ({ ...it, name: it.name.trim() }))
    .filter((it) => it.name)
    .map((it) => ({
      event_id: eventId,
      meal_id: meal.id,
      name: it.name,
      quantity: it.quantity ?? null,
      unit: it.unit || 'unité',
      tags: [clean],
      created_by: participantId,
    }))
  if (rows.length) {
    const { error: itemsError } = await supabase.from('products').insert(rows)
    if (itemsError) console.error('createMeal items insert failed', itemsError)
  }

  revalidatePath(`/e/${slug}`)
}

export async function deleteMeal(slug: string, mealId: string) {
  const { supabase } = await ensureUser()
  // Les produits rattachés deviennent libres (meal_id → null via FK on delete
  // set null), ils restent dans la liste de courses.
  await supabase.from('meals').delete().eq('id', mealId)
  revalidatePath(`/e/${slug}`)
}

export async function addProduct(
  slug: string,
  eventId: string,
  participantId: string,
  input: { name: string; quantity?: number | null; unit?: string; tags?: string[]; mealId?: string | null },
) {
  const name = input.name.trim()
  if (!name) throw new Error('Nom du produit requis.')
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean)
  const { supabase } = await ensureUser()
  const { error } = await supabase.from('products').insert({
    event_id: eventId,
    name,
    quantity: input.quantity ?? null,
    unit: input.unit || 'unité',
    tags,
    meal_id: input.mealId ?? null,
    created_by: participantId,
  })
  if (error) {
    console.error('addProduct insert failed', error)
    throw new Error("Impossible d'ajouter ce produit.")
  }
  revalidatePath(`/e/${slug}`)
}

export async function toggleProduct(slug: string, productId: string, checked: boolean) {
  const { supabase } = await ensureUser()
  await supabase.from('products').update({ checked }).eq('id', productId)
  revalidatePath(`/e/${slug}`)
}

export async function deleteProduct(slug: string, productId: string) {
  const { supabase } = await ensureUser()
  await supabase.from('products').delete().eq('id', productId)
  revalidatePath(`/e/${slug}`)
}
