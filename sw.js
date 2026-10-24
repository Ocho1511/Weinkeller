/* Weinkeller Service Worker – App-Shell offline, HTML network-first (Updates), Schriften und Bibliotheken lokal gecacht */
// Mehrere Weinkeller-Apps liegen unter derselben Herkunft (…github.io/<Repo>/). Jede bekommt deshalb einen eigenen Cache
// (Version + Pfad), und beim Aufräumen werden nur die eigenen alten Caches gelöscht, nicht die der anderen Apps.
const SCOPE = new URL(self.registration.scope).pathname;
const CACHE = 'weinkeller-v7:' + SCOPE;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './fonts/Inter-latin.woff2', './fonts/PlayfairDisplay-latin.woff2', './fonts/PlayfairDisplay-Italic-latin.woff2', './fonts/UnifrakturMaguntia-latin.woff2',
  './lib/xlsx.full.min.js', './lib/jspdf.umd.min.js', './lib/jspdf.plugin.autotable.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  // Alte Caches dieser App löschen: frühere gemeinsame Namen ohne Pfad ("weinkeller-v6") und ältere Versionen desselben Pfads
  const mine = (k) => k.startsWith('weinkeller-') && k !== CACHE && (!k.includes(':') || k.endsWith(':' + SCOPE));
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(mine).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Nur erfolgreiche Antworten speichern (ein kurzzeitiger 404/5xx darf die gute Kopie nicht überschreiben)
function remember(req, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fremde Origins (KI-Proxy, Vivino-Bilder) nicht abfangen → immer direkt aus dem Netz
  if (url.origin !== location.origin) return;

  // HTML/Navigation: network-first, damit neue App-Versionen sofort geladen werden; offline aus dem Cache
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then((res) => remember(req, res))
        .catch(() => caches.match(req, { cacheName: CACHE }).then((r) => r || caches.match('./index.html', { cacheName: CACHE })))
    );
    return;
  }

  // Übrige gleiche-Origin-Dateien (Icons, Manifest, Schriften, Bibliotheken): cache-first
  e.respondWith(
    caches.match(req, { cacheName: CACHE }).then((r) => r || fetch(req).then((res) => remember(req, res)))
  );
});
