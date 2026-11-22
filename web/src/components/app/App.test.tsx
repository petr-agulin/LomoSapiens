import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../../App";
import css from "../../index.css?raw";
import { isTestPage, showsTestPage } from "../../lib/route.ts";
import { addCamera, EMPTY_STATE, finishRoll, loadRoll, setHold } from "../../lib/store.ts";
import { Home } from "./Home.tsx";
import { isAppScreen } from "./navigation.ts";

// Text as a person reads it: tags removed, the few entities React escapes restored.
const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const noop = () => undefined;

const inOrderText = (text: string, parts: string[]) => {
  let position = 0;
  for (const part of parts) {
    const found = text.indexOf(part, position);
    expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
    position = found + part.length;
  }
};

describe("the address", () => {
  it("opens the real app everywhere but /test", () => {
    expect(isTestPage("/")).toBe(false);
    expect(isTestPage("/test")).toBe(true);
    expect(isTestPage("/test/")).toBe(true);
    expect(isTestPage("/app/test")).toBe(true);
    expect(isTestPage("/testing")).toBe(false);
  });

  it("shows the test page in development only; the published app opens there as anywhere else", () => {
    expect(showsTestPage("/test", true)).toBe(true);
    expect(showsTestPage("/test", false)).toBe(false);
    expect(showsTestPage("/", true)).toBe(false);
    // The tests run as development.
    expect(showsTestPage("/test")).toBe(true);
  });

  it("shows Home at /, not the test page", () => {
    const text = readable(renderToStaticMarkup(<App path="/" />));
    expect(text).toContain("LomoSapiens");
    expect(text).not.toContain("Describe the shot");
    expect(text).not.toContain("Time of day");
  });
});

describe("on a computer: the phone frame", () => {
  const page = renderToStaticMarkup(<App path="/" address="lomosapiens.pages.dev" />);

  it("puts the app in a frame, with the note beside it, after the app", () => {
    expect(page).toContain('<div class="device-stage"><div class="device">');
    inOrderText(readable(page), [
      "LomoSapiens",
      "Made for your phone",
      "Open lomosapiens.pages.dev on your phone and add it to your home screen. It works offline too.",
      "Here you can try it as it looks there.",
    ]);
  });

  it("names the address the page was opened at", () => {
    expect(readable(renderToStaticMarkup(<App path="/" address="localhost:5173" />))).toContain("Open localhost:5173 on your phone");
  });

  it("shows the frame only on a computer with room for it, and the app takes the frame's size, never the window's", () => {
    const query = /@media \(min-width: 1000px\) and \(min-height: 640px\) and \(hover: hover\) and \(pointer: fine\) \{([\s\S]*?)\n\}/.exec(css);
    expect(query, "the frame's media query").not.toBeNull();
    expect(query![1]).toMatch(/\.device \{[^}]*transform: translateZ\(0\)/);
    expect(query![1]).toMatch(/\.device-hint \{[^}]*display: flex/);
    // Everywhere else the note is hidden, and the app is the screen's size.
    expect(css).toMatch(/\.device-hint \{\s*display: none;\s*\}/);
    expect(css).toMatch(/--app-h: 100dvh;\s*--app-w: min\(100vw, 480px\);/);
  });
});

describe("Home on first launch", () => {
  const page = renderToStaticMarkup(<App path="/" />);
  const text = readable(page);

  it("shows the name, the tagline and the two setup steps, in order", () => {
    const order = [
      "LomoSapiens",
      "Set your manual film camera for the best shot",
      "Before your first shot",
      "Your camera",
      "Its lens, apertures and shutter speeds. Once per camera.",
      "Your film",
      "ISO, and colour or black and white. Once per roll.",
      "Set up camera and film",
    ];
    let position = 0;
    for (const part of order) {
      const found = text.indexOf(part, position);
      expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
      position = found + part.length;
    }
  });

  it("draws the picture from the app's own files, with words for screen readers", () => {
    expect(page).toContain('src="./images/hero-march.png"');
    expect(page).toContain('alt="An ape, an early human and a person with a camera, walking in a line"');
  });

  it("has a labelled menu button, and no camera pill before setup", () => {
    expect(page).toContain('aria-label="Menu"');
    expect(text).not.toMatch(/\d+ colour|By hand|Braced|On a surface/);
  });

  it("has no Theory row: Theory is in the menu", () => {
    expect(text).not.toContain("Aperture, shutter speed and focus, in plain words");
  });

  it("names no camera model", () => {
    // The app's own name, in its address too, is not a camera.
    expect(text.replace(/lomosapiens/gi, "")).not.toMatch(/LOMO|135M|Nikkormat|Zenit/i);
  });
});

describe("Home once a camera is set up, before the first shot", () => {
  const answers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" } as const;
  const { state } = addCamera(EMPTY_STATE, { name: "", answers, film: { iso: 400, type: "color_negative" } });
  const home = (s = state) => readable(renderToStaticMarkup(<Home state={s} onStart={noop} />));

  it("drops the setup steps, and its main button starts a new shot", () => {
    const text = home();
    expect(text).not.toContain("Before your first shot");
    expect(text).toContain("Analyse a new shot");
    expect(text).not.toContain("Set up camera and film");
  });

  it("shows the pill: the camera's name, its film and how it's held, as plain words, not buttons", () => {
    const page = renderToStaticMarkup(<Home state={state} onStart={noop} />);
    expect(home()).toMatch(/My camera 400 colour By hand/);
    expect(page.match(/<button/g)).toHaveLength(2); // menu, Analyse a new shot
  });

  it("names a black-and-white roll, an empty camera and the other ways of holding it", () => {
    const bw = loadRoll(setHold(state, "surface"), state.inUse!, { iso: 100, type: "bw_negative" });
    expect(home(bw)).toMatch(/My camera 100 B&W On a surface/);
    expect(home(setHold(finishRoll(state, state.inUse!), "braced"))).toMatch(/My camera No film Braced/);
  });
});

describe("history states", () => {
  it("accepts only screens the app knows, so an old or odd history entry opens Home instead", () => {
    expect(isAppScreen({ name: "home" })).toBe(true);
    expect(isAppScreen({ name: "setup", step: "camera" })).toBe(true);
    expect(isAppScreen({ name: "setup", step: "camera", adding: true })).toBe(true);
    expect(isAppScreen({ name: "setup", step: "lens" })).toBe(false);
    expect(isAppScreen({ name: "setup", step: "film", adding: "yes" })).toBe(false);
    for (const name of ["roll", "light", "subject", "result", "cameras", "settings"]) expect(isAppScreen({ name })).toBe(true);
    expect(isAppScreen({ name: "camera", id: "c1" })).toBe(true);
    expect(isAppScreen({ name: "film", id: "c1" })).toBe(true);
    expect(isAppScreen({ name: "camera" })).toBe(false);
    expect(isAppScreen({ name: "film", id: 3 })).toBe(false);
    expect(isAppScreen({ name: "theory" })).toBe(true);
    expect(isAppScreen({ name: "article", id: "sunny-16" })).toBe(true);
    expect(isAppScreen({ name: "article", id: "aperture", from: "step" })).toBe(true);
    expect(isAppScreen({ name: "article" })).toBe(false);
    expect(isAppScreen({ name: "article", id: "step", from: 2 })).toBe(false);
    // Rolls.
    expect(isAppScreen({ name: "rolls" })).toBe(true);
    expect(isAppScreen({ name: "rollPage", id: "r1" })).toBe(true);
    expect(isAppScreen({ name: "rollPage", id: "r1", via: "camera" })).toBe(true);
    expect(isAppScreen({ name: "rollPage", id: "r1", via: "menu" })).toBe(false);
    expect(isAppScreen({ name: "rollDetails", id: "r1" })).toBe(true);
    expect(isAppScreen({ name: "rollDetails" })).toBe(false);
    expect(isAppScreen({ name: "record" })).toBe(true);
    expect(isAppScreen({ name: "frame", id: "f1" })).toBe(true);
    expect(isAppScreen({ name: "frameEdit", id: "f1" })).toBe(true);
    expect(isAppScreen({ name: "frame" })).toBe(false);
    // The stand-ins of steps 3 to 7 are gone.
    expect(isAppScreen({ name: "later", what: "theory" })).toBe(false);
    expect(isAppScreen(null)).toBe(false);
    expect(isAppScreen("home")).toBe(false);
  });
});
