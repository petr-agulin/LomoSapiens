// Makes the README's nine screenshots from the built app, with made-up data, at a typical phone's
// size: Home in the three themes, then six screens in Light. Writes them to docs/screenshots.
//   npm run build, then npm run serve-built in one terminal, and npm run screenshots in another.
// Drives Chrome through its own debugging connection, so it needs no package. Set CHROME to Chrome's path if it
// isn't in the usual place. Node only.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:4319";
const out = resolve(fileURLToPath(new URL("../../docs/screenshots", import.meta.url)));
const chromePath = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9391;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// Made-up data: one camera, one roll with five recorded frames, and the last shot analysed. No brand, no place.
const camera = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/500", slowestShutter: "1/15", hasBulb: "yes" };
const day = { light: { group: "day", sky: "sun_behind_clouds", place: "open" }, lowSun: false, stormOutside: false, sunBehind: false, subject: "portrait", distanceM: null, goal: "blur" };
// The engine's own advice for each scene on this camera: a portrait in sun behind clouds, and a landscape in sun.
const advice = { aperture: "4", shutter: "1/500", bulbSeconds: null, focus: { meters: 1, source: "default" } };
const landscape = { ...day, light: { group: "day", sky: "sun", place: "open" }, subject: "landscape", goal: "sharp" };
const landscapeAdvice = { aperture: "11", shutter: "1/500", bulbSeconds: null, focus: { meters: 5, source: "landscape" } };
const frame = (number: number, aperture: string, shutter: string, focusM: number | null, note: string, labels: string[], answers = day) => ({
  id: `f${number}`, rollId: "r1", number, recordedAt: `2026-11-0${number + 2}T1${number}:00`,
  set: { aperture, shutter, bulbSeconds: null, focusM }, advice: answers === day ? advice : landscapeAdvice, answers, hold: "hand", note, photo: null, labels, developedNote: "",
});
const data = {
  version: 2,
  cameras: [{ id: "c1", name: "My camera", answers: camera, film: { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-03" } }],
  inUse: "c1",
  hold: "hand",
  lastShot: { answers: day, result: advice },
  rolls: [],
  frames: [
    frame(1, "16", "1/250", null, "The old bridge from the hill", ["good"], landscape),
    frame(2, "11", "1/250", null, "Same view, one step more light", ["good"], landscape),
    frame(3, "4", "1/500", 1, "Anna on the bench", ["too_light"]),
    frame(4, "5.6", "1/500", 1, "", []),
    frame(5, "4", "1/500", 1, "Anna by the window, second try with the curtain open", []),
  ],
};

const profile = mkdtempSync(join(tmpdir(), "lomosapiens-shots-"));
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let socketUrl = "";
for (let tries = 0; tries < 60 && !socketUrl; tries += 1) {
  try {
    const pages = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
    socketUrl = pages.find((page) => page.type === "page")?.webSocketDebuggerUrl ?? "";
  } catch {
    // Chrome is still starting.
  }
  if (!socketUrl) await sleep(200);
}
if (!socketUrl) throw new Error(`Chrome didn't start: is it at ${chromePath}? Set CHROME to its path.`);

const socket = new WebSocket(socketUrl);
await new Promise((done) => socket.addEventListener("open", done));
let lastId = 0;
const waiting = new Map<number, (result: { result?: { value?: unknown }; data?: string }) => void>();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)!(message.result ?? {});
    waiting.delete(message.id);
  }
});
const send = (method: string, params: object = {}) =>
  new Promise<{ result?: { value?: unknown }; data?: string }>((done) => {
    lastId += 1;
    waiting.set(lastId, done);
    socket.send(JSON.stringify({ id: lastId, method, params }));
  });
const run = async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

/** Taps the first button whose text or label starts with these words, or holds them, inside an optional part of the page. */
async function tap(words: string, within = "body", anywhere = false) {
  const done = await run(`(() => {
    const root = document.querySelector(${JSON.stringify(within)});
    const has = (text) => ${anywhere ? "text.includes" : "text.startsWith"}(${JSON.stringify(words)});
    const button = [...(root?.querySelectorAll("button") ?? [])].find((b) => has(b.textContent.trim()) || has(b.getAttribute("aria-label") ?? ""));
    button?.click();
    return !!button;
  })()`);
  if (!done) throw new Error(`No button "${words}"`);
  await sleep(450);
}

/** Opens the app with the data and the theme, from Home. */
async function open(theme: "phone" | "archive", scheme: "light" | "dark") {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-transparency", value: "no-preference" }] });
  await send("Page.navigate", { url: `${base}/` });
  await sleep(800);
  await run(`localStorage.setItem("lomosapiens.data", ${JSON.stringify(JSON.stringify(data))}); ${theme === "archive" ? `localStorage.setItem("lomosapiens.theme", "archive")` : `localStorage.removeItem("lomosapiens.theme")`}; true`);
  await send("Page.reload");
  await sleep(1500);
}

/** PNG, but JPEG for Archive paper, whose paper texture would make a PNG ten times larger. */
async function shoot(name: string, theme: "phone" | "archive") {
  await run(`document.fonts.ready.then(() => true)`);
  await sleep(300);
  const jpeg = theme === "archive";
  const { data } = await send("Page.captureScreenshot", jpeg ? { format: "jpeg", quality: 85 } : { format: "png" });
  const file = `${name}.${jpeg ? "jpg" : "png"}`;
  writeFileSync(join(out, file), Buffer.from(data ?? "", "base64"));
  console.log(`docs/screenshots/${file}`);
}

// The README's grid, row by row: Home in the three themes; the light, the place and the result;
// a roll, a recorded frame and Theory. Numbered, so the files sort in the grid's order.
const toRoll = async () => { await tap("Menu"); await tap("Rolls", "nav"); await tap("ISO 400 colour", "main", true); };
const SHOTS: [string, "phone" | "archive", "light" | "dark", () => Promise<void>][] = [
  ["1-home-light", "phone", "light", async () => {}],
  ["2-home-dark", "phone", "dark", async () => {}],
  ["3-home-archive-paper", "archive", "light", async () => {}],
  ["4-light", "phone", "light", async () => { await tap("Analyse a new shot"); await tap("Outside, by day", "main", true); }],
  ["5-place", "phone", "light", async () => { await tap("Analyse a new shot"); await tap("Outside, by day", "main", true); await tap("Sun behind clouds", "[role=dialog]"); }],
  ["6-result", "phone", "light", async () => { await tap("Analyse a new shot"); await tap("Next"); await tap("Show settings"); }],
  ["7-roll", "phone", "light", toRoll],
  ["8-frame", "phone", "light", async () => { await toRoll(); await tap("Frame 2", "main", true); }],
  ["9-theory", "phone", "light", async () => { await tap("Menu"); await tap("Theory", "nav"); await tap("Sunny 16", "main"); }],
];

try {
  // The folder holds only what this script makes, so earlier pictures go first.
  mkdirSync(out, { recursive: true });
  for (const old of readdirSync(out)) if (/\.(png|jpg)$/.test(old)) rmSync(join(out, old));
  await send("Page.enable");
  await send("Runtime.enable");
  // A typical Android phone in Chrome: 392 × 735 CSS pixels, drawn at twice the density for sharp pictures.
  await send("Emulation.setDeviceMetricsOverride", { width: 392, height: 735, deviceScaleFactor: 2, mobile: true });
  for (const [name, theme, scheme, reach] of SHOTS) {
    await open(theme, scheme);
    await reach();
    await shoot(name, theme);
  }
} finally {
  socket.close();
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
