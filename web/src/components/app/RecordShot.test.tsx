// The record form and the result's Record this shot.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { recommend } from "../../lib/engine/index.ts";
import { recordDraftFrom, type RecordDraft } from "../../lib/record.ts";
import { toConditions } from "../../lib/shot.ts";
import type { SavedCamera, ShotAnswers, ShotSummary } from "../../lib/store.ts";
import { RecordShot, type RecordOpen } from "./RecordShot.tsx";
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
const camera: SavedCamera = { id: "c1", name: "Mine", answers: compact, film: { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-03" } };
const advice: ShotSummary = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } };
const form = (more: Partial<RecordDraft> = {}, { taken = [] as number[], openAt = null as RecordOpen } = {}) =>
  renderToStaticMarkup(
    <RecordShot camera={camera} advice={advice} taken={taken} draft={{ ...recordDraftFrom(advice, 12), ...more }} onChange={noop} onBack={noop} onSave={noop} openAt={openAt} />,
  );

describe("the record form", () => {
  it("starts from the advice: the next frame, each setting as advised, the light as advised, an empty note", () => {
    const html = form();
    inOrder(readable(html), [
      "For this shot",
      "Record this shot",
      "Change anything you set differently from the advice.",
      "Frame", "As on the camera's counter",
      "Aperture", "Advised", "f/", "8",
      "Shutter speed", "Advised", "1/", "125",
      "Focus distance", "Advised", "3", "m",
      "As advised",
      "Shot note (optional)",
      "Save frame 12",
    ]);
    expect(html).toContain('placeholder="Such as Anna by the window"');
  });

  it("takes the frame number typed, with a step back and on beside it", () => {
    const html = form();
    expect(html).toMatch(/id="frame-number"[^>]*inputMode="numeric"|inputMode="numeric"[^>]*id="frame-number"|id="frame-number"[^>]*value="12"/);
    expect(html).toContain('value="12"');
    expect(html).toContain('aria-label="One frame back"');
    expect(html).toContain('aria-label="One frame on"');
    expect(form({ number: "27" })).toContain("Save frame 27");
  });

  it("names the advice beside a changed setting, and says how far the light is from it", () => {
    const text = readable(form({ aperture: "5.6", focusM: null }));
    inOrder(text, ["Aperture", "Advised f/8", "5.6", "Shutter speed", "Advised", "Focus distance", "Advised 3 m", "∞", "1 step more light than advised"]);
  });

  it("explains a frame number that can't be, and keeps Save faded", () => {
    const html = form({ number: "0" });
    expect(readable(html)).toContain("Type a frame number from 1 to 99.");
    expect(html).toMatch(/aria-disabled="true"[^>]*>Save frame</);
  });

  it("says when the frame number is already recorded on the roll, and keeps both", () => {
    expect(readable(form({}, { taken: [11, 12] }))).toContain("Frame 12 is already recorded. Both are kept.");
    expect(readable(form({}, { taken: [11] }))).not.toContain("already recorded");
  });

  it("offers the camera's own apertures, widest first, the advised one marked", () => {
    const html = form({}, { openAt: "aperture" });
    inOrder(readable(html), ["Aperture", "The aperture you set on the lens.", "f/ 2.8", "f/ 4", "f/ 5.6", "f/ 8 Advised", "f/ 11", "f/ 16", "f/ 22"]);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>.{0,300}?>8</);
  });

  it("offers the camera's speeds, slowest first, then B with the seconds held", () => {
    inOrder(readable(form({}, { openAt: "shutter" })), ["Shutter speed", "The speed you set on the dial.", "1/ 15", "1/ 30", "1/ 60", "1/ 125 Advised", "1/ 250", "B"]);
    expect(readable(form({}, { openAt: "shutter" }))).not.toMatch(/B 1 s|Seconds you held/);
    const bulb = form({ shutter: "B", bulbSeconds: 4 }, { openAt: "shutter" });
    inOrder(readable(bulb), ["B", "Seconds you held it open", "Done"]);
    expect(bulb).toContain('value="4"');
    expect(readable(form({ shutter: "B", bulbSeconds: 4 }))).toContain("Shutter speed Advised 1/125 B 4 s");
  });

  it("offers ∞ or a distance typed for the focus", () => {
    const html = form({}, { openAt: "focus" });
    inOrder(readable(html), ["Focus distance", "The distance you set on the lens.", "∞", "Another distance, in metres", "Done"]);
    expect(html).toContain('value="3"');
  });

  it("asks before Back loses a note", () => {
    inOrder(readable(form({ note: "Anna" }, { openAt: "discard" })), ["Discard this frame?", "What you added isn't saved.", "Discard", "Keep editing"]);
  });
});

describe("the result's Record this shot", () => {
  const answers: ShotAnswers = { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "portrait", distanceM: null, goal: "blur", sunBehind: false };
  const conditions = toConditions(answers, camera, "hand")!;
  const result = (more: { onRecord?: () => void; recordedFrame?: number | null } = {}) =>
    readable(renderToStaticMarkup(<Result camera={camera} hold="hand" answers={answers} conditions={conditions} result={recommend(conditions)} onMenu={noop} onNewShot={noop} {...more} />));

  it("sits above Analyse a new shot", () => {
    inOrder(result({ onRecord: noop }), ["How the app got there", "Record this shot", "Analyse a new shot"]);
  });

  it("says which frame was recorded, and offers another attempt", () => {
    const text = result({ onRecord: noop, recordedFrame: 12 });
    inOrder(text, ["Frame 12 recorded", "Record another attempt", "Analyse a new shot"]);
    expect(text).not.toContain("Record this shot");
  });

  it("isn't offered without a roll to record on, or without settings", () => {
    expect(result()).not.toContain("Record this shot");
    const refused = readable(
      renderToStaticMarkup(<Result camera={camera} hold="hand" answers={answers} conditions={conditions} result={{ refused: "unsupported_lens" }} onMenu={noop} onNewShot={noop} onRecord={noop} />),
    );
    expect(refused).not.toContain("Record this shot");
  });
});
