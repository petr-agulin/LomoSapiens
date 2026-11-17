// The roll history's saved data.
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "./cameraAnswers.ts";
import {
  EMPTY_STATE,
  addCamera,
  cameraInUse,
  deleteCamera,
  deleteFrame,
  deleteRoll,
  editFrame,
  editRoll,
  findRoll,
  finishRoll,
  finishedRolls,
  framesOn,
  lastRecordedFrame,
  loadRoll,
  nextFrameNumber,
  recordFrame,
  renameCamera,
  rollsInCameras,
  setInUse,
  setLastShot,
  setHold,
  type AppState,
  type FrameDraft,
  type ShotAnswers,
  type ShotSummary,
} from "./store.ts";

const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const colour400 = { iso: 400, type: "color_negative" } as const;
const bw100 = { iso: 100, type: "bw_negative" } as const;
const DAY = "2026-11-03";
const LATER = "2026-11-14";
const AT = "2026-11-03T15:42";

const answers: ShotAnswers = {
  light: { group: "day", sky: "sun", place: "open" },
  lowSun: false,
  stormOutside: false,
  subject: "portrait",
  distanceM: null,
  goal: "blur",
  sunBehind: false,
};
const advice: ShotSummary = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 1, source: "default" } };
const frame = (rollId: string, number: number, more: Partial<FrameDraft> = {}): FrameDraft => ({
  rollId,
  number,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 1 },
  advice,
  answers,
  hold: "hand",
  note: "",
  photo: null,
  ...more,
});

// Two cameras: Mine, in use, with a roll of ISO 400 colour; Spare, empty.
const one = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: colour400 }, DAY);
const two = addCamera(one.state, { name: "Spare", answers: compact, film: null }, DAY);
const mine = one.id;
const spare = two.id;
const base = two.state;
const rollOf = (state: AppState, cameraId: string) => state.cameras.find((camera) => camera.id === cameraId)?.film ?? null;
const record = (state: AppState, draft: FrameDraft, at = AT) => recordFrame(state, draft, at).state;

describe("loading a roll", () => {
  it("loads the film of setting up a camera as a roll of 36, dated, with no name", () => {
    expect(cameraInUse(base)?.film).toEqual({ id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: DAY });
    expect(rollOf(base, spare)).toBeNull();
    expect(base.rolls).toEqual([]);
    expect(base.frames).toEqual([]);
  });

  it("takes the length and the name given, the name trimmed and cut to 40 characters", () => {
    const loaded = loadRoll(base, spare, { ...bw100, frames: 24, name: "  Box print  " }, LATER);
    expect(rollOf(loaded, spare)).toEqual({ id: "r2", iso: 100, type: "bw_negative", frames: 24, name: "Box print", loadedOn: LATER });
    const long = loadRoll(base, spare, { ...bw100, name: "x".repeat(50) }, LATER);
    expect(rollOf(long, spare)?.name).toBe("x".repeat(40));
  });

  it("refuses a length outside 1 to 99, and a speed that isn't a number above 0", () => {
    for (const frames of [0, 100, 2.5, Number.NaN]) expect(loadRoll(base, spare, { ...bw100, frames }, LATER)).toBe(base);
    expect(loadRoll(base, spare, { iso: -5, type: "bw_negative" }, LATER)).toBe(base);
    expect(loadRoll(base, "nope", bw100, LATER)).toBe(base);
  });

  it("finishes the roll already in the camera, with its frames kept on it", () => {
    const shot = record(base, frame("r1", 1));
    const after = loadRoll(shot, mine, bw100, LATER);
    expect(rollOf(after, mine)).toMatchObject({ id: "r2", iso: 100 });
    expect(finishedRolls(after)).toEqual([
      { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: DAY, cameraId: mine, cameraName: "Mine", finishedOn: LATER },
    ]);
    expect(framesOn(after, "r1").map((saved) => saved.number)).toEqual([1]);
  });
});

describe("finishing a roll", () => {
  it("empties the camera and keeps the roll, with the camera's name and the day", () => {
    const after = finishRoll(base, mine, LATER);
    expect(rollOf(after, mine)).toBeNull();
    expect(finishedRolls(after)).toEqual([expect.objectContaining({ id: "r1", cameraId: mine, cameraName: "Mine", finishedOn: LATER })]);
    expect(finishRoll(base, spare, LATER)).toBe(base);
  });

  it("lists finished rolls newest first", () => {
    let state = finishRoll(base, mine, "2026-10-01");
    state = finishRoll(loadRoll(state, mine, bw100, "2026-10-02"), mine, "2026-11-01");
    state = finishRoll(loadRoll(state, spare, colour400, "2026-09-01"), spare, "2026-10-15");
    expect(finishedRolls(state).map((roll) => [roll.id, roll.finishedOn])).toEqual([
      ["r2", "2026-11-01"],
      ["r3", "2026-10-15"],
      ["r1", "2026-10-01"],
    ]);
  });
});

describe("changing a roll's details", () => {
  it("changes a roll in a camera", () => {
    const after = editRoll(base, "r1", { iso: 200, type: "bw_negative", frames: 24, name: " Gold ", loadedOn: "2026-11-01" });
    expect(rollOf(after, mine)).toEqual({ id: "r1", iso: 200, type: "bw_negative", frames: 24, name: "Gold", loadedOn: "2026-11-01" });
  });

  it("changes a finished roll, its finishing day too", () => {
    const after = editRoll(finishRoll(base, mine, LATER), "r1", { name: "Holiday", finishedOn: "2026-11-15" });
    expect(finishedRolls(after)[0]).toMatchObject({ name: "Holiday", finishedOn: "2026-11-15" });
  });

  it("ignores values it can't keep, and a roll that doesn't exist", () => {
    expect(editRoll(base, "r1", { frames: 0 })).toBe(base);
    expect(editRoll(base, "r1", { loadedOn: "2026-02-30" })).toBe(base);
    expect(editRoll(base, "r1", { iso: 0 })).toBe(base);
    expect(editRoll(base, "r1", { finishedOn: LATER })).toBe(base); // a roll in a camera isn't finished
    expect(editRoll(base, "nope", { name: "X" })).toBe(base);
  });
});

describe("deleting a roll: any roll, as it can be damaged in the camera", () => {
  const shot = record(record(loadRoll(record(base, frame("r1", 1)), spare, bw100, LATER), frame("r2", 1)), frame("r1", 2));

  it("deletes the roll in a camera with its frames, leaving the camera empty", () => {
    const after = deleteRoll(shot, "r1");
    expect(rollOf(after, mine)).toBeNull();
    expect(after.frames.map((saved) => saved.rollId)).toEqual(["r2"]);
  });

  it("deletes a finished roll with its frames", () => {
    const finished = finishRoll(shot, spare, LATER);
    const after = deleteRoll(finished, "r2");
    expect(finishedRolls(after)).toEqual([]);
    expect(after.frames.map((saved) => saved.rollId)).toEqual(["r1", "r1"]);
    expect(deleteRoll(finished, "nope")).toBe(finished);
  });
});

describe("deleting a camera keeps its rolls", () => {
  const loaded = record(loadRoll(base, spare, bw100, DAY), frame("r2", 1));

  it("finishes the camera's roll that day, under its name, with its frames", () => {
    const after = deleteCamera(loaded, spare, LATER);
    expect(after.cameras.map((camera) => camera.name)).toEqual(["Mine"]);
    expect(finishedRolls(after)).toEqual([expect.objectContaining({ id: "r2", cameraId: spare, cameraName: "Spare", finishedOn: LATER })]);
    expect(framesOn(after, "r2")).toHaveLength(1);
    expect(findRoll(after, "r2")?.cameraName).toBe("Spare");
  });

  it("goes back to first setup after the last camera, keeping how it's held, the rolls and the frames", () => {
    const only = record(setLastShot(setHold(one.state, "braced"), { answers, result: advice }), frame("r1", 1));
    const after = deleteCamera(only, mine, LATER);
    expect(after.cameras).toEqual([]);
    expect(after.inUse).toBeNull();
    expect(after.lastShot).toBeNull();
    expect(after.hold).toBe("braced");
    expect(finishedRolls(after).map((roll) => roll.id)).toEqual(["r1"]);
    expect(after.frames).toHaveLength(1);
  });

  it("never gives a new camera the id of a deleted one that rolls still name", () => {
    const after = deleteCamera(loaded, spare, LATER);
    const added = addCamera(after, { name: "New", answers: compact, film: null }, LATER);
    expect(added.id).not.toBe(spare);
    expect(findRoll(added.state, "r2")?.cameraName).toBe("Spare");
  });
});

describe("where each roll is", () => {
  const both = loadRoll(base, spare, bw100, LATER);

  it("lists the rolls in cameras, the camera in use first, skipping empty cameras", () => {
    expect(rollsInCameras(both).map(({ roll, camera }) => [roll.id, camera.name])).toEqual([
      ["r1", "Mine"],
      ["r2", "Spare"],
    ]);
    expect(rollsInCameras(setInUse(both, spare)).map(({ camera }) => camera.name)).toEqual(["Spare", "Mine"]);
    expect(rollsInCameras(base).map(({ camera }) => camera.name)).toEqual(["Mine"]);
  });

  it("finds a roll in a camera or finished, under the camera's name as it is now", () => {
    expect(findRoll(both, "r2")).toEqual({ roll: rollOf(both, spare), cameraId: spare, cameraName: "Spare", finishedOn: null });
    const finished = renameCamera(finishRoll(both, spare, LATER), spare, "Travel");
    expect(findRoll(finished, "r2")).toMatchObject({ cameraName: "Travel", finishedOn: LATER });
    expect(findRoll(both, "nope")).toBeNull();
  });
});

describe("recording a frame", () => {
  it("numbers a new roll's first frame 1, then the highest recorded plus 1, up to 99", () => {
    expect(nextFrameNumber(base, "r1")).toBe(1);
    const gaps = record(record(record(base, frame("r1", 1)), frame("r1", 5)), frame("r1", 2));
    expect(nextFrameNumber(gaps, "r1")).toBe(6);
    expect(nextFrameNumber(record(base, frame("r1", 99)), "r1")).toBe(99);
  });

  it("keeps what was set, the advice, the shot, the hold, the note and the time", () => {
    const { state, id } = recordFrame(base, frame("r1", 12, { set: { aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: null }, hold: "braced", note: "  Anna by the window " }), AT);
    expect(id).toBe("f1");
    expect(state.frames).toEqual([
      {
        id: "f1",
        rollId: "r1",
        number: 12,
        recordedAt: AT,
        set: { aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: null },
        advice,
        answers,
        hold: "braced",
        note: "Anna by the window",
        photo: null,
        labels: [],
        developedNote: "",
      },
    ]);
  });

  it("keeps B's seconds, and cuts a note to 200 characters", () => {
    const { state } = recordFrame(base, frame("r1", 1, { set: { aperture: "2.8", shutter: "B", bulbSeconds: 4, focusM: 3 }, note: "y".repeat(250) }), AT);
    expect(state.frames[0].set).toEqual({ aperture: "2.8", shutter: "B", bulbSeconds: 4, focusM: 3 });
    expect(state.frames[0].note).toBe("y".repeat(200));
  });

  it("refuses a frame it can't keep, leaving the state as it was", () => {
    const bad: Partial<FrameDraft>[] = [
      { rollId: "nope" },
      { number: 0 },
      { number: 100 },
      { number: 1.5 },
      { set: { aperture: "3" as never, shutter: "1/125", bulbSeconds: null, focusM: 1 } },
      { set: { aperture: "8", shutter: "1/3" as never, bulbSeconds: null, focusM: 1 } },
      { set: { aperture: "8", shutter: "1/125", bulbSeconds: 4, focusM: 1 } },
      { set: { aperture: "8", shutter: "B", bulbSeconds: 0, focusM: 1 } },
      { set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 0 } },
      { hold: "tripod" as never },
    ];
    for (const more of bad) expect(recordFrame(base, frame("r1", 1, more), AT).state).toBe(base);
    expect(recordFrame(base, frame("r1", 1), "2026-11-03 15:42").state).toBe(base);
  });

  it("makes the roll as long as a frame numbered past its end, in a camera or finished", () => {
    const short = loadRoll(base, spare, { ...bw100, frames: 24 }, LATER);
    expect(rollOf(record(short, frame("r2", 26)), spare)?.frames).toBe(26);
    expect(rollOf(record(short, frame("r2", 24)), spare)?.frames).toBe(24);
    const finished = finishRoll(short, spare, LATER);
    expect(findRoll(record(finished, frame("r2", 30)), "r2")?.roll.frames).toBe(30);
    expect(rollOf(record(short, frame("r2", 30)), mine)?.frames).toBe(36);
  });

  it("keeps two frames with the same number, in the order they were recorded", () => {
    const twice = record(record(base, frame("r1", 12, { note: "first" }), "2026-11-03T15:42"), frame("r1", 12, { note: "second" }), "2026-11-03T15:43");
    expect(framesOn(twice, "r1").map((saved) => saved.note)).toEqual(["first", "second"]);
  });

  it("lists a roll's frames by number, then by time", () => {
    let state = base;
    for (const [number, at] of [[3, "2026-11-03T10:00"], [1, "2026-11-03T11:00"], [2, "2026-11-03T09:00"], [1, "2026-11-03T08:00"]] as const) {
      state = record(state, frame("r1", number), at);
    }
    expect(framesOn(state, "r1").map((saved) => [saved.number, saved.recordedAt.slice(11)])).toEqual([
      [1, "08:00"],
      [1, "11:00"],
      [2, "09:00"],
      [3, "10:00"],
    ]);
  });
});

describe("Home's last recorded frame", () => {
  it("is none until a roll in a camera has a frame, and never a finished roll's", () => {
    expect(lastRecordedFrame(base)).toBeNull();
    const finished = finishRoll(record(base, frame("r1", 3)), mine, LATER);
    expect(lastRecordedFrame(finished)).toBeNull();
  });

  it("is the frame furthest along the roll, even when a lower one was added later", () => {
    let state = record(base, frame("r1", 11), "2026-11-03T10:00");
    state = record(state, frame("r1", 12), "2026-11-03T10:05");
    state = record(state, frame("r1", 5, { note: "forgotten" }), "2026-11-03T12:00");
    const last = lastRecordedFrame(state);
    expect(last?.frame.number).toBe(12);
    expect(last?.roll.id).toBe("r1");
    expect(last?.camera.name).toBe("Mine");
  });

  it("follows the roll last recorded on, in whichever camera, so two cameras at work show the right film", () => {
    let state = loadRoll(base, spare, bw100, DAY);
    state = record(state, frame("r1", 7), "2026-11-03T10:00");
    state = record(state, frame("r2", 2), "2026-11-03T10:30");
    expect(lastRecordedFrame(state)).toMatchObject({ frame: { rollId: "r2", number: 2 }, camera: { name: "Spare" } });
    state = record(state, frame("r1", 8), "2026-11-03T11:00");
    expect(lastRecordedFrame(state)).toMatchObject({ frame: { rollId: "r1", number: 8 }, camera: { name: "Mine" } });
    // Two recordings in the same minute: the one recorded second.
    state = record(state, frame("r2", 3), "2026-11-03T11:00");
    expect(lastRecordedFrame(state)?.frame.rollId).toBe("r2");
  });
});

describe("changing a frame", () => {
  const shot = recordFrame(base, frame("r1", 12), AT).state;

  it("changes the number, the settings, the note and the photo, never the advice or the time", () => {
    const after = editFrame(shot, "f1", { number: 13, set: { aperture: "4", shutter: "1/250", bulbSeconds: null, focusM: 2 }, note: " Later ", photo: "p1" });
    expect(after.frames[0]).toMatchObject({ number: 13, set: { aperture: "4", focusM: 2 }, note: "Later", photo: "p1", advice, recordedAt: AT });
  });

  it("keeps the labels after developing once each, in the app's order, and their note", () => {
    const after = editFrame(shot, "f1", { labels: ["out_of_focus", "too_dark", "out_of_focus", "made_up" as never], developedNote: " Light leak " });
    expect(after.frames[0].labels).toEqual(["too_dark", "out_of_focus"]);
    expect(after.frames[0].developedNote).toBe("Light leak");
  });

  it("makes the roll as long as a number changed past its end, never shorter", () => {
    expect(rollOf(editFrame(shot, "f1", { number: 40 }), mine)?.frames).toBe(40);
    expect(rollOf(editFrame(editFrame(shot, "f1", { number: 40 }), "f1", { number: 3 }), mine)?.frames).toBe(40);
    expect(rollOf(editFrame(shot, "f1", { number: 13 }), mine)?.frames).toBe(36);
  });

  it("ignores a change it can't keep, and a frame that doesn't exist", () => {
    expect(editFrame(shot, "f1", { number: 0 })).toBe(shot);
    expect(editFrame(shot, "nope", { note: "x" })).toBe(shot);
  });

  it("deletes a frame", () => {
    expect(deleteFrame(shot, "f1").frames).toEqual([]);
    expect(deleteFrame(shot, "nope")).toBe(shot);
  });
});

it("never changes the state it was given", () => {
  const shot = recordFrame(loadRoll(base, spare, bw100, LATER), frame("r1", 1), AT).state;
  const before = JSON.stringify(shot);
  loadRoll(shot, mine, bw100, LATER);
  finishRoll(shot, mine, LATER);
  editRoll(shot, "r1", { name: "X" });
  deleteRoll(shot, "r2");
  deleteCamera(shot, mine, LATER);
  recordFrame(shot, frame("r2", 1), AT);
  editFrame(shot, "f1", { labels: ["good"] });
  deleteFrame(shot, "f1");
  expect(JSON.stringify(shot)).toBe(before);
});
