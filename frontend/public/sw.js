// Service Worker for OpenShutter - Enhanced Mobile Support
const CACHE_NAME = 'openshutter-v2'
const STATIC_CACHE = 'openshutter-static-v2'
const DYNAMIC_CACHE = 'openshutter-dynamic-v2'
const IMAGE_CACHE = 'openshutter-images-v2'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/albums',
  '/login',
  '/search',
  '/offline',
  '/manifest.json'
]

// Mobile-specific assets
const MOBILE_ASSETS = [
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/screenshot-narrow.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Caching static assets')
          return cache.addAll(STATIC_ASSETS)
        }),
      // Cache mobile assets
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Caching mobile assets')
          return cache.addAll(MOBILE_ASSETS)
        })
    ])
    .then(() => {
      console.log('All assets cached successfully')
      return self.skipWaiting()
    })
    .catch((error) => {
      console.error('Failed to cache assets:', error)
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // API requests - Network First with fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache for API requests
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              // Return offline response for API requests
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'Offline - Please check your connection' 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              )
            })
        })
    )
    return
  }

  // Image requests - Cache First with mobile optimization
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              
              return fetch(request)
                .then((response) => {
                  if (response.ok) {
                    cache.put(request, response.clone())
                  }
                  return response
                })
                .catch(() => {
                  // Return a placeholder image for mobile
                  return new Response(
                    '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">Image unavailable offline</text></svg>',
                    { headers: { 'Content-Type': 'image/svg+xml' } }
                  )
                })
            })
        })
    )
    return
  }

  // Static assets - Cache First
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone()
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone)
                  })
              }
              return response
            })
        })
    )
    return
  }

  // HTML pages - Network First with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              // Return offline page
              return caches.match('/offline')
                .then((offlineResponse) => {
                  return offlineResponse || new Response(
                    '<html><body><h1>Offline</h1><p>Please check your connection</p></body></html>',
                    {
                      status: 200,
                      statusText: 'OK',
                      headers: { 'Content-Type': 'text/html' }
                    }
                  )
                })
            })
        })
    )
    return
  }

  // Default - Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone)
            })
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})
