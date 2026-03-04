const CACHE = 'medvault-v1';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/calendar.css',
  '/js/components/toast.js',
  '/js/components/modal.js',
  '/js/components/patientBadge.js',
  '/js/api.js',
  '/js/views/setup.js',
  '/js/views/login.js',
  '/js/views/calendar.js',
  '/js/views/patients.js',
  '/js/views/appointments.js',
  '/js/views/symptoms.js',
  '/js/views/medications.js',
  '/js/views/search.js',
  '/js/app.js',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for everything else (app shell + static assets)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
