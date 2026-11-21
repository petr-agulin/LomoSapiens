import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { newShotDraft, pickLight, pickSubject, setDistance, type ShotDraft } from "../../lib/shot.ts";
import type { LightChoice, SavedCamera } from "../../lib/store.ts";
import { LightStep } from "./LightStep.tsx";
import { SubjectStep } from "./SubjectStep.tsx";

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
const camera: SavedCamera = { id: "c1", name: "Mine", answers: compact, film: { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-14" } };
const empty = newShotDraft(null);
const withLight = (light: LightChoice, draft: ShotDraft = empty) => pickLight(draft, light);

const light = (draft: ShotDraft, openAt?: Parameters<typeof LightStep>[0]["openAt"]) =>
  renderToStaticMarkup(<LightStep draft={draft} onPick={noop} onToggle={noop} onBack={noop} onNext={noop} openAt={openAt} />);
const subject = (draft: ShotDraft, openAt?: Parameters<typeof SubjectStep>[0]["openAt"]) =>
  renderToStaticMarkup(<SubjectStep draft={draft} camera={camera} onChange={noop} onBack={noop} onNext={noop} openAt={openAt} />);

describe("step 1: what's the light?", () => {
  it("starts with three groups, no switches, and Next faded", () => {
    const page = light(empty);
    inOrder(readable(page), [
      "New shot · Step 1 · Light",
      "What's the light?",
      "Pick where you are, then the closest match.",
      "Outside, by day",
      "Daylight in any weather: sun, haze, clouds or overcast",
      "Outside, twilight and night",
      "Around sunrise or sunset, or lit places in the dark",
      "Indoors",
      "Window light, lamps or ceiling lights, day or night",
      "Next",
    ]);
    expect(readable(page)).not.toContain("If it applies");
    expect(page).toMatch(/aria-disabled="true"[^>]*>Next/);
    expect(page).toContain('aria-label="Back to home"');
  });

  it("shows a day answer as the sky with the place under it, picked, with Low sun", () => {
    const page = light(withLight({ group: "day", sky: "sun_behind_clouds", place: "open" }));
    inOrder(readable(page), ["Outside, by day", "Sun behind clouds", "Open terrain", "If it applies", "Low sun", "Winter far north, or long shadows", "Next"]);
    expect(page).toContain('aria-label="Picked"');
    expect(readable(page)).not.toContain("Storm clouds outside");
    expect(page).not.toContain('aria-disabled="true"');
  });

  it("offers both switches by a window, and none for lamps, offices, evening and night", () => {
    inOrder(readable(light(withLight({ group: "indoors", indoor: "window" }))), ["By a window", "Daylight through the glass, close to the window", "Low sun", "Storm clouds outside", "Dark storm sky beyond the window"]);
    for (const choice of [{ group: "indoors", indoor: "lamps" }, { group: "indoors", indoor: "office" }, { group: "evening", lowlight: "dusk" }] as LightChoice[]) {
      expect(readable(light(withLight(choice)))).not.toContain("If it applies");
    }
  });

  it("says a switch is on from the last shot, until it's touched", () => {
    const fromLast: ShotDraft = { ...withLight({ group: "day", sky: "sun", place: "open" }), lowSun: true, fromLast: { lowSun: true, stormOutside: false, sunBehind: false } };
    expect(readable(light(fromLast))).toContain("Low sun On from your last shot");
    const touched = { ...fromLast, fromLast: { ...fromLast.fromLast, lowSun: false } };
    expect(readable(light(touched))).toContain("Low sun Winter far north, or long shadows");
    expect(light(fromLast)).toMatch(/role="switch" aria-checked="true"/);
  });

  it("opens the day sheet on its skies, then where you are, with the darker-one tip on both", () => {
    inOrder(readable(light(empty, { group: "day" })), [
      "Outside, by day",
      "Then: where are you?",
      "Sun", "Distinct shadows",
      "Sun in haze", "Soft shadows",
      "Sun behind clouds", "No shadows",
      "Overcast", "Heavy cloud, sky evenly grey",
      "Storm clouds", "Darker than heavy cloud",
      "Torn between two? Pick the darker one.",
    ]);
    const where = light(empty, { group: "day", sky: "sun" });
    inOrder(readable(where), [
      "Sun",
      "Where are you?",
      "Snow and sand make the light brighter, trees and shade make it darker.",
      "Snow or sand", "Snowy fields, ski slopes, beaches, dunes",
      "Open terrain", "Streets, squares, parks, fields, gardens",
      "Under trees or in the shade", "Forest, building's shadow, porch, pram hood",
      "Torn between two? Pick the darker one.",
    ]);
    expect(where).toContain('aria-label="Back to the sky: Sun"');
  });

  it("lists the twilight and indoor lights in their sheets", () => {
    inOrder(readable(light(empty, { group: "evening" })), ["Sun on the horizon", "Sun just below the horizon", "Dawn or dusk", "Street in the dark", "Floodlit building"]);
    inOrder(readable(light(empty, { group: "indoors" })), ["By a window", "Away from a window", "Lamps only", "Home lamps, no daylight, day or night", "Office or shop"]);
  });

  it("offers morning twilight beside the evening's, in the same choices", () => {
    inOrder(readable(light(empty, { group: "evening" })), [
      "Sun on the horizon", "Just risen or about to set, long shadows",
      "Sun just below the horizon", "Before sunrise or after sunset, sky bright",
      "Dawn or dusk", "Sky dark: first light, or light fading",
    ]);
  });

  it("explains a switch behind its i, without repeating the switch", () => {
    const page = light(withLight({ group: "day", sky: "sun", place: "open" }), { help: "lowSun" });
    expect(readable(page)).toContain("Turn this on when the sun is low in the sky");
    expect(page).toContain('aria-label="What counts as low sun?"');
    expect(page.match(/role="switch"/g)).toHaveLength(1);
  });
});

describe("step 2: what are you shooting?", () => {
  const sunny = withLight({ group: "day", sky: "sun", place: "open" });

  it("lists the five subjects with the usual distances for the lens, and fades Show settings", () => {
    const page = subject(sunny);
    inOrder(readable(page), [
      "New shot · Step 2 · Subject",
      "What are you shooting?",
      "Distances follow your 40 mm lens.",
      "Portrait", "One person, head and shoulders · About 1 m",
      "Two people", "Head and shoulders · About 1.4 m",
      "Group", "Three or more, standing · About 4 m",
      "Landscape", "Views, distant buildings · Focus keeps ∞ sharp",
      "Something else", "You type the distance",
      "Show settings",
    ]);
    expect(page).toMatch(/aria-disabled="true"[^>]*>Show settings/);
  });

  it("folds a picked portrait into one card, with its distance, the goals and Sun behind the person", () => {
    const page = subject(pickSubject(sunny, "portrait"));
    inOrder(readable(page), [
      "You're shooting", "Portrait", "One person, head and shoulders",
      "Focus distance", "About 1 m", "Change",
      "What matters most in this photo?",
      "Blurred background", "Sharp person, soft background", "Usual for a portrait",
      "Everything sharp", "Near and far both in focus",
      "Moving subject", "Freezes movement: walking people, children, pets",
      "If it applies", "Sun behind the person", "You face the sun, the people have it at their backs",
      "Show settings",
    ]);
    expect(page).toMatch(/role="radio" aria-checked="true"[^>]*>.{0,1200}?Blurred background/);
    expect(page).not.toContain('aria-disabled="true"');
  });

  it("marks the usual goal for other subjects, and hides Sun behind the person without the sun in view", () => {
    const text = readable(subject(pickSubject(withLight({ group: "day", sky: "overcast", place: "open" }), "group")));
    expect(text).toContain("Everything sharp Near and far both in focus Usual for this subject");
    expect(text).not.toContain("Sun behind the person");
  });

  it("shows a typed distance as set by you, and a landscape as far, ∞ sharp", () => {
    expect(readable(subject(setDistance(pickSubject(sunny, "portrait"), 2.5)))).toContain("Focus distance 2.5 m Set by you Change");
    expect(readable(subject(pickSubject(sunny, "landscape")))).toContain("Focus distance Far, ∞ sharp Change");
  });

  it("changes the subject in a sheet that says the goal goes back to its usual one", () => {
    expect(readable(subject(pickSubject(sunny, "group"), "subjects"))).toContain("Picking another subject resets the goal to its usual one.");
  });

  it("asks Something else for its distance first, with Done faded until there is one", () => {
    const page = subject(pickSubject(sunny, "group"), "other");
    inOrder(readable(page), ["Something else", "Distance, in metres", "Measure it or pace it out: the focus is set to this distance.", "m", "Done"]);
    expect(page).toContain('inputMode="decimal"');
    expect(page).toMatch(/aria-disabled="true"[^>]*>Done/);
  });

  it("offers the usual distance back once one is typed", () => {
    expect(readable(subject(setDistance(pickSubject(sunny, "portrait"), 2.5), "distance"))).toContain("Use the usual: about 1 m");
  });
});
