import { clientEnv } from '@/lib/env/client'

// Helpers Web Push côté navigateur (utilisés par le menu utilisateur).
// Aucun appel serveur ici : le composant relie le résultat aux server actions.

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js')
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
}

/** Souscription Web Push existante de ce navigateur, ou null. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

/**
 * Demande la permission, enregistre le SW et souscrit au push. Renvoie la
 * souscription sérialisée (à passer à savePushSubscription), ou null si refus /
 * non supporté / clé VAPID absente.
 */
export async function subscribeToPush(): Promise<{
  endpoint: string
  keys: { p256dh: string; auth: string }
} | null> {
  if (!isPushSupported()) return null
  const publicKey = clientEnv.vapidPublicKey
  if (!publicKey) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await getRegistration()
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  return JSON.parse(JSON.stringify(sub))
}

/** Désinscrit ce navigateur. Renvoie l'endpoint retiré (pour le serveur). */
export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getExistingSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}
