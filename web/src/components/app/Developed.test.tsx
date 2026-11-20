// After developing: the labels and a note on a frame's
// page, and both in the roll's list.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { addCamera, editFrame, EMPTY_STATE, recordFrame, type AppState, type FrameDraft } from "../../lib/store.ts";
import { FramePage, FrameRow } from "./Frames.tsx";

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
const frame: FrameDraft = {
  rollId: "r1",
  number: 7,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice: { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } },
  answers: { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "group", distanceM: 3, goal: "sharp", sunBehind: false },
  hold: "hand",
  note: "",
  photo: null,
};
let state: AppState = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-03").state;
state = recordFrame(state, frame, "2026-11-03T10:00").state;
const marked = editFrame(state, "f1", { labels: ["too_dark", "movement"], developedNote: "Light leak at the edge" });

const page = (saved: AppState) => renderToStaticMarkup(<FramePage state={saved} frameId="f1" onBack={noop} onEdit={noop} onDelete={noop} onNeighbour={noop} />);

const LABEL_WORDS = [
  "Good",
  "A bit dark", "Too dark",
  "A bit light", "Too light",
  "A bit out of focus", "Out of focus",
  "Blurred by movement",
  "Sun flare", "Double exposure", "Offset frame", "Weird artefacts",
  "Other",
];

describe("after developing, on a frame's page", () => {
  it("offers the thirteen labels, each 'a bit' one before its stronger one, then a note, after the shot and before changing the frame", () => {
    const html = page(state);
    inOrder(readable(html), ["Your shot", "Mark after developing", ...LABEL_WORDS, "Developing note", "Change this frame"]);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(13);
    expect(html).toContain('placeholder="Such as a light leak at the edge"');
    // No help: the card explains itself.
    expect(html).not.toContain("What the labels mean");
    expect(readable(html)).not.toContain("Note after developing");
    expect(readable(html)).not.toContain("Shot note"); // no shot note recorded on this frame
  });

  it("draws the labels as small tags, as in Your shot, each answering a tap in the gap around it", () => {
    const tags = page(state).match(/<button[^>]*aria-pressed[^>]*>/g) ?? [];
    expect(tags).toHaveLength(13);
    for (const tag of tags) expect(tag).toMatch(/\bh-7\b.*\bbefore:-inset-1\b/);
  });

  it("has a box of four lines for the note, growing as it's typed, with room for 1000 characters", () => {
    const html = page(state);
    expect(html).toMatch(/<textarea[^>]*id="developed-note"[^>]*>/);
    const box = html.match(/<textarea[^>]*>/)![0];
    expect(box).toContain('rows="4"');
    expect(box).toContain('maxLength="1000"');
    expect(box).toContain("[field-sizing:content]");
  });

  it("shows the labels picked, any number at once, and the note, line breaks kept", () => {
    const html = page(editFrame(marked, "f1", { developedNote: "Light leak at the edge.\nTry the other back." }));
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Too dark</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Blurred by movement</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Good</);
    expect(html).toMatch(/<textarea[^>]*>Light leak at the edge.\nTry the other back.<\/textarea>/);
  });
});

describe("after developing, in the roll's list", () => {
  const row = (saved: AppState) => renderToStaticMarkup(<FrameRow frame={saved.frames[0]} onOpen={noop} />);

  it("shows a frame's labels in the app's order, then its note, and neither when there are none", () => {
    inOrder(readable(row(marked)), ["f/8 · 1/125 · 3 m", "Too dark", "Blurred by movement", "Light leak at the edge"]);
    expect(readable(row(state))).not.toMatch(/Too dark|Good|Light leak/);
  });

  it("cuts the note to one line, beside the labels, and shows it without labels too", () => {
    const long = editFrame(marked, "f1", { developedNote: `Washed out.\n${"Next time one step less. ".repeat(10)}` });
    expect(row(long)).toMatch(/<span class="[^"]*\btruncate\b[^"]*">Washed out.\nNext time/);
    const noteOnly = editFrame(state, "f1", { developedNote: "Scratched" });
    expect(readable(row(noteOnly))).toContain("Scratched");
  });

  it("names each row, so the list can bring back into view the frame it returns from", () => {
    expect(row(marked)).toContain('id="frame-row-f1"');
  });
});
