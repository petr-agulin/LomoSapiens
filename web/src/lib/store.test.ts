import { describe, expect, it } from "vitest";
import { answersToCamera, NOT_SURE, type CameraAnswers } from "./cameraAnswers.ts";
import { isRefusal, recommend } from "./engine/index.ts";
import type { Store } from "./settings.ts";
import {
  EMPTY_STATE,
  STORE_KEY,
  addCamera,
  cameraInUse,
  deleteCamera,
  editFrame,
  finishRoll,
  isSetUp,
  loadRoll,
  loadState,
  recordFrame,
  renameCamera,
  saveState,
  savedVersion,
  setAnswer,
  setHold,
  setInUse,
  setLastShot,
  type AppState,
  type LastShot,
} from "./store.ts";

const DAY = "2026-11-14";

/** An in-memory stand-in for the browser's storage. */
function memoryStore(start: Record<string, string> = {}): Store & { data: Record<string, string> } {
  const data = { ...start };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const compact: CameraAnswers = {
  widestAperture: "2.8",
  smallestAperture: "22",
  focalLengthMm: "40",
  fastestShutter: "1/250",
  slowestShutter: "1/15",
  hasBulb: "yes",
};
const colour400 = { iso: 400, type: "color_negative" } as const;

const lastShot: LastShot = {
  answers: {
    light: { group: "day", sky: "sun_behind_clouds", place: "open" },
    lowSun: true,
    stormOutside: false,
    subject: "portrait",
    distanceM: null,
    goal: "blur",
    sunBehind: false,
  },
  result: { aperture: "4", shutter: "1/250", bulbSeconds: null, focus: { meters: 1, source: "default" } },
};

describe("a first launch", () => {
  it("starts empty: no camera, held by hand, no last shot, no rolls or frames", () => {
    expect(loadState(null)).toEqual(EMPTY_STATE);
    expect(loadState(memoryStore())).toEqual(EMPTY_STATE);
    expect(EMPTY_STATE).toEqual({ cameras: [], inUse: null, hold: "hand", lastShot: null, rolls: [], frames: [] });
    expect(isSetUp(EMPTY_STATE)).toBe(false);
    expect(cameraInUse(EMPTY_STATE)).toBeNull();
  });
});

describe("adding cameras", () => {
  it("makes the first camera the one in use, with its film", () => {
    const { state, id } = addCamera(EMPTY_STATE, { name: "Old rangefinder", answers: compact, film: colour400 });
    expect(state.inUse).toBe(id);
    expect(cameraInUse(state)).toMatchObject({ name: "Old rangefinder", film: colour400 });
    expect(isSetUp(state)).toBe(true);
  });

  it("doesn't put a newly added camera in use: one may be added for later", () => {
    const first = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: colour400 });
    const second = addCamera(first.state, { name: "For later", answers: compact, film: null });
    expect(second.state.inUse).toBe(first.id);
    expect(second.id).not.toBe(first.id);
  });

  it("names an unnamed camera My camera, then Camera 2, Camera 3", () => {
    let state: AppState = EMPTY_STATE;
    for (const name of ["", "  ", "Dad's old camera", ""]) state = addCamera(state, { name, answers: compact, film: null }).state;
    expect(state.cameras.map((camera) => camera.name)).toEqual(["My camera", "Camera 2", "Dad's old camera", "Camera 4"]);
  });

  it("never repeats a default name", () => {
    let state = addCamera(EMPTY_STATE, { name: "Camera 2", answers: compact, film: null }).state;
    state = addCamera(state, { name: "", answers: compact, film: null }).state;
    expect(state.cameras.map((camera) => camera.name)).toEqual(["Camera 2", "Camera 3"]);
  });

  it("trims the name the user typed", () => {
    const { state } = addCamera(EMPTY_STATE, { name: "  Old rangefinder ", answers: compact, film: null });
    expect(state.cameras[0].name).toBe("Old rangefinder");
  });
});

describe("changing what is saved", () => {
  const { state: one, id } = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: colour400 });

  it("loads and finishes a roll of film in one camera (more in rolls.test.ts)", () => {
    const bw = { iso: 100, type: "bw_negative" } as const;
    expect(cameraInUse(loadRoll(one, id, bw, DAY))?.film).toMatchObject(bw);
    expect(cameraInUse(finishRoll(one, id, DAY))?.film).toBeNull();
  });

  it("switches the camera in use only to a camera that exists", () => {
    const { state: two, id: other } = addCamera(one, { name: "Other", answers: compact, film: null });
    expect(setInUse(two, other).inUse).toBe(other);
    expect(setInUse(two, "nope").inUse).toBe(id);
  });

  it("keeps how the camera is held and the last shot", () => {
    expect(setHold(one, "braced").hold).toBe("braced");
    expect(setLastShot(one, lastShot).lastShot).toEqual(lastShot);
  });

  it("never changes the state it was given", () => {
    const before = JSON.stringify(one);
    finishRoll(one, id, DAY);
    setHold(one, "surface");
    addCamera(one, { name: "", answers: compact, film: null });
    expect(JSON.stringify(one)).toBe(before);
  });
});

describe("a camera's page in Settings", () => {
  const { state: one, id: first } = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: colour400 });
  const { state: two, id: second } = addCamera(one, { name: "Spare", answers: compact, film: null });
  const { state: three, id: third } = addCamera(two, { name: "Old", answers: compact, film: null });
  const named = (state: AppState) => state.cameras.map((camera) => camera.name);

  it("renames a camera, trimmed, as the user types", () => {
    expect(named(renameCamera(two, second, "  Travel camera "))).toEqual(["Mine", "Travel camera"]);
  });

  it("gives an emptied name the default one, never repeating another camera's", () => {
    expect(named(renameCamera(one, first, "   "))).toEqual(["My camera"]);
    expect(named(renameCamera(two, second, ""))).toEqual(["Mine", "Camera 2"]);
  });

  it("changes one answer about the camera, and nothing else", () => {
    const changed = setAnswer(two, second, "focalLengthMm", "50");
    expect(changed.cameras[1].answers).toEqual({ ...compact, focalLengthMm: "50" });
    expect(changed.cameras[0]).toEqual(two.cameras[0]);
  });

  it("deletes a camera that isn't in use, leaving the one in use alone", () => {
    const after = deleteCamera(three, second);
    expect(named(after)).toEqual(["Mine", "Old"]);
    expect(after.inUse).toBe(first);
  });

  it("puts the first camera left in use when the one in use is deleted", () => {
    const after = deleteCamera(setInUse(three, second), second);
    expect(named(after)).toEqual(["Mine", "Old"]);
    expect(after.inUse).toBe(first);
    expect(deleteCamera(three, first).inUse).toBe(second);
  });

  it("returns to first setup when the last camera goes, keeping how it's held and its roll", () => {
    const after = deleteCamera(setLastShot(setHold(one, "braced"), lastShot), first, DAY);
    expect(after).toEqual({ ...EMPTY_STATE, hold: "braced", rolls: [expect.objectContaining({ cameraName: "Mine", finishedOn: DAY })] });
    expect(isSetUp(after)).toBe(false);
  });

  it("ignores a camera that doesn't exist", () => {
    expect(deleteCamera(two, "nope")).toEqual(two);
    expect(renameCamera(two, "nope", "X")).toEqual(two);
    expect(third).toBe("c3");
  });
});

describe("saving between visits", () => {
  it("reads back exactly what it saved, rolls and frames included", () => {
    const store = memoryStore();
    let state = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: colour400 }, DAY).state;
    state = addCamera(state, { name: "", answers: { ...compact, widestAperture: NOT_SURE }, film: null }, DAY).state;
    state = setLastShot(setHold(state, "surface"), lastShot);
    const shot = { set: { aperture: "4", shutter: "B", bulbSeconds: 2, focusM: null }, advice: lastShot.result, answers: lastShot.answers, hold: "surface", photo: "p1" } as const;
    state = recordFrame(state, { rollId: "r1", number: 1, note: "Anna", ...shot }, "2026-11-14T15:42").state;
    state = loadRoll(state, "c1", { iso: 100, type: "bw_negative", frames: 24, name: "Box" }, DAY);
    state = editFrame(state, "f1", { labels: ["good", "bit_light", "sun_flare"], developedNote: `Fine.\n${"Long note. ".repeat(80)}` });
    expect(state.frames[0].developedNote.length).toBeGreaterThan(800);
    saveState(store, state);
    expect(Object.keys(store.data)).toEqual([STORE_KEY]);
    expect(savedVersion(store)).toBe(2);
    expect(loadState(store)).toEqual(state);
  });

  it("starts empty when the saved data can't be read, keeping it aside rather than losing it", () => {
    for (const text of ["not json", JSON.stringify({ version: 99, cameras: [] }), "null"]) {
      const store = memoryStore({ [STORE_KEY]: text });
      expect(loadState(store)).toEqual(EMPTY_STATE);
      expect(store.data[`${STORE_KEY}.unreadable`]).toBe(text);
    }
    const store = memoryStore({ [STORE_KEY]: "new", [`${STORE_KEY}.unreadable`]: "older" });
    loadState(store);
    expect(store.data[`${STORE_KEY}.unreadable`]).toBe("older");
  });

  it("upgrades version 1 data, losing nothing: each camera's film becomes its roll of 36, loaded that day", () => {
    const store = memoryStore({
      [STORE_KEY]: JSON.stringify({
        version: 1,
        cameras: [
          { id: "c1", name: "Mine", answers: compact, film: colour400 },
          { id: "c2", name: "Spare", answers: compact, film: null },
          { id: "c3", name: "Old", answers: compact, film: { iso: 100, type: "bw_negative" } },
        ],
        inUse: "c2",
        hold: "braced",
        lastShot,
      }),
    });
    expect(savedVersion(store)).toBe(1);
    expect(loadState(store, DAY)).toEqual({
      cameras: [
        { id: "c1", name: "Mine", answers: compact, film: { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: DAY } },
        { id: "c2", name: "Spare", answers: compact, film: null },
        { id: "c3", name: "Old", answers: compact, film: { id: "r2", iso: 100, type: "bw_negative", frames: 36, name: "", loadedOn: DAY } },
      ],
      inUse: "c2",
      hold: "braced",
      lastShot,
      rolls: [],
      frames: [],
    });
    expect(savedVersion(memoryStore())).toBeNull();
  });

  it("drops a roll or a frame it can't read, and a frame whose roll is gone, keeping the rest", () => {
    const roll = { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: DAY };
    const finished = { ...roll, id: "r2", cameraId: "c9", cameraName: "Gone", finishedOn: DAY };
    const good = {
      id: "f1",
      rollId: "r1",
      number: 1,
      recordedAt: "2026-11-14T15:42",
      set: { aperture: "4", shutter: "1/250", bulbSeconds: null, focusM: 1 },
      advice: lastShot.result,
      answers: lastShot.answers,
      hold: "hand",
      note: "",
      photo: null,
      labels: ["good"],
      developedNote: "",
    };
    const saved = {
      version: 2,
      cameras: [
        { id: "c1", name: "Mine", answers: compact, film: roll },
        { id: "c2", name: "Odd film", answers: compact, film: { ...roll, id: "r3", frames: 0 } },
      ],
      inUse: "c1",
      hold: "hand",
      lastShot: null,
      rolls: [finished, { ...finished, id: "r4", finishedOn: "yesterday" }, "garbled"],
      frames: [
        good,
        { ...good, id: "f2", rollId: "r2", labels: ["good", "made_up"] },
        { ...good, id: "f3", rollId: "r3" },
        { ...good, id: "f4", number: 0 },
        { ...good, id: "f5", set: { ...good.set, aperture: "3" } },
      ],
    };
    const state = loadState(memoryStore({ [STORE_KEY]: JSON.stringify(saved) }));
    expect(state.cameras.map((camera) => [camera.id, camera.film?.id ?? null])).toEqual([
      ["c1", "r1"],
      ["c2", null],
    ]);
    expect(state.rolls.map((saved) => saved.id)).toEqual(["r2"]);
    expect(state.frames.map((saved) => [saved.id, saved.labels])).toEqual([
      ["f1", ["good"]],
      ["f2", ["good"]],
    ]);
  });

  it("drops a camera the engine doesn't know, and a film it can't use, and keeps the rest", () => {
    const saved = {
      version: 1,
      cameras: [
        { id: "c1", name: "Odd", answers: { ...compact, widestAperture: "1.2" }, film: colour400 },
        { id: "c2", name: "Fine", answers: compact, film: { iso: 100, type: "slide" } },
        { id: "c3", name: "Also fine", answers: compact, film: { iso: -5, type: "color_negative" } },
      ],
      inUse: "c1",
      hold: "on the moon",
      lastShot: { answers: "garbled" },
    };
    const state = loadState(memoryStore({ [STORE_KEY]: JSON.stringify(saved) }));
    expect(state.cameras.map((camera) => [camera.id, camera.film])).toEqual([
      ["c2", null],
      ["c3", null],
    ]);
    expect(state.inUse).toBe("c2");
    expect(state.hold).toBe("hand");
    expect(state.lastShot).toBeNull();
  });

  it("carries on without storage, as in a private tab", () => {
    expect(() => saveState(null, EMPTY_STATE)).not.toThrow();
    const full: Store = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    expect(saveState(full, EMPTY_STATE)).toBe(false);
  });
});

describe("every saved camera works with the engine", () => {
  it("gives the engine a camera it accepts, including Not sure answers", () => {
    const notSure: CameraAnswers = {
      widestAperture: NOT_SURE,
      smallestAperture: NOT_SURE,
      focalLengthMm: NOT_SURE,
      fastestShutter: NOT_SURE,
      slowestShutter: NOT_SURE,
      hasBulb: "no",
    };
    for (const answers of [compact, notSure]) {
      const result = recommend({
        film: colour400,
        light: { kind: "daylight", sky: "sun", scene: "open" },
        subject: "group",
        camera: answersToCamera(answers),
      });
      expect(isRefusal(result)).toBe(false);
    }
  });
});
