// The backup file: everything on the phone in
// one file, read back with the same checks as the app's own saved data.
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "./cameraAnswers.ts";
import { backupCounts, backupName, makeBackup, readBackup } from "./backup.ts";
import { addCamera, EMPTY_STATE, editFrame, finishRoll, loadRoll, recordFrame, setHold, setLastShot, type AppState, type FrameDraft } from "./store.ts";

const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const advice = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } } as const;
const answers = { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "group", distanceM: 3, goal: "sharp", sunBehind: false } as const;
const frame = (rollId: string, number: number, photo: string | null = null): FrameDraft => ({
  rollId,
  number,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice,
  answers,
  hold: "hand",
  note: "",
  photo,
});

// Two cameras, a finished roll and one in use, frames with labels and a photo, the hold and the last shot.
let state: AppState = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative", name: "Box" } }, "2026-11-01").state;
state = addCamera(state, { name: "Spare", answers: compact, film: null }, "2026-11-01").state;
state = recordFrame(state, frame("r1", 1, "p-0011223344556677"), "2026-11-02T10:00").state;
state = loadRoll(state, "c1", { iso: 100, type: "bw_negative", frames: 24 }, "2026-11-05");
state = recordFrame(state, frame("r2", 1), "2026-11-06T09:30").state;
state = editFrame(state, "f1", { labels: ["good", "bit_dark", "double_exposure"], developedNote: `Sharp.\n${"A long note on two lines. ".repeat(30)}` });
state = setLastShot(setHold(state, "braced"), { answers, result: advice });
const photos = { "p-0011223344556677": "data:image/jpeg;base64,/9j/4AAQ" };

describe("a backup file", () => {
  it("is named after the day it was saved", () => {
    expect(backupName("2026-11-14")).toBe("lomosapiens-backup-2026-11-14.json");
  });

  it("holds everything, read back exactly: cameras, rolls, frames, photos, the hold and the last shot", () => {
    const file = JSON.stringify(makeBackup(state, photos, "2026-11-14T15:42"));
    expect(readBackup(file)).toEqual({ state, photos, savedAt: "2026-11-14T15:42" });
  });

  it("keeps every subject, Something further off included, in a frame and in the last shot", () => {
    let far = recordFrame(state, { ...frame("r2", 2), answers: { ...answers, subject: "far", distanceM: null } }, "2026-11-06T09:40").state;
    far = setLastShot(far, { answers: { ...answers, subject: "far", distanceM: null }, result: advice });
    const read = readBackup(JSON.stringify(makeBackup(far, photos, "2026-11-14T15:42")));
    expect(read).toEqual({ state: far, photos, savedAt: "2026-11-14T15:42" });
    expect(read && "state" in read ? read.state.frames.map((saved) => saved.answers.subject) : []).toEqual(["group", "group", "far"]);
  });

  it("counts what it holds, for the question before restoring", () => {
    expect(backupCounts(state)).toEqual({ cameras: 2, rolls: 2, frames: 2 });
    expect(backupCounts(finishRoll(state, "c1", "2026-11-07"))).toEqual({ cameras: 2, rolls: 2, frames: 2 });
    expect(backupCounts(EMPTY_STATE)).toEqual({ cameras: 0, rolls: 0, frames: 0 });
  });
});

describe("a file that isn't a LomoSapiens backup", () => {
  it("is refused, whatever it is", () => {
    const good = makeBackup(state, photos, "2026-11-14T15:42");
    for (const text of [
      "not json",
      "[]",
      JSON.stringify({ hello: "world" }),
      JSON.stringify({ ...good, kind: "something-else" }),
      JSON.stringify({ ...good, data: undefined }),
      JSON.stringify({ ...good, data: { ...good.data, version: 99 } }),
      JSON.stringify({ ...good, savedAt: "yesterday" }),
    ]) {
      expect(readBackup(text), text.slice(0, 40)).toBeNull();
    }
  });
});

describe("reading a backup with the app's own checks", () => {
  it("leaves out a photo that isn't one", () => {
    const file = makeBackup(state, { ...photos, "p-bad": "not a picture", "../x": "data:image/jpeg;base64,AA" }, "2026-11-14T15:42");
    expect(readBackup(JSON.stringify(file))?.photos).toEqual(photos);
  });

  it("upgrades a backup of version 1 data, as the app upgrades its own", () => {
    const old = { kind: "lomosapiens-backup", savedAt: "2026-11-10T08:00", data: { version: 1, cameras: [{ id: "c1", name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }], inUse: "c1", hold: "hand", lastShot: null }, photos: {} };
    expect(readBackup(JSON.stringify(old), "2026-11-14")?.state.cameras[0].film).toEqual({ id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-14" });
  });
});
