// Service worker Komo — Web Push (pas de cache offline).
// Reçoit les push envoyés par lib/notifications/dispatch.ts et gère le clic.

// Active le nouveau SW immédiatement (pas d'attente de fermeture des onglets).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Handler fetch minimal (pass-through). Sa seule présence est requise par
// Chromium/Brave pour considérer l'app « installable » en standalone (WebAPK)
// sur Android — sans lui, « Ajouter à l'écran d'accueil » ne crée qu'un
// raccourci avec barre d'URL. On ne fait aucun cache : on laisse passer.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Komo', body: event.data.text() }
  }
  const title = data.title || 'Komo'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Réutilise un onglet Komo déjà ouvert si possible, sinon en ouvre un.
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
