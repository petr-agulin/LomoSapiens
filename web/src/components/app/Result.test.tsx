import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { recommend } from "../../lib/engine/index.ts";
import type { EngineResult, Support } from "../../lib/engine/types.ts";
import { toConditions } from "../../lib/shot.ts";
import { addCamera, EMPTY_STATE, finishRoll, recordFrame, setLastShot, type FrameDraft, type LightChoice, type SavedCamera, type ShotAnswers } from "../../lib/store.ts";
import { Home } from "./Home.tsx";
import { Result } from "./Result.tsx";

const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const inOrder = (text: string, parts: string[]) => {
  let position = 0;
  for (const part of parts) {
    const found = text.indexOf(part, position);
    expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
    position = found + part.length;
  }
};

const noop = () => undefined;
const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const fifty: CameraAnswers = { widestAperture: "1.4", smallestAperture: "22", focalLengthMm: "50", fastestShutter: "1/1000", slowestShutter: "1", hasBulb: "yes" };
const camera = (iso = 400, answers: CameraAnswers = compact): SavedCamera => ({ id: "c1", name: "Mine", answers, film: { id: "r1", iso, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-14" } });
const shot = (light: LightChoice, more: Partial<ShotAnswers> = {}): ShotAnswers => ({
  light,
  lowSun: false,
  stormOutside: false,
  sunBehind: false,
  subject: "portrait",
  distanceM: null,
  goal: "blur",
  ...more,
});

function page(
  answers: ShotAnswers,
  { hold = "hand" as Support, saved = camera(), openAt = null as "estimate" | "menu" | null, result = undefined as EngineResult | undefined, rollLine = null as string | null } = {},
) {
  const conditions = toConditions(answers, saved, hold)!;
  return renderToStaticMarkup(
    <Result
      camera={saved}
      hold={hold}
      answers={answers}
      conditions={conditions}
      result={result ?? recommend(conditions)}
      onMenu={noop}
      onNewShot={noop}
      rollLine={rollLine}
      openAt={openAt}
    />,
  );
}

// The worked example (ENGINE_SPEC section 12): portrait, sun behind clouds, open terrain, low sun, ISO 400, by hand.
const ownerShot = shot({ group: "day", sky: "sun_behind_clouds", place: "open" }, { lowSun: true });

describe("the result", () => {
  it("shows the worked example top to bottom: the pill, the settings, focus, advice, the shot and the reasoning", () => {
    inOrder(readable(page(ownerShot)), [
      "Mine", "400 colour", "By hand",
      "For this shot", "Values are estimated",
      "Aperture", "f/", "4", "Shutter speed",
      "Focus distance", "1", "m", "Sharp zone", "0.93 – 1.08 m",
      "Measure the distance carefully.",
      "Your shot", "Sun behind clouds", "Open terrain", "Low sun", "Portrait", "Blurred background",
      "How the app got there",
      "Kodak's table for this sky and scene: f/16, 1/60",
      "Low sun (estimate), 1 extra step: f/11, 1/60",
      "Same light, adjusted for your goal: f/5.6, 1/250",
      "Blurred background, 1 extra step: f/4, 1/250",
      "Analyse a new shot",
    ]);
  });

  it("says the shutter speed in words, and why the values are estimated, for screen readers", () => {
    const html = page(ownerShot);
    expect(html).toContain('aria-label="1/250 of a second"');
    expect(html).toContain('aria-label="Values are estimated: low sun · usual distance. Show why"');
  });

  it("leaves out the estimate warning and the holding advice it doesn't need at 1/250", () => {
    const text = readable(page(ownerShot));
    expect(text).not.toContain("This value is an estimate.");
    expect(page(ownerShot)).not.toContain('aria-label="Holding the camera"');
    expect(page(ownerShot)).toContain('aria-label="Warning"');
  });

  it("explains the estimate in a sheet: the reasons, one group per setting, and Got it", () => {
    inOrder(readable(page(ownerShot, { openAt: "estimate" })), [
      "Why it's an estimate",
      "low sun · usual distance",
      "Aperture and shutter speed",
      "The extra step for low sun is the app's own rule, not a published value.",
      "Focus distance",
      "1 m is the usual distance for a portrait with your 40 mm lens, not measured. Set your own distance to remove this.",
      "Got it",
    ]);
  });

  it("shows a landscape in sun with no estimate, no advice, and the focus at 5 m or the next mark", () => {
    const html = page(shot({ group: "day", sky: "sun", place: "open" }, { subject: "landscape", goal: "sharp" }));
    const text = readable(html);
    inOrder(text, ["f/", "16", "Focus distance", "5", "m", "or the next mark beyond it", "Sharp zone", "2.01 m – ∞", "Sun", "Open terrain", "Landscape", "Everything sharp"]);
    expect(text).not.toContain("Values are estimated");
    expect(html).not.toContain('aria-label="Warning"');
    expect(html).not.toContain('aria-label="Holding the camera"');
  });

  it("shows B with its seconds, on a surface, with the advice and the warnings", () => {
    const html = page(shot({ group: "evening", lowlight: "floodlit" }), { hold: "surface", saved: camera(100) });
    const text = readable(html);
    expect(html).toContain('aria-label="B, held for 1 second"');
    inOrder(text, ["f/", "2.8", "B", "1 s", "Focus distance", "1", "m", "0.95 – 1.05 m"]);
    inOrder(text, ["Camera on a surface. Use a cable release if you have one.", "Measure the distance carefully.", "Not recommended for people.", "Hold the button for 1 second."]);
    expect(text).toContain("On a surface");
  });

  it("shows 1 s as a big 1 with a small s", () => {
    const html = page(shot({ group: "evening", lowlight: "floodlit" }, { goal: "sharp" }), { hold: "surface", saved: camera(100, fifty) });
    expect(html).toContain('aria-label="1 second"');
    inOrder(readable(html), ["f/", "2.8", "1", "s", "Focus distance", "1.3", "m", "1.25 – 1.36 m", "Camera on a surface, hold the button about 1 s after the click (estimate)."]);
  });

  it("keeps the settings in Not enough light together, and names the support in the agreed words", () => {
    const html = page(shot({ group: "evening", lowlight: "street_night" }, { subject: "group", goal: "sharp" }), { saved: camera(200) });
    expect(html).toContain('Not enough light: 1 step short. Braced: <span class="whitespace-nowrap">f/2.8, 1/30.</span>');
  });

  it("tags every switch that was on, and none its light hid", () => {
    const text = readable(page(shot({ group: "indoors", indoor: "window" }, { lowSun: true, stormOutside: true, subject: "group", goal: "sharp" })));
    inOrder(text, ["Your shot", "By a window", "Low sun", "Storm clouds outside", "Group", "Everything sharp"]);
    const hidden = readable(page(shot({ group: "indoors", indoor: "lamps" }, { lowSun: true, stormOutside: true, subject: "group", goal: "sharp" })));
    expect(hidden).not.toContain("Low sun");
    expect(hidden).not.toContain("Storm clouds outside");
  });

  it("says plainly when the engine gives no settings", () => {
    const text = readable(page(ownerShot, { result: { refused: "unsupported_lens" } }));
    expect(text).toContain("No settings for this shot");
    expect(text).toContain("This version covers lenses from 28 to 58 mm.");
    expect(text).not.toContain("How the app got there");
  });

  it("opens the menu: the app's places, the camera in use under Cameras, and a round × where the menu button was", () => {
    const html = page(ownerShot, { openAt: "menu", rollLine: "In use: 3 of 36 recorded" });
    inOrder(readable(html), ["Menu", "Home", "Cameras", "In use: Mine", "Rolls", "In use: 3 of 36 recorded", "Theory", "Settings", "About the app"]);
    // One way to close it for keyboards and screen readers: the ×, over the menu button. The dimmed screen is for fingers only.
    expect(html.match(/aria-label="Close menu"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-label="Close menu"[^>]*class="absolute top-4 right-4 [^"]*size-12 [^"]*rounded-full/);
    expect(html).toMatch(/aria-hidden="true" tabindex="-1"[^>]*bg-\[var\(--scrim\)\]/);
    expect(readable(html)).not.toMatch(/\bClose\b/);
    // The result is not one of the menu's places, so none is marked: every row has its arrow.
    expect(html).not.toContain('aria-current="page"');
    expect(html.slice(html.indexOf("<nav")).match(/d="M9 6l6 6-6 6"/g)).toHaveLength(6);
  });
});

describe("Home's last recorded frame", () => {
  const { state } = addCamera(EMPTY_STATE, { name: "", answers: compact, film: { iso: 400, type: "color_negative" } });
  const withShot = setLastShot(state, { answers: ownerShot, result: { aperture: "4", shutter: "1/250", bulbSeconds: null, focus: { meters: 1, source: "default" } } });
  const frame = (rollId: string, number: number, note = ""): FrameDraft => ({
    rollId,
    number,
    set: { aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: 3 },
    advice: { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } },
    answers: shot({ group: "day", sky: "sun", place: "open" }, { subject: "group", distanceM: 3, goal: "sharp" }),
    hold: "hand",
    note,
    photo: null,
  });
  const recorded = recordFrame(recordFrame(withShot, frame("r1", 11), "2026-11-14T10:00").state, frame("r1", 12, "Anna by the window, second try"), "2026-11-14T10:05").state;
  const home = (s = recorded, menuOpen = false) => renderToStaticMarkup(<Home state={s} onStart={noop} onMenu={noop} menuOpen={menuOpen} />);

  it("shows the frame furthest along the roll on film, its tags, then its note, and Analyse a new shot", () => {
    inOrder(readable(home()), [
      "LomoSapiens",
      "Last recorded frame",
      "Frame 12 of 36", "f/", "5.6", "1/", "125", "3", "m", "ISO 400 colour",
      "Sun", "Open terrain", "Group", "Everything sharp",
      "Anna by the window, second try",
      "Analyse a new shot",
    ]);
    expect(home()).toContain('aria-label="f/5.6, 1/125, 3 m"');
    expect(home()).toMatch(/class="m-0 line-clamp-2[^"]*">Anna by the window/);
  });

  it("opens the frame from anywhere on the card, said with the frame and its settings", () => {
    expect(home()).toContain('aria-label="Last recorded frame: Frame 12 of 36, f/5.6, 1/125, 3 m"');
    expect(home().match(/<button/g)).toHaveLength(3); // menu, the card, Analyse a new shot
  });

  it("no longer shows the last shot analysed, which only starts the next one", () => {
    expect(home()).not.toContain('aria-label="f/4, 1/250, 1 m"');
    expect(readable(home())).not.toContain("Last shot");
  });

  it("follows the roll last recorded on, naming its camera when it isn't the one in use", () => {
    const { state: two } = addCamera(recorded, { name: "Spare", answers: compact, film: { iso: 200, type: "bw_negative", frames: 24 } });
    const later = recordFrame(two, frame("r2", 4), "2026-11-14T11:00").state;
    inOrder(readable(home(later)), ["Last recorded frame · Spare", "Frame 4 of 24", "ISO 200 black and white"]);
  });

  it("before any frame, names the roll in the camera in use, and where its frames will appear", () => {
    const text = readable(home(withShot));
    inOrder(text, ["Last recorded frame", "ISO 400 colour · 0 of 36", "Frames you record appear here.", "Analyse a new shot"]);
    expect(home(withShot).match(/<button/g)).toHaveLength(2); // menu, Analyse a new shot
  });

  it("shows no card when the camera in use has no film", () => {
    const empty = finishRoll(withShot, withShot.cameras[0].id, "2026-11-15");
    expect(readable(home(empty))).not.toContain("Last recorded frame");
  });

  it("opens the same menu, with Home marked as the place you're on by its dark row alone", () => {
    const html = home(withShot, true);
    inOrder(readable(html), ["Menu", "Home", "Cameras", "In use: My camera", "Rolls", "In use: 0 of 36 recorded", "Theory", "Settings", "About the app"]);
    expect(html).toMatch(/aria-current="page" class="[^"]*bg-hero text-hero-ink[^"]*">.{0,900}?Home/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(readable(html)).not.toContain("You're here");
    // Home goes nowhere from Home, so only the other five rows have an arrow.
    const homeRow = html.slice(html.indexOf('aria-current="page"'), html.indexOf("</button>", html.indexOf('aria-current="page"')));
    expect(homeRow).not.toContain('d="M9 6l6 6-6 6"');
    expect(html.slice(html.indexOf("<nav")).match(/d="M9 6l6 6-6 6"/g)).toHaveLength(5);
  });
});
