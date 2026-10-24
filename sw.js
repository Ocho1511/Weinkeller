/* Weinkeller Service Worker – App-Shell offline, HTML network-first (Updates), Schriften lokal gecacht */
const CACHE = 'weinkeller-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './fonts/Inter-latin.woff2', './fonts/PlayfairDisplay-latin.woff2', './fonts/PlayfairDisplay-Italic-latin.woff2', './fonts/UnifrakturMaguntia-latin.woff2',
  './lib/xlsx.full.min.js', './lib/jspdf.umd.min.js', './lib/jspdf.plugin.autotable.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fremde Origins (KI-Proxy, Vivino-Bilder) nicht abfangen → immer direkt aus dem Netz
  if (url.origin !== location.origin) return;

  // HTML/Navigation: network-first, damit neue App-Versionen sofort geladen werden; offline aus dem Cache
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Übrige gleiche-Origin-Dateien (Icons, Manifest, Schriften): cache-first
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }))
  );
});
