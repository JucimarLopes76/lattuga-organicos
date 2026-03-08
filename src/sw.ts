/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'

// Precache resources dictated by VitePWA build
precacheAndRoute(self.__WB_MANIFEST || [])

// Listen to Push Notifications sent by our Edge Function
self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json()
            const options = {
                body: data.body || 'Você tem uma nova notificação.',
                icon: '/pwa-192x192.png',
                badge: '/favicon.svg',
                vibrate: [200, 100, 200],
                data: {
                    url: data.url || '/admin',
                },
            }
            event.waitUntil(self.registration.showNotification(data.title || 'Lattuga Orgânicos', options))
        } catch (e) {
            console.error('Falha ao parsear payload do push:', e)
            event.waitUntil(self.registration.showNotification('Lattuga Orgânicos', {
                body: 'Nova notificação do sistema!',
                icon: '/pwa-192x192.png'
            }))
        }
    }
})

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    // Retrieve URL from notification payload or default array
    const urlToOpen = event.notification.data?.url || '/admin/orders'
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i]
                // If it is open, just focus it
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus()
                }
            }
            // If not, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen)
            }
        })
    )
})
