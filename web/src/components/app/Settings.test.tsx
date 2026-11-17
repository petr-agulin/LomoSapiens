import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { newDraft } from "../../lib/setup.ts";
import { addCamera, EMPTY_STATE, setHold, type AppState } from "../../lib/store.ts";
import { CameraPage, CamerasHome, SettingsHome } from "./Settings.tsx";
import { Setup } from "./Setup.tsx";

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
const { state: one } = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-03");
const { state: two } = addCamera(one, { name: "Spare", answers: { ...compact, focalLengthMm: "50", slowestShutter: "1" }, film: null }, "2026-11-03");
const [mine, spare] = two.cameras;

const cameras = (state: AppState = two) => renderToStaticMarkup(<CamerasHome state={state} onBack={noop} onCamera={noop} onAdd={noop} />);
const home = (state: AppState = two, holdOpen = false) => renderToStaticMarkup(<SettingsHome state={state} onBack={noop} onHold={noop} holdOpen={holdOpen} />);
const page = (camera = mine, state: AppState = two, openAt?: "delete" | "finish") =>
  renderToStaticMarkup(
    <CameraPage state={state} camera={camera} onBack={noop} onRename={noop} onAnswer={noop} onRoll={noop} onLoadNew={noop} onDelete={noop} onUse={noop} openAt={openAt} />,
  );

describe("Cameras", () => {
  it("lists every camera, the one in use inverted, then adding one", () => {
    inOrder(readable(cameras()), [
      "Back",
      "Cameras",
      "Tap a camera to change it, or to use it for new shots.",
      "In use for new shots", "Mine", "40 mm · f/2.8 · 1/15 to 1/250", "ISO 400 colour · 0 of 36",
      "Spare", "50 mm · f/2.8 · 1 s to 1/250", "No film loaded",
      "Add a camera", "Its lens and shutter, then its film",
    ]);
    expect(readable(cameras()).match(/In use for new shots/g)).toHaveLength(1);
    expect(cameras()).toMatch(/bg-hero text-hero-ink[^>]*>.{0,1500}?Mine/);
  });

  it("keeps the dial's range on one line", () => {
    expect(cameras()).toContain('<span class="whitespace-nowrap">1/15 to 1/250</span>');
  });

  it("still offers adding a camera when there is none", () => {
    expect(readable(cameras(EMPTY_STATE))).toContain("Tap a camera to change it, or to use it for new shots. Add a camera");
  });
});

describe("Settings", () => {
  it("holds only the app's own settings: how the camera is held, and the theme", () => {
    const text = readable(home());
    inOrder(text, [
      "Back",
      "Settings",
      "Changes save as you make them.",
      "Shooting", "How you hold the camera", "By hand",
      "Theme", "Phone's theme", "Light or dark, as the phone is set",
    ]);
    expect(text).not.toMatch(/Mine|Add a camera|Theory/);
    // The independence note is in About the app now.
    expect(text).not.toContain("independent project");
  });

  it("follows the phone's theme by default, and offers Light, Dark and Archive paper once the switch is off", () => {
    const theme = (picked: "phone" | "light" | "dark" | "archive") => renderToStaticMarkup(<SettingsHome state={two} onBack={noop} onHold={noop} theme={picked} onTheme={noop} />);
    expect(theme("phone")).toMatch(/role="switch" aria-checked="true"[^>]*>.{0,400}?Phone&#x27;s theme/);
    expect(theme("phone")).not.toContain('role="radiogroup"');
    expect(readable(theme("phone"))).not.toContain("Archive paper");
    const light = theme("light");
    expect(light).toMatch(/role="switch" aria-checked="false"/);
    // Names and icons only, no line under them.
    expect(readable(light)).toMatch(/Phone's theme Light or dark, as the phone is set Light Dark Archive paper $/);
    expect(light.match(/role="radio"/g)).toHaveLength(3);
    const picked = (html: string) => [...html.matchAll(/role="radio" aria-checked="true"[^>]*>.*?font-medium[^"]*">([^<]+)</g)].map((found) => found[1]);
    expect(picked(light)).toEqual(["Light"]);
    expect(picked(theme("dark"))).toEqual(["Dark"]);
    expect(picked(theme("archive"))).toEqual(["Archive paper"]);
  });

  it("shows the hold in the agreed words, and offers all three in a sheet", () => {
    expect(readable(home(setHold(two, "surface")))).toContain("How you hold the camera On a surface");
    inOrder(readable(home(two, true)), [
      "How do you usually hold it?",
      "This sets how slow a shutter speed stays sharp. Change it when you set up differently.",
      "By hand", "Standing, camera in both hands",
      "Braced", "Leaning on a wall or post, elbows resting",
      "On a surface", "Table, wall top, bag or tripod",
    ]);
    expect(home(two, true)).toMatch(/role="radio" aria-checked="true"[^>]*>.{0,1200}?By hand/);
  });

});

describe("a camera's page", () => {
  it("shows the camera in use: its name to edit, its answers without hints, and its roll", () => {
    const html = page();
    expect(html).toContain('aria-label="Back to Cameras"');
    inOrder(readable(html), [
      "Cameras",
      "Mine", "In use for new shots",
      "Name",
      "Lens", "Widest aperture", "f/", "2.8", "Smallest aperture", "22", "Focal length", "40", "mm",
      "Shutter speed dial", "Fastest", "1/", "250", "Slowest, before B", "15", "B for long exposures", "Yes",
      "Roll in this camera", "ISO 400 colour", "0 of 36 recorded · loaded 3 Nov",
      "Load a new roll",
      "Delete this camera",
      "Changes save as you make them. After swapping lenses, change Lens here.",
    ]);
    expect(html).toContain('value="Mine"');
    expect(readable(html)).not.toContain("On the lens: 1:2.8 means f/2.8");
    expect(readable(html)).not.toContain("Use for new shots");
  });

  it("offers a camera not in use to switch to, and an empty one a roll", () => {
    const text = readable(page(spare));
    inOrder(text, ["Spare", "Not in use. Switch to it below.", "Roll in this camera", "No film loaded", "New shots with this camera ask for a roll first.", "Load a roll", "Use for new shots"]);
    expect(text).not.toContain("Load a new roll");
  });

  it("asks before loading a new roll over the one in the camera", () => {
    inOrder(readable(page(mine, two, "finish")), [
      "Finish the roll in Mine?",
      "ISO 400 colour, 0 of 36 recorded. It moves to your finished rolls.",
      "Finish and load a new one",
      "Keep it",
    ]);
  });

  it("asks before deleting, and says which camera takes over", () => {
    inOrder(readable(page(mine, two, "delete")), [
      "Delete Mine?",
      "Its lens and shutter speeds go with it. Its rolls and frames stay in Rolls. This can't be undone. Spare will be used for new shots.",
      "Delete camera",
      "Keep it",
    ]);
    expect(page(mine, two, "delete")).toContain('role="alertdialog"');
    expect(readable(page(spare, two, "delete"))).toContain("This can't be undone. Delete camera");
  });

  it("warns that deleting the only camera starts the app again", () => {
    expect(readable(page(mine, one, "delete"))).toContain("This can't be undone. It's your only camera, so the app starts again with setting one up.");
  });
});

describe("adding a camera", () => {
  const setup = (step: "camera" | "film", adding: boolean) =>
    readable(renderToStaticMarkup(<Setup step={step} adding={adding} draft={newDraft()} onChange={noop} onBack={noop} onNext={noop} />));

  it("runs first setup's two steps in its own words, ending with Add camera", () => {
    inOrder(setup("camera", true), ["Step 1 of 2 · Camera", "Add a camera", "Name", "Widest aperture", "On the lens: 1:2.8 means f/2.8", "Next: its film"]);
    inOrder(setup("film", true), ["Step 2 of 2 · Film", "Its film", "Which roll is in the new camera?", "This film stays with the new camera", "Add camera"]);
  });

  it("leaves first setup's words as they were", () => {
    inOrder(setup("camera", false), ["Your camera", "Next: your film"]);
    inOrder(setup("film", false), ["Your film", "Which roll is in your camera?", "Done"]);
  });

  it("can end without film, above the main button, on the film step only", () => {
    const withChoice = (step: "camera" | "film", adding: boolean) =>
      readable(renderToStaticMarkup(<Setup step={step} adding={adding} draft={newDraft()} onChange={noop} onBack={noop} onNext={noop} onWithoutFilm={noop} />));
    inOrder(withChoice("film", true), ["Its film", "Add without film", "Add camera"]);
    inOrder(withChoice("film", false), ["Your film", "Finish without film", "Done"]);
    expect(withChoice("camera", true)).not.toContain("without film");
    expect(setup("film", true)).not.toContain("without film");
  });
});
