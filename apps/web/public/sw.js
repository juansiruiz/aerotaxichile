// AeroTaxi Driver Service Worker
const CACHE_NAME = 'aerotaxi-driver-v1'
const PRECACHE_URLS = ['/driver', '/icon-192.png', '/icon-512.png']

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently ignore cache failures on install
      })
    }),
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

// ─── Fetch (offline fallback) ─────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response for /driver page
        if (url.pathname === '/driver') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'AeroTaxi', body: 'Tienes una nueva notificación', url: '/driver' }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    // Ignore malformed push data
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      vibrate: [200, 100, 200],
      tag:     'aerotaxi-driver',
      renotify: true,
      data:    { url: data.url },
    }),
  )
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/driver'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing /driver tab if open
        const existing = clientList.find(
          (c) => c.url.includes('/driver') && 'focus' in c,
        )
        if (existing) return existing.focus()
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl)
      }),
  )
})
