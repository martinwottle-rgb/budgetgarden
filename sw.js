// Service Worker für den Budgetgarten: Offline-Cache und Erinnerungs-Push.
const VERSION = 'v10';
const CACHE = `budgetgarten-${VERSION}`;

// Alle App-Dateien, die beim Installieren vorab gespeichert werden (relativ zu dieser Datei).
const DATEIEN = [
  './index.html',
  './styles.css',
  './css/woche.css',
  './css/ios.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/logik.js',
  './js/spiel.js',
  './js/speicher.js',
  './js/szene.js',
  './js/push.js',
  './js/grafik/hilfen.js',
  './js/grafik/pflanzen.js',
  './js/grafik/moebel.js',
  './js/grafik/deko.js',
  './js/grafik/raritaeten.js',
  './js/grafik/pflanzen2.js',
  './js/grafik/moebel2.js',
  './js/grafik/deko2.js',
  './js/grafik/saat.js',
  './js/grafik/saison.js',
  './js/ui/bausteine.js',
  './js/ui/garten.js',
  './js/ui/buchen.js',
  './js/ui/uebersicht.js',
  './js/ui/statistik.js',
  './js/ui/ziele.js',
  './js/ui/shop.js',
  './js/ui/einstellungen.js',
  './js/ui/einrichtung.js',
  './js/ui/herbarium.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Fehlende Dateien dürfen die Installation nicht scheitern lassen.
    await Promise.all(
      DATEIEN.map((datei) =>
        cache.add(datei).catch((fehler) => {
          console.warn('Nicht vorab gecacht:', datei, fehler);
        })
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(
      namen
        .filter((name) => name.startsWith('budgetgarten-') && name !== CACHE)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const anfrage = event.request;
  if (anfrage.method !== 'GET') return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;

  // Seitenaufruf: aus dem Netz, offline auf index.html zurückfallen.
  if (anfrage.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(anfrage);
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Eigene Dateien: sofort aus dem Cache, im Hintergrund aktualisieren.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const gespeichert = await cache.match(anfrage);
    const netz = fetch(anfrage)
      .then((antwort) => {
        if (antwort && antwort.ok) cache.put(anfrage, antwort.clone());
        return antwort;
      })
      .catch(() => null);
    if (gespeichert) {
      event.waitUntil(netz);
      return gespeichert;
    }
    return (await netz) || Response.error();
  })());
});

self.addEventListener('push', (event) => {
  let text = 'Wie viel hast du heute ausgegeben?';
  if (event.data) {
    try {
      const daten = event.data.json();
      if (daten && daten.text) text = daten.text;
    } catch (_) {
      // Kein JSON: Standardtext behalten.
    }
  }
  event.waitUntil(self.registration.showNotification('Budgetgarten 🌱', {
    body: text,
    icon: './icons/icon-192.png',
    tag: 'abend',
    data: { url: './?eintragen=heute' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = new URL(
    (event.notification.data && event.notification.data.url) || './',
    self.registration.scope
  ).href;
  event.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const vorhanden = fenster.find((f) => new URL(f.url).origin === self.location.origin);
    if (vorhanden) {
      await vorhanden.focus();
      if ('navigate' in vorhanden) {
        try {
          await vorhanden.navigate(ziel);
        } catch (_) {
          // Navigation nicht möglich: Fenster bleibt fokussiert.
        }
      }
      return;
    }
    return self.clients.openWindow(ziel);
  })());
});
