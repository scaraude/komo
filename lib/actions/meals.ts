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

// Renvoie les ids réels créés en DB pour que le client réconcilie son état
// optimiste (sinon « je gère »/toggle produit partiraient avec un id temporaire
// inexistant en base → échec FK).
export async function createMeal(
  slug: string,
  eventId: string,
  participantId: string,
  label: string,
  items: NewItem[] = [],
  mealDate: string | null = null,
): Promise<{ mealId: string; productIds: string[] }> {
  const clean = label.trim()
  if (!clean) throw new Error('Nom du repas requis.')
  const { supabase } = await ensureUser()

  const { data: meal, error } = await supabase
    .from('meals')
    .insert({ event_id: eventId, label: clean, meal_date: mealDate, created_by: participantId })
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
  let productIds: string[] = []
  if (rows.length) {
    // RETURNING renvoie les lignes dans l'ordre du VALUES inséré.
    const { data, error: itemsError } = await supabase.from('products').insert(rows).select('id')
    if (itemsError) console.error('createMeal items insert failed', itemsError)
    productIds = (data ?? []).map((d) => d.id)
  }

  revalidatePath(`/e/${slug}`)
  return { mealId: meal.id, productIds }
}

export async function setMealDate(slug: string, mealId: string, mealDate: string | null) {
  const { supabase } = await ensureUser()
  const { error } = await supabase.from('meals').update({ meal_date: mealDate }).eq('id', mealId)
  if (error) {
    console.error('setMealDate failed', error)
    throw new Error('Impossible de changer la date.')
  }
  revalidatePath(`/e/${slug}`)
}

// Responsable d'un repas : on s'inscrit / se retire soi-même (toggle sur soi).
// join=true → INSERT (idempotent via unique(meal_id, participant_id)),
// join=false → DELETE.
export async function toggleMealOwner(
  slug: string,
  eventId: string,
  mealId: string,
  participantId: string,
  join: boolean,
) {
  const { supabase } = await ensureUser()
  if (join) {
    const { error } = await supabase
      .from('meal_owners')
      .insert({ event_id: eventId, meal_id: mealId, participant_id: participantId })
    // 23505 = doublon (déjà responsable) : on l'ignore, l'état voulu est atteint.
    if (error && error.code !== '23505') {
      console.error('toggleMealOwner insert failed', error)
      throw new Error("Impossible de t'inscrire comme responsable.")
    }
  } else {
    const { error } = await supabase
      .from('meal_owners')
      .delete()
      .eq('meal_id', mealId)
      .eq('participant_id', participantId)
    if (error) {
      console.error('toggleMealOwner delete failed', error)
      throw new Error('Impossible de te retirer.')
    }
  }
  revalidatePath(`/e/${slug}`)
}

export async function deleteMeal(slug: string, mealId: string, deleteProducts = false) {
  const { supabase } = await ensureUser()
  // deleteProducts=true → on supprime aussi les produits du repas.
  // Sinon ils deviennent libres (meal_id → null via FK on delete set null) et
  // restent dans la liste de courses.
  if (deleteProducts) {
    await supabase.from('products').delete().eq('meal_id', mealId)
  }
  await supabase.from('meals').delete().eq('id', mealId)
  revalidatePath(`/e/${slug}`)
}

export async function addProduct(
  slug: string,
  eventId: string,
  participantId: string,
  input: { name: string; quantity?: number | null; unit?: string; tags?: string[]; mealId?: string | null },
): Promise<string> {
  const name = input.name.trim()
  if (!name) throw new Error('Nom du produit requis.')
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean)
  const { supabase } = await ensureUser()
  const { data, error } = await supabase.from('products').insert({
    event_id: eventId,
    name,
    quantity: input.quantity ?? null,
    unit: input.unit || 'unité',
    tags,
    meal_id: input.mealId ?? null,
    created_by: participantId,
  }).select('id').single()
  if (error || !data) {
    console.error('addProduct insert failed', error)
    throw new Error("Impossible d'ajouter ce produit.")
  }
  revalidatePath(`/e/${slug}`)
  return data.id
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
