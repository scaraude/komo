'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker au chargement de l'app — indépendamment des
 * notifications push. Sa présence (avec le handler fetch de /sw.js) rend l'app
 * réellement installable en standalone (WebAPK) sur Android. Sans compte ni
 * permission requise. No-op si le navigateur ne supporte pas les SW.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {})
  }, [])
  return null
}
