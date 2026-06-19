'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Refonte bouffe : repas (meals) + produits (products). RLS membre-de-l'event.

export async function addMeal(slug: string, eventId: string, participantId: string, label: string) {
  const clean = label.trim()
  if (!clean) throw new Error('Nom du repas requis.')
  const supabase = await createClient()
  const { error } = await supabase.from('meals').insert({
    event_id: eventId, label: clean, created_by: participantId,
  })
  if (error) throw new Error("Impossible d'ajouter ce repas.")
  revalidatePath(`/e/${slug}`)
}

export async function deleteMeal(slug: string, mealId: string) {
  const supabase = await createClient()
  // Les produits rattachés deviennent libres (meal_id → null via FK on delete
  // set null), ils restent dans la liste de courses.
  await supabase.from('meals').delete().eq('id', mealId)
  revalidatePath(`/e/${slug}`)
}

export async function addProduct(
  slug: string,
  eventId: string,
  participantId: string,
  input: { name: string; tags?: string[]; mealId?: string | null },
) {
  const name = input.name.trim()
  if (!name) throw new Error('Nom du produit requis.')
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean)
  const supabase = await createClient()
  const { error } = await supabase.from('products').insert({
    event_id: eventId,
    name,
    tags,
    meal_id: input.mealId ?? null,
    created_by: participantId,
  })
  if (error) throw new Error("Impossible d'ajouter ce produit.")
  revalidatePath(`/e/${slug}`)
}

export async function toggleProduct(slug: string, productId: string, checked: boolean) {
  const supabase = await createClient()
  await supabase.from('products').update({ checked }).eq('id', productId)
  revalidatePath(`/e/${slug}`)
}

export async function deleteProduct(slug: string, productId: string) {
  const supabase = await createClient()
  await supabase.from('products').delete().eq('id', productId)
  revalidatePath(`/e/${slug}`)
}
