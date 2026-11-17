// A roll's frames and a frame's page.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { recordDraftOfFrame } from "../../lib/record.ts";
import { addCamera, EMPTY_STATE, recordFrame, type AppState, type FrameDraft } from "../../lib/store.ts";
import { FramePage } from "./Frames.tsx";
import { RecordShot } from "./RecordShot.tsx";
import { RollPage } from "./Rolls.tsx";

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
const advice = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } } as const;
const frame = (number: number, more: Partial<FrameDraft> = {}): FrameDraft => ({
  rollId: "r1",
  number,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice,
  answers: { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "other", distanceM: 3, goal: "sharp", sunBehind: false },
  hold: "hand",
  note: "",
  photo: null,
  ...more,
});

// Mine with roll r1: frame 13 recorded first, then 1 as advised, then 12 at f/5.6 with a note.
let state: AppState = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative", name: "Box" } }, "2026-11-03").state;
state = recordFrame(state, frame(13), "2026-11-03T10:30").state;
state = recordFrame(state, frame(1), "2026-11-03T10:00").state;
state = recordFrame(state, frame(12, { set: { aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: 3 }, note: "Anna by the window" }), "2026-11-03T10:20").state;

describe("a roll's frames", () => {
  const page = readable(renderToStaticMarkup(<RollPage state={state} rollId="r1" via="rolls" onBack={noop} onDetails={noop} onFrame={noop} onAddFrame={noop} />));

  it("lists every frame by number, with what was set", () => {
    inOrder(page, ["3 of 36 recorded", "Recorded frames", "Frame 1", "f/8 · 1/125 · 3 m", "Frame 12", "f/5.6 · 1/125 · 3 m", "Frame 13", "f/8 · 1/125 · 3 m"]);
  });

  it("gives the light and the subject when as advised, the advice when not, and the note", () => {
    inOrder(page, ["Frame 1", "Sun · Something else", "Frame 12", "Advised f/8 · 1/125 · 3 m", "Anna by the window", "Frame 13", "Sun · Something else"]);
  });
});

describe("a frame's page", () => {
  const page = (frameId: string, openAt: "delete" | null = null) =>
    renderToStaticMarkup(<FramePage state={state} frameId={frameId} onBack={noop} onEdit={noop} onDelete={noop} onNeighbour={noop} openAt={openAt} />);

  it("shows what was set beside the advice, how far the light is from it, the shot, the hold and the note", () => {
    const html = page("f3");
    inOrder(readable(html), [
      "Box",
      "Frame 12", "3 Nov 2026, 10:20",
      "You set", "Frame 12 of 36", "ISO 400 colour",
      "Advised f/8 · 1/125 · 3 m", "1 step more light than advised",
      "Your shot", "Sun", "Open terrain", "Something else", "Everything sharp", "By hand",
      "Shot note", "Anna by the window",
      "Change this frame", "Delete this frame",
    ]);
    expect(html).toContain('aria-label="f/5.6, 1/125, 3 m"');
  });

  it("says As advised, with no advice line, when nothing was changed", () => {
    const text = readable(page("f2"));
    expect(text).toContain("As advised");
    expect(text).not.toContain("Advised f/8");
    // No note recorded with the shot: no Note section (the note after developing is another, step 6).
    expect(page("f2")).not.toContain('id="frame-note"');
  });

  it("goes to the frames before and after it on the roll, by number", () => {
    const middle = page("f3");
    expect(middle).toContain('aria-label="Previous: frame 1"');
    expect(middle).toContain('aria-label="Next: frame 13"');
    inOrder(readable(middle), ["Frame 1", "Frame 13"]);
    expect(page("f2")).not.toContain("Previous:");
    expect(page("f2")).toContain('aria-label="Next: frame 12"');
    expect(page("f1")).toContain('aria-label="Previous: frame 12"');
    expect(page("f1")).not.toContain("Next:");
  });

  it("asks before deleting a frame", () => {
    inOrder(readable(page("f3", "delete")), ["Delete frame 12?", "Its settings, note and photo go with it. This can't be undone.", "Delete frame", "Keep it"]);
  });
});

describe("changing a frame", () => {
  const saved = state.frames.find((saved) => saved.id === "f3")!;
  const form = (openAt: "discard" | null = null, unsaved = false) =>
    readable(
      renderToStaticMarkup(
        <RecordShot
          camera={state.cameras[0]}
          advice={saved.advice}
          taken={[1, 13]}
          draft={recordDraftOfFrame(saved)}
          onChange={noop}
          onBack={noop}
          onSave={noop}
          editing={{ number: 12 }}
          unsaved={unsaved}
          openAt={openAt}
        />,
      ),
    );

  it("opens the form on the frame, named after it, with Save changes", () => {
    inOrder(form(), [
      "Frame 12",
      "Frame 12",
      "Change what was set, the frame number or the note. The advice stays as it was given.",
      "Aperture", "Advised f/8", "5.6",
      "1 step more light than advised",
      "Save changes",
    ]);
    expect(form()).not.toContain("already recorded");
  });

  it("asks before Back loses a change", () => {
    inOrder(form("discard", true), ["Discard your changes?", "The frame stays as it was.", "Discard", "Keep editing"]);
  });
});
