// The rules for offline use, kept free of browser calls so they can be tested.
// `sw.ts` only turns these decisions into browser calls.

// Bump this when the caching rules change, so old caches are deleted.
export const CACHE = "lomo-sapiens-v2";

export const SHELL_PAGE = "./";

// Files with fixed names in public/. The fonts ship with the app, so it never asks a font server.
export const SHELL_FILES = [
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/inter-latin.woff2",
  "./fonts/inter-tight-latin.woff2",
  "./images/hero-march.png",
  // Sets the theme picked in Settings before the page draws.
  "./theme.js",
  // The Archive paper look: its label face and the paper layer's textures.
  "./fonts/special-elite-latin.woff2",
  "./textures/paper-crumple.jpg",
  "./textures/paper-grain.png",
];

export type Route = "network" | "shell" | "asset";

export interface RequestFacts {
  method: string;
  mode: string;
  url: string;
  origin: string;
}

export function route({ method, mode, url, origin }: RequestFacts): Route {
  // AI calls go to another origin. They are never cached, so keys and text stay out of the cache.
  if (method !== "GET" || new URL(url).origin !== origin) return "network";
  return mode === "navigate" ? "shell" : "asset";
}

export function outdated(cacheNames: readonly string[]): string[] {
  return cacheNames.filter((name) => name !== CACHE);
}

// Finds the built script and style files a page needs, so they are saved along with it.
export function assetsIn(html: string): string[] {
  const found = html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g);
  return [...new Set(Array.from(found, (match) => match[1]))];
}
