import { describe, expect, it } from "vitest";
import { answersToCamera, NOT_SURE } from "./cameraAnswers.ts";
import { FASTEST_SHUTTERS, SLOWEST_SHUTTERS, SMALLEST_APERTURES, WIDEST_APERTURES, isRefusal, recommend } from "./engine/index.ts";
import {
  CAMERA_QUESTIONS,
  cameraSpec,
  draftRoll,
  filmLabel,
  filmLine,
  newDraft,
  optionsFor,
  parseFrames,
  parseIso,
  rollDraft,
  shownValue,
  type SetupDraft,
} from "./setup.ts";

describe("a new camera's starting answers", () => {
  const draft = newDraft();

  it("start at Not sure, so nothing is claimed about a camera the user hasn't read yet", () => {
    for (const key of ["widestAperture", "smallestAperture", "focalLengthMm", "fastestShutter", "slowestShutter"] as const) {
      expect(draft.answers[key]).toBe(NOT_SURE);
    }
  });

  it("start without B, the safe side: the app never suggests B on a camera that may not have it", () => {
    expect(draft.answers.hasBulb).toBe("no");
  });

  it("start with a roll of 36 frames of ISO 400 colour film, and empty names, as in the design", () => {
    expect(draftRoll(draft)).toEqual({ iso: 400, type: "color_negative", frames: 36, name: "" });
    expect(draft.name).toBe("");
  });

  it("give the engine a camera it accepts straight away", () => {
    const result = recommend({
      film: { iso: 400, type: "color_negative" },
      light: { kind: "daylight", sky: "sun", scene: "open" },
      subject: "group",
      camera: answersToCamera(draft.answers),
    });
    expect(isRefusal(result)).toBe(false);
  });
});

describe("the camera questions", () => {
  it("are the six questions, lens first, then the shutter speed dial", () => {
    expect(CAMERA_QUESTIONS.map((question) => question.key)).toEqual([
      "widestAperture",
      "smallestAperture",
      "focalLengthMm",
      "fastestShutter",
      "slowestShutter",
      "hasBulb",
    ]);
  });

  it("offer exactly the engine's values, plus Not sure on every question but B", () => {
    const values = (key: Parameters<typeof optionsFor>[0]) => optionsFor(key).map((option) => option.value);
    expect(values("widestAperture")).toEqual([...WIDEST_APERTURES, NOT_SURE]);
    expect(values("smallestAperture")).toEqual([...SMALLEST_APERTURES, NOT_SURE]);
    expect(values("focalLengthMm")).toEqual(["28", "35", "38", "40", "45", "50", "55", "58", NOT_SURE]);
    expect(values("fastestShutter")).toEqual([...FASTEST_SHUTTERS, NOT_SURE]);
    expect(values("slowestShutter")).toEqual([...SLOWEST_SHUTTERS, NOT_SURE]);
    expect(values("hasBulb")).toEqual(["yes", "no"]);
  });

  it("write each value as the camera marks it: a small f/, 1/ or mm, and a big number", () => {
    expect(shownValue("widestAperture", "2.8")).toEqual({ before: "f/", big: "2.8", after: "" });
    expect(shownValue("focalLengthMm", "40")).toEqual({ before: "", big: "40", after: "mm" });
    expect(shownValue("fastestShutter", "1/250")).toEqual({ before: "1/", big: "250", after: "" });
    expect(shownValue("slowestShutter", "1")).toEqual({ before: "", big: "1", after: "s" });
    expect(shownValue("hasBulb", "yes")).toEqual({ before: "", big: "Yes", after: "" });
    expect(shownValue("smallestAperture", NOT_SURE)).toEqual({ before: "", big: "Not sure", after: "" });
  });
});

describe("Settings", () => {
  const compact = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" } as const;

  it("sums a camera up in one line, as on its card: lens, widest aperture, then the dial", () => {
    expect(cameraSpec(compact)).toBe("40 mm · f/2.8 · 1/15 to 1/250");
    expect(cameraSpec({ ...compact, slowestShutter: "1", fastestShutter: "1/1000" })).toBe("40 mm · f/2.8 · 1 s to 1/1000");
  });

  it("uses what a Not sure answer counts as, as the app does", () => {
    expect(cameraSpec(newDraft().answers)).toBe("50 mm · f/4 · 1/30 to 1/250");
  });

  it("names the film on a card, or says there is none", () => {
    expect(filmLine({ iso: 400, type: "color_negative" })).toBe("ISO 400 colour");
    expect(filmLine({ iso: 200, type: "bw_negative" })).toBe("ISO 200 black and white");
    expect(filmLine(null)).toBe("No film loaded");
  });

  const roll = (more: object) => ({ id: "r1", iso: 400, type: "color_negative" as const, frames: 36, name: "", loadedOn: "2026-11-14", ...more });

  it("opens Roll details on the roll that's loaded, a tile when there is one, typed when not", () => {
    expect(rollDraft("Mine", roll({ type: "bw_negative", name: "Box" }))).toMatchObject({ name: "Mine", speed: "400", otherSpeed: "", type: "bw_negative", frames: "36", otherFrames: "", rollName: "Box" });
    expect(rollDraft("Mine", roll({ iso: 125, frames: 27 }))).toMatchObject({ speed: "other", otherSpeed: "125", frames: "other", otherFrames: "27" });
    expect(draftRoll(rollDraft("Mine", roll({ iso: 125, frames: 24, name: "Box" })))).toEqual({ iso: 125, type: "color_negative", frames: 24, name: "Box" });
  });

  it("starts an empty camera's roll at 36 frames of ISO 400 colour, as in first setup", () => {
    expect(draftRoll(rollDraft("Mine", null))).toEqual({ iso: 400, type: "color_negative", frames: 36, name: "" });
  });
});

describe("the film", () => {
  const draft = (changes: Partial<SetupDraft>): SetupDraft => ({ ...newDraft(), ...changes });

  it("takes a tile, or a typed speed instead", () => {
    expect(draftRoll(draft({ speed: "800" }))).toMatchObject({ iso: 800, type: "color_negative" });
    expect(draftRoll(draft({ speed: "other", otherSpeed: "125", type: "bw_negative" }))).toMatchObject({ iso: 125, type: "bw_negative" });
  });

  it("takes 24 or 36 frames, or a typed number from 1 to 99", () => {
    expect(draftRoll(draft({ frames: "24" }))?.frames).toBe(24);
    expect(draftRoll(draft({ frames: "other", otherFrames: " 27 " }))?.frames).toBe(27);
    for (const typed of ["", "0", "100", "1.5", "-3", "twelve"]) {
      expect(parseFrames(typed), typed).toBeNull();
      expect(draftRoll(draft({ frames: "other", otherFrames: typed })), typed).toBeNull();
    }
    expect(parseFrames("1")).toBe(1);
    expect(parseFrames("99")).toBe(99);
  });

  it("keeps the roll's name, trimmed, and none when it's left empty", () => {
    expect(draftRoll(draft({ rollName: "  Box print " }))?.name).toBe("Box print");
    expect(draftRoll(draft({ rollName: "   " }))?.name).toBe("");
  });

  it("refuses a typed speed that isn't a number above 0", () => {
    for (const typed of ["", "0", "00", "-5", "abc", "1.5"]) {
      expect(parseIso(typed), typed).toBeNull();
      expect(draftRoll(draft({ speed: "other", otherSpeed: typed })), typed).toBeNull();
    }
    expect(parseIso(" 3200 ")).toBe(3200);
  });

  it("reads short in the pill: speed, then colour or B&W, or No film", () => {
    expect(filmLabel({ iso: 400, type: "color_negative" })).toBe("400 colour");
    expect(filmLabel({ iso: 100, type: "bw_negative" })).toBe("100 B&W");
    expect(filmLabel(null)).toBe("No film");
  });
});
