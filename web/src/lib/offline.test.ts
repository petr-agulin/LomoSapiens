import { describe, expect, it } from "vitest";
import { CACHE, SHELL_FILES, assetsIn, outdated, route } from "./offline";

// Every file in public/, as Vite sees it. Listing them doesn't load them.
const publicFiles = Object.keys(import.meta.glob("../../public/**/*")).map((path) => path.replace("../../public/", "./"));

describe("the files saved on install", () => {
  it("include the fonts and the Home picture, so the first visit already works offline", () => {
    for (const file of ["./fonts/inter-latin.woff2", "./fonts/inter-tight-latin.woff2", "./images/hero-march.png"]) {
      expect(SHELL_FILES).toContain(file);
    }
  });

  it("all exist in the public folder", () => {
    for (const file of SHELL_FILES) expect(publicFiles, file).toContain(file);
  });
});

const origin = "https://app.example";

describe("route", () => {
  it("serves page visits from the saved app shell", () => {
    expect(route({ method: "GET", mode: "navigate", url: `${origin}/`, origin })).toBe("shell");
  });

  it("serves the app's own files from the cache", () => {
    const url = `${origin}/assets/index-abc.js`;
    expect(route({ method: "GET", mode: "cors", url, origin })).toBe("asset");
  });

  it("never caches calls to an AI provider on another origin", () => {
    const url = "https://api.provider.example/v1/chat/completions";
    expect(route({ method: "GET", mode: "cors", url, origin })).toBe("network");
    expect(route({ method: "POST", mode: "cors", url, origin })).toBe("network");
  });

  it("never caches anything but GET requests", () => {
    expect(route({ method: "POST", mode: "cors", url: `${origin}/x`, origin })).toBe("network");
  });
});

describe("outdated", () => {
  it("marks every cache except the current one for deletion", () => {
    expect(outdated(["exposure-coach-v1", CACHE, "other"])).toEqual(["exposure-coach-v1", "other"]);
  });
});

describe("assetsIn", () => {
  it("finds built scripts and styles once each, and nothing else", () => {
    const html = `
      <link rel="manifest" href="./manifest.webmanifest" />
      <link rel="icon" href="./icons/icon-192.png" />
      <script type="module" crossorigin src="./assets/index-abc.js"></script>
      <link rel="stylesheet" crossorigin href="./assets/index-def.css">
      <link rel="modulepreload" href="./assets/index-abc.js">
    `;
    expect(assetsIn(html)).toEqual(["./assets/index-abc.js", "./assets/index-def.css"]);
  });
});
