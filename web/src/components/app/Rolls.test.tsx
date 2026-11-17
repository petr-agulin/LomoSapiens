// Rolls, a roll's page, Roll details and New roll.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { newDraft, rollDraft } from "../../lib/setup.ts";
import { addCamera, EMPTY_STATE, finishRoll, loadRoll, recordFrame, setInUse, type AppState, type FrameDraft } from "../../lib/store.ts";
import { RollDetails, RollPage, RollsHome, type RollDates } from "./Rolls.tsx";
import { FilmStep } from "./Setup.tsx";
import { LoadRoll } from "./ShotScreens.tsx";

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
const frame = (rollId: string, number: number): FrameDraft => ({
  rollId,
  number,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice: { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } },
  answers: { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "other", distanceM: 3, goal: "sharp", sunBehind: false },
  hold: "hand",
  note: "",
  photo: null,
});

// Mine, in use, with roll r1 (ISO 400 colour, 1 frame recorded); Spare, whose roll r2 "Box" (ISO 100 B&W, 24) was finished.
let state: AppState = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-03").state;
state = addCamera(state, { name: "Spare", answers: compact, film: null }, "2026-11-03").state;
state = recordFrame(state, frame("r1", 1), "2026-11-03T10:00").state;
state = finishRoll(loadRoll(state, "c2", { iso: 100, type: "bw_negative", frames: 24, name: "Box" }, "2026-11-03"), "c2", "2026-11-14");

const rolls = (saved: AppState = state, openAt: Parameters<typeof RollsHome>[0]["openAt"] = null) =>
  renderToStaticMarkup(<RollsHome state={saved} onBack={noop} onRoll={noop} onLoad={noop} openAt={openAt} />);

describe("Rolls", () => {
  it("lists the rolls in cameras, then loading a new one, then the finished rolls", () => {
    inOrder(readable(rolls()), [
      "Back",
      "Rolls",
      "Every roll, and the frames you recorded on it.",
      "In your cameras",
      "ISO 400 colour", "Mine", "1 of 36 recorded",
      "Load a new roll", "In one of your cameras",
      "Finished",
      "Box", "ISO 100 black and white · Spare · 3 – 14 Nov 2026", "0 recorded",
    ]);
  });

  it("lists the camera in use first", () => {
    const both = loadRoll(state, "c2", { iso: 200, type: "color_negative" }, "2026-11-15");
    inOrder(readable(rolls(setInUse(both, "c2"))), ["In your cameras", "ISO 200 colour", "Spare", "ISO 400 colour", "Mine", "Load a new roll"]);
  });

  it("asks which camera when there are several, the one in use first, with its roll or none", () => {
    inOrder(readable(rolls(state, { which: true })), [
      "Which camera?",
      "The new roll goes in this camera.",
      "Mine", "ISO 400 colour · 1 of 36",
      "Spare", "No film loaded",
    ]);
  });

  it("asks before finishing the roll already in the camera", () => {
    inOrder(readable(rolls(state, { finish: "c1" })), [
      "Finish the roll in Mine?",
      "ISO 400 colour, 1 of 36 recorded. It moves to your finished rolls.",
      "Finish and load a new one",
      "Keep it",
    ]);
  });

  it("says when there's no roll yet, and offers no loading without a camera", () => {
    const empty = readable(rolls(EMPTY_STATE));
    expect(empty).toContain("No rolls yet. Load one from a camera's page.");
    expect(empty).not.toMatch(/Load a new roll|In your cameras|Finished/);
  });
});

describe("a roll's page", () => {
  const page = (rollId: string, via: "camera" | "rolls" = "rolls", saved: AppState = state) =>
    readable(renderToStaticMarkup(<RollPage state={saved} rollId={rollId} via={via} onBack={noop} onDetails={noop} onFrame={noop} onAddFrame={noop} />));

  it("names the roll, where it is, when it was loaded and how many frames are recorded, then its details and frames", () => {
    inOrder(page("r1"), ["Rolls", "ISO 400 colour", "Mine · loaded 3 Nov 2026", "1 of 36 recorded", "Roll details", "ISO 400 colour", "Recorded frames", "Frame 1"]);
    expect(page("r1")).not.toContain("No recorded frames yet");
  });

  it("offers to add a frame not recorded on the result, below the frames, on a roll in a camera", () => {
    inOrder(page("r1"), ["Recorded frames", "Frame 1", "Add a frame", "Forgot to record one? Answer the two questions, then record it."]);
    const empty = loadRoll(state, "c2", { iso: 200, type: "color_negative" }, "2026-11-15");
    inOrder(page("r3", "rolls", empty), ["Recorded frames", "No recorded frames yet. On the result, tap Record this shot when you take one.", "Add a frame"]);
  });

  it("names the camera in the crumb when opened from its page", () => {
    expect(page("r1", "camera")).toMatch(/^ ?Mine ISO 400 colour/);
  });

  it("gives a finished roll its dates, says when no frame was recorded, and adds none", () => {
    inOrder(page("r2"), ["Box", "Spare · 3 – 14 Nov 2026", "0 of 24 recorded", "Roll details", "ISO 100 black and white", "Recorded frames", "No frames were recorded on this roll."]);
    expect(page("r2")).not.toMatch(/Add a frame|Record this shot/);
  });
});

describe("Roll details", () => {
  const details = (rollId: string, dates: RollDates, openAt: "finish" | "delete" | null = null, draft = rollDraft("Mine", state.cameras[0].film)) =>
    renderToStaticMarkup(
      <RollDetails state={state} rollId={rollId} draft={draft} onChange={noop} dates={dates} onDates={noop} onBack={noop} onDone={noop} onFinish={noop} onDelete={noop} openAt={openAt} />,
    );
  const inMine = { loadedOn: "2026-11-03", finishedOn: null };

  it("corrects the roll in a camera: its film, length, name and day loaded, then finishing or deleting it", () => {
    const html = details("r1", inMine);
    inOrder(readable(html), [
      "ISO 400 colour",
      "Roll details", "In Mine · 1 of 36 recorded",
      "Film speed (ISO)", "Colour or black and white",
      "Frames on the roll", "The number on the box", "36",
      "Name (optional)",
      "Loaded on",
      "Finish this roll", "It moves to your finished rolls. The camera is empty until you load another.",
      "Delete this roll", "With its frames and their photos",
      "Done",
    ]);
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-11-03"');
    expect(html).toMatch(/text-\[34px\][^>]*>36</);
    expect(readable(html)).not.toMatch(/Finished on|This film stays/);
  });

  it("gives a finished roll its finishing day, and no Finish", () => {
    const html = readable(details("r2", { loadedOn: "2026-11-03", finishedOn: "2026-11-14" }, null, rollDraft("Spare", { id: "r2", iso: 100, type: "bw_negative", frames: 24, name: "Box", loadedOn: "2026-11-03" })));
    inOrder(html, ["Box", "Roll details", "From Spare · 0 of 24 recorded", "Loaded on", "Finished on", "Delete this roll", "Done"]);
    expect(html).not.toContain("Finish this roll");
  });

  it("asks before finishing the roll in a camera", () => {
    inOrder(readable(details("r1", inMine, "finish")), ["Finish this roll?", "Mine will be empty until you load another roll. The roll and its frames stay in Rolls.", "Finish roll", "Keep it"]);
  });

  it("asks before deleting a roll, any roll, saying what goes with it", () => {
    inOrder(readable(details("r1", inMine, "delete")), [
      "Delete this roll?",
      "Its 1 frame goes with it, photos included. Mine will be empty until you load another roll. This can't be undone.",
      "Delete roll",
      "Keep it",
    ]);
    expect(readable(details("r2", { loadedOn: "2026-11-03", finishedOn: "2026-11-14" }, "delete"))).toContain("No frames are recorded on it. This can't be undone. Delete roll");
  });

  it("keeps Done faded while the length typed or a date isn't valid", () => {
    const faded = /aria-disabled="true"[^>]*>Done/;
    expect(details("r1", inMine, null, { ...newDraft(), frames: "other", otherFrames: "0" })).toMatch(faded);
    expect(details("r1", { loadedOn: "", finishedOn: null })).toMatch(faded);
    expect(details("r1", inMine)).not.toMatch(faded);
  });
});

describe("New roll", () => {
  it("asks for the film, the length and an optional name, counting frames from 1", () => {
    const html = readable(renderToStaticMarkup(<LoadRoll cameraName="Mine" draft={newDraft()} onChange={noop} onBack={noop} onLoad={noop} />));
    inOrder(html, ["Mine", "New roll", "For Mine. Frames you record count from 1.", "Film speed (ISO)", "Colour or black and white", "Frames on the roll", "Name (optional)", "Load this roll"]);
    expect(html).not.toContain("This film stays");
  });
});

describe("the roll's length, picked or typed, shown big", () => {
  const step = (draft = newDraft(), openFrames = false) => renderToStaticMarkup(<FilmStep draft={draft} onChange={noop} openAt={openFrames ? "frames" : null} />);

  it("shows the length big in its row, which opens the choices", () => {
    expect(step()).toMatch(/aria-haspopup="dialog"[^>]*>.{0,400}?Frames on the roll.{0,200}?The number on the box.{0,200}?text-\[34px\][^>]*>36</);
    expect(step({ ...newDraft(), frames: "other", otherFrames: "30" })).toMatch(/text-\[34px\][^>]*>30</);
  });

  it("offers the usual lengths from Wikipedia's 135 film, then another number typed, kept with Done", () => {
    const html = step(newDraft(), true);
    inOrder(readable(html), [
      "Frames on the roll",
      "The number on the box. Another number, such as a roll you loaded yourself, can be typed.",
      "12", "20", "24", "36",
      "Other number",
      "Done",
    ]);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>.{0,200}?36</);
    expect(html).toMatch(/aria-disabled="true"[^>]*>Done/);
  });

  it("opens on a typed length in its field, with no tile picked", () => {
    const html = step({ ...newDraft(), frames: "other", otherFrames: "30" }, true);
    expect(html).toContain('value="30"');
    const tiles = html.slice(html.indexOf('aria-label="Frames on the roll"'));
    expect(tiles.slice(0, tiles.indexOf("</div>"))).not.toContain('aria-checked="true"');
    expect(html).not.toMatch(/aria-disabled="true"[^>]*>Done/);
  });

  it("says plainly when a typed length can't be a roll's", () => {
    const html = step({ ...newDraft(), frames: "other", otherFrames: "0" }, true);
    expect(readable(html)).toContain("Type a whole number from 1 to 99.");
    expect(html).toMatch(/aria-disabled="true"[^>]*>Done/);
  });
});
