// The photo of the scene on screen.
// The photo itself loads from the phone's storage in a browser; here its place and its words are checked.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { recordDraftFrom, type RecordDraft } from "../../lib/record.ts";
import { addCamera, EMPTY_STATE, recordFrame, type AppState, type FrameDraft, type ShotSummary } from "../../lib/store.ts";
import { FramePage, FrameRow } from "./Frames.tsx";
import { RecordShot } from "./RecordShot.tsx";

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
const advice: ShotSummary = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } };
const frame = (number: number, photo: string | null): FrameDraft => ({
  rollId: "r1",
  number,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice,
  answers: { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "portrait", distanceM: null, goal: "blur", sunBehind: false },
  hold: "hand",
  note: "",
  photo,
});
let state: AppState = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-03").state;
state = recordFrame(state, frame(11, null), "2026-11-03T10:00").state;
state = recordFrame(state, frame(12, "p-12"), "2026-11-03T10:10").state;

const form = (more: Partial<RecordDraft> = {}, samePhotoAs: number | null = null, editing: { number: number } | null = null, earlier = false) =>
  renderToStaticMarkup(
    <RecordShot
      camera={state.cameras[0]}
      advice={advice}
      taken={[]}
      draft={{ ...recordDraftFrom(advice, 13), ...more }}
      onChange={noop}
      onBack={noop}
      onSave={noop}
      samePhotoAs={samePhotoAs}
      editing={editing}
      earlier={earlier}
    />,
  );

describe("the photo in the record form", () => {
  it("offers to add one, after the light and before the note, opening the phone's camera straight away", () => {
    const html = form();
    inOrder(readable(html), ["As advised", "Add a photo", "Of the scene, to know the frame later. It stays on this phone.", "Shot note (optional)"]);
    expect(html).toMatch(/<input type="file" accept="image\/\*" capture="environment" hidden=""/);
  });

  it("shows the photo with Retake and Remove, and says when it's the last attempt's", () => {
    const text = readable(form({ photo: "p-12" }, 12));
    inOrder(text, ["As advised", "Same photo as frame 12", "Retake", "Remove", "Shot note (optional)"]);
    expect(text).not.toContain("Add a photo");
    expect(form({ photo: "p-12" })).toContain('aria-label="The scene, as photographed with the phone"');
    expect(readable(form({ photo: "p-12" }))).not.toContain("Same photo as frame");
  });

  it("is in the form when changing a recorded frame, offering the camera or the phone's photos", () => {
    const withPhoto = readable(form({ photo: "p-12" }, null, { number: 12 }));
    inOrder(withPhoto, ["Retake", "Remove", "Shot note", "Save changes"]);
    expect(withPhoto).not.toContain("Same photo as frame");
    const without = form({}, null, { number: 12 });
    inOrder(readable(without), ["Add a photo", "Of the scene, from the camera or your photos. It stays on this phone.", "Save changes"]);
    expect(without).toMatch(/<input type="file" accept="image\/\*" hidden=""/);
    expect(without).not.toContain('capture="environment"');
  });

  it("offers the camera or the phone's photos for a frame taken earlier, added from its roll", () => {
    const html = form({}, null, null, true);
    inOrder(readable(html), ["Record this shot", "Add a photo", "Of the scene, from the camera or your photos. It stays on this phone.", "Save frame 13"]);
    expect(html).not.toContain('capture="environment"');
  });
});

describe("the photo on a frame's page, and in the roll's list", () => {
  const page = (frameId: string) => renderToStaticMarkup(<FramePage state={state} frameId={frameId} onBack={noop} onEdit={noop} onDelete={noop} onNeighbour={noop} />);

  it("shows a frame's photo first, to look at: changing it is in Change this frame", () => {
    const html = page("f2");
    inOrder(readable(html), ["Frame 12", "You set", "Change this frame"]);
    expect(html).toContain('aria-label="Frame 12: the scene, as photographed with the phone"');
    expect(readable(html)).not.toMatch(/Retake|Remove|Add a photo/);
    expect(html).not.toContain('type="file"');
  });

  it("shows nothing for the photo when there is none", () => {
    const text = readable(page("f1"));
    expect(text).not.toMatch(/Add a photo|the scene, as photographed/);
  });

  it("puts the photo in place of the subject's icon in the list", () => {
    const withPhoto = renderToStaticMarkup(<FrameRow frame={state.frames[1]} onOpen={noop} />);
    expect(withPhoto).toContain('aria-label="Frame 12: the scene, as photographed with the phone"');
    const without = renderToStaticMarkup(<FrameRow frame={state.frames[0]} onOpen={noop} />);
    expect(without).not.toContain("the scene, as photographed");
  });
});
