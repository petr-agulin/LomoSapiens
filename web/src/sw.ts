// Turns the decisions in lib/offline.ts into browser calls. It decides nothing itself.
import { CACHE, SHELL_FILES, SHELL_PAGE, assetsIn, outdated, route } from "./lib/offline";

declare const self: ServiceWorkerGlobalScope;

const at = (path: string) => new URL(path, self.registration.scope).href;

// The page is saved last, so a saved page never refers to files that aren't saved yet.
async function saveShell(): Promise<void> {
  const cache = await caches.open(CACHE);
  const page = await fetch(at(SHELL_PAGE), { cache: "no-cache" });
  if (!page.ok) throw new Error(`Could not fetch the app page: ${page.status}`);
  const html = await page.clone().text();
  await cache.addAll([...SHELL_FILES, ...assetsIn(html)].map(at));
  await cache.put(at(SHELL_PAGE), page);
}

async function deleteOutdatedCaches(): Promise<void> {
  const names = outdated(await caches.keys());
  await Promise.all(names.map((name) => caches.delete(name)));
}

async function respondWithShell(request: Request): Promise<Response> {
  return (await caches.match(at(SHELL_PAGE))) ?? fetch(request);
}

async function respondWithAsset(request: Request): Promise<Response> {
  // Servers may send "Vary: Origin", and Chrome's script and style requests can then miss
  // the saved copy. These are the app's own files with unique names, so that header can be ignored.
  const saved = await caches.match(request, { ignoreVary: true });
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOutdatedCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const decision = route({
    method: request.method,
    mode: request.mode,
    url: request.url,
    origin: self.location.origin,
  });

  if (decision === "network") return;

  if (decision === "shell") {
    // Answer at once from the saved page, which matters on a poor connection,
    // and refresh it in the background for next time.
    event.respondWith(respondWithShell(request));
    event.waitUntil(saveShell().catch(() => undefined));
    return;
  }

  event.respondWith(respondWithAsset(request));
});
