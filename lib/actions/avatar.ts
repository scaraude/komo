'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureUser, getAuthUser } from '@/lib/auth'

const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Upload la photo de profil du compte courant et la propage sur toutes ses
 * lignes `participants` (un compte peut être membre de plusieurs events) :
 * la photo suit le compte, pas un event en particulier.
 */
export async function updateAvatar(formData: FormData): Promise<string> {
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) throw new Error('Aucune photo sélectionnée.')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Format non supporté (jpg, png ou webp).')
  if (file.size > MAX_SIZE) throw new Error('Photo trop lourde (5 Mo max).')

  const { userId, supabase } = await ensureUser()

  // Chemin fixe par compte (pas d'extension) : un ré-upload écrase l'ancienne
  // photo au lieu d'accumuler des fichiers orphelins.
  const path = `${userId}/avatar`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) {
    console.error('updateAvatar upload failed', uploadError)
    throw new Error("Impossible d'envoyer la photo.")
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust : le chemin est réutilisé à chaque changement de photo.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`

  // Peut toucher 0 ligne si le compte n'a encore rejoint aucun event — la
  // photo sera reprise à la volée au prochain join (voir joinEvent).
  const { error: updateError } = await supabase
    .from('participants')
    .update({ avatar_url: avatarUrl })
    .eq('user_id', userId)
  if (updateError) {
    console.error('updateAvatar sync failed', updateError)
    throw new Error("Impossible d'enregistrer la photo.")
  }

  revalidatePath('/', 'layout')
  return avatarUrl
}

/** Photo de profil du compte courant, ou null (pas de compte / pas de photo). */
export async function getMyAvatarUrl(): Promise<string | null> {
  const user = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('participants')
    .select('avatar_url')
    .eq('user_id', user.id)
    .not('avatar_url', 'is', null)
    .limit(1)
    .maybeSingle()
  return data?.avatar_url ?? null
}
