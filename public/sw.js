// Service worker E-nergy — PWA avec support hors-ligne.
//
// Stratégie :
// - Assets statiques (JS/CSS/icônes buildés par Next.js) : cache-first
//   (ils ont un hash dans le nom de fichier, donc sûrs à mettre en cache longtemps)
// - Pages et appels API : network-first avec fallback sur le cache
//   (on privilégie toujours la donnée la plus fraîche ; le cache ne sert
//   qu'en dernier recours si le réseau est indisponible)
// - Si une page n'est ni en cache ni accessible en réseau, on affiche /offline

const CACHE_VERSION = "e-nergy-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne gère que les requêtes GET ; les mutations (POST/PATCH/DELETE)
  // doivent toujours passer par le réseau pour ne jamais agir sur une donnée obsolète.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore les requêtes vers d'autres origines (Cloudinary, Google Fonts, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Pages de navigation : network-first avec fallback offline
  event.respondWith(networkFirstPage(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Réponse JSON générique pour que le code client gère l'absence de réseau proprement
    return new Response(
      JSON.stringify({ error: "Hors ligne : données indisponibles" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}
