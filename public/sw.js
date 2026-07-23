// Service Worker da Carteira Digital
// - Cacheia o shell do app (HTML, JS, CSS) para abrir offline
// - Estratégia network-first em navegações (HTML sempre fresco quando online)
// - Stale-while-revalidate para assets estáticos
// Os dados da carteira (trip JSON) ficam em localStorage do CarteiraPublicaV2.

const CACHE = "wallet-shell-v3";
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(SHELL_URLS);
    } catch {
      // Best-effort precache
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Allow the app-update flow to activate a waiting worker on demand.
self.addEventListener("message", (event) => {
  if (event && event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Apenas same-origin: não interceptamos chamadas para Supabase, Storage, etc.
  if (url.origin !== self.location.origin) return;

  // Navegações (HTML): network-first, fallback para shell em cache.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/", fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = (await cache.match(req)) || (await cache.match("/")) || (await cache.match("/index.html"));
        if (cached) return cached;
        return new Response(
          "<h1>Offline</h1><p>Sem conexão e sem cache disponível.</p>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  // Assets estáticos: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});