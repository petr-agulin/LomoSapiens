// After developing: the six labels and a note on a frame's
// page, what they mean, and the labels in the roll's list.
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

describe("after developing, on a frame's page", () => {
  it("offers the six labels, then a note, after the shot and before changing the frame", () => {
    const html = page(state);
    inOrder(readable(html), [
      "Your shot",
      "Mark after developing",
      "Good", "Too dark", "Too light", "Out of focus", "Blurred by movement", "Other",
      "Developing note",
      "Change this frame",
    ]);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(6);
    expect(html).toContain('placeholder="Such as a light leak at the edge"');
    // No help: the card explains itself.
    expect(html).not.toContain("What the labels mean");
    expect(readable(html)).not.toContain("Note after developing");
    expect(readable(html)).not.toContain("Shot note"); // no shot note recorded on this frame
  });

  it("shows the labels picked, any number at once, and the note", () => {
    const html = page(marked);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Too dark</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Blurred by movement</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Good</);
    expect(html).toContain('value="Light leak at the edge"');
  });
});

describe("after developing, in the roll's list", () => {
  it("shows a frame's labels in the app's order, and none when there are none", () => {
    inOrder(readable(renderToStaticMarkup(<FrameRow frame={marked.frames[0]} onOpen={noop} />)), ["f/8 · 1/125 · 3 m", "Too dark", "Blurred by movement"]);
    expect(readable(renderToStaticMarkup(<FrameRow frame={state.frames[0]} onOpen={noop} />))).not.toMatch(/Too dark|Good/);
  });
});
