/* OpenShutter PWA service worker — minimal shell for installability + offline navigation fallback */
const CACHE = 'openshutter-pwa-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icon.svg', '/icon-192x192.png', '/icon-512x512.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
			.catch(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	// Navigation: network first, offline page when disconnected
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(() =>
				caches.match(OFFLINE_URL).then((r) => r || caches.match('/offline.html'))
			)
		);
		return;
	}

	// Served gallery images: cache for repeat views (stale-while-revalidate)
	if (url.pathname.startsWith('/api/storage/serve/')) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const cached = await cache.match(event.request);
				const network = fetch(event.request)
					.then((response) => {
						if (response.ok) cache.put(event.request, response.clone());
						return response;
					})
					.catch(() => cached);
				return cached || network;
			})
		);
	}
});
