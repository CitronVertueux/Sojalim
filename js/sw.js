// Service Worker Sojalim PWA
const CACHE = 'sojalim-v1';
const STATIC = [
  './', './app.html', './index.html',
  './css/app.css', './css/mobile.css',
  './js/config.js', './js/auth.js', './js/email.js', './js/rdv.js',
  './logo.png', './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // Réseau d'abord pour les API Supabase
  if (e.request.url.includes('supabase.co') || e.request.url.includes('resend.com')) {
    return e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})));
  }
  // Cache d'abord pour les assets statiques
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
    return res;
  })));
});

// Notifications push
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'Sojalim RDV', body: 'Nouveau message' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icon-192.png', badge: './icon-192.png',
    vibrate: [200, 100, 200], data: { url: data.url || './app.html' },
    actions: [{ action: 'open', title: 'Ouvrir' }, { action: 'close', title: 'Fermer' }]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'close') {
    e.waitUntil(clients.openWindow(e.notification.data?.url || './app.html'));
  }
});
