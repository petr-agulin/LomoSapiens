// Recording a shot: the form's start, the frame it
// makes, and how far the settings set are from the advice, in steps of light.
import { describe, expect, it } from "vitest";
import {
  adviceAsSet,
  differenceText,
  differsFromAdvice,
  lightDifference,
  parseFrameNumber,
  recordDraftFrom,
  recordDraftOfFrame,
  settingsText,
  toFrameDraft,
  type RecordDraft,
} from "./record.ts";
import type { Frame, ShotAnswers, ShotSummary } from "./store.ts";

const advice: ShotSummary = { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } };
const answers: ShotAnswers = { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "other", distanceM: 3, goal: "sharp", sunBehind: false };
const set = (more: Partial<RecordDraft> = {}): RecordDraft => ({ ...recordDraftFrom(advice, 12), ...more });

describe("the record form's start", () => {
  it("starts from the advice, with the next frame number and no note", () => {
    expect(recordDraftFrom(advice, 12)).toEqual({ number: "12", aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3, note: "", photo: null });
  });

  it("takes the photo just taken, for a frame recorded straight from the result", () => {
    expect(recordDraftFrom(advice, 13, "p-1").photo).toBe("p-1");
    expect(toFrameDraft(recordDraftFrom(advice, 13, "p-1"), "r1", advice, answers, "hand")?.photo).toBe("p-1");
  });

  it("keeps B's seconds and a focus at ∞ from the advice", () => {
    const bulb: ShotSummary = { aperture: "2.8", shutter: "B", bulbSeconds: 4, focus: { meters: null, source: "landscape" } };
    expect(recordDraftFrom(bulb, 1)).toMatchObject({ shutter: "B", bulbSeconds: 4, focusM: null });
  });
});

describe("the frame number, typed", () => {
  it("takes a whole number from 1 to 99, spaces trimmed", () => {
    expect(parseFrameNumber(" 12 ")).toBe(12);
    expect(parseFrameNumber("1")).toBe(1);
    expect(parseFrameNumber("99")).toBe(99);
    for (const typed of ["", "0", "100", "1.5", "-2", "twelve"]) expect(parseFrameNumber(typed), typed).toBeNull();
  });
});

describe("the frame the form makes", () => {
  it("keeps what was set, the advice as given, the shot, the hold and the note", () => {
    expect(toFrameDraft(set({ aperture: "5.6", note: " Anna " }), "r1", advice, answers, "braced")).toEqual({
      rollId: "r1",
      number: 12,
      set: { aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: 3 },
      advice,
      answers,
      hold: "braced",
      note: "Anna",
      photo: null,
    });
  });

  it("keeps B's seconds only with B", () => {
    expect(toFrameDraft(set({ shutter: "B", bulbSeconds: 2 }), "r1", advice, answers, "surface")?.set).toMatchObject({ shutter: "B", bulbSeconds: 2 });
    expect(toFrameDraft(set({ shutter: "1/60", bulbSeconds: 2 }), "r1", advice, answers, "hand")?.set.bulbSeconds).toBeNull();
  });

  it("makes none while the frame number typed isn't valid, or B has no seconds", () => {
    expect(toFrameDraft(set({ number: "0" }), "r1", advice, answers, "hand")).toBeNull();
    expect(toFrameDraft(set({ shutter: "B", bulbSeconds: null }), "r1", advice, answers, "hand")).toBeNull();
  });
});

describe("how far the settings are from the advice, in steps of light", () => {
  const diff = (more: Partial<RecordDraft>) => differenceText(lightDifference(toFrameDraft(set(more), "r1", advice, answers, "hand")!.set, advice));

  it("says As advised only when nothing was changed, and Same light when only the focus was", () => {
    expect(diff({})).toBe("As advised");
    expect(diff({ focusM: 5 })).toBe("Same light as advised");
    expect(diff({ focusM: null })).toBe("Same light as advised");
  });

  it("counts each aperture mark or shutter speed as one step: a wider aperture or a slower speed gives more light", () => {
    expect(diff({ aperture: "5.6" })).toBe("1 step more light than advised");
    expect(diff({ aperture: "4" })).toBe("2 steps more light than advised");
    expect(diff({ aperture: "16" })).toBe("2 steps less light than advised");
    expect(diff({ shutter: "1/250" })).toBe("1 step less light than advised");
    expect(diff({ shutter: "1/30" })).toBe("2 steps more light than advised");
  });

  it("says when a different pair gives the same light", () => {
    expect(diff({ aperture: "5.6", shutter: "1/250" })).toBe("Same light as advised");
  });

  it("counts B by its seconds, about to the half step when the time isn't a doubling", () => {
    // 1/125 is S 7; B for 1 s is S 0: 7 steps more light. 1/8 s is S 3.
    expect(diff({ shutter: "B", bulbSeconds: 1 })).toBe("7 steps more light than advised");
    const bulb: ShotSummary = { aperture: "2.8", shutter: "B", bulbSeconds: 4, focus: { meters: 1, source: "default" } };
    const against = (seconds: number) => differenceText(lightDifference({ aperture: "2.8", shutter: "B", bulbSeconds: seconds, focusM: 1 }, bulb));
    expect(against(4)).toBe("As advised");
    expect(against(8)).toBe("1 step more light than advised");
    expect(against(3)).toBe("About half a step less light than advised");
    expect(against(6)).toBe("About half a step more light than advised");
    expect(against(11)).toBe("About 1½ steps more light than advised");
    expect(against(4.2)).toBe("About the same light as advised");
  });
});

describe("a frame's settings in one line", () => {
  it("writes them as the camera marks them, B with its seconds and ∞ for infinity", () => {
    expect(settingsText({ aperture: "5.6", shutter: "1/125", bulbSeconds: null, focusM: 3 })).toBe("f/5.6 · 1/125 · 3 m");
    expect(settingsText({ aperture: "2.8", shutter: "B", bulbSeconds: 4, focusM: null })).toBe("f/2.8 · B 4 s · ∞");
    expect(settingsText({ aperture: "16", shutter: "1", bulbSeconds: null, focusM: 2.5 })).toBe("f/16 · 1 s · 2.5 m");
  });
});

describe("a recorded frame, opened again", () => {
  const frame: Frame = {
    id: "f1",
    rollId: "r1",
    number: 12,
    recordedAt: "2026-11-14T15:42",
    set: { aperture: "5.6", shutter: "B", bulbSeconds: 4, focusM: null },
    advice,
    answers,
    hold: "hand",
    note: "Anna",
    photo: null,
    labels: [],
    developedNote: "",
  };

  it("opens the form on what was set, its number and its note", () => {
    expect(recordDraftOfFrame(frame)).toEqual({ number: "12", aperture: "5.6", shutter: "B", bulbSeconds: 4, focusM: null, note: "Anna", photo: null });
  });

  it("writes the advice like the frame's own settings, and knows when they differ", () => {
    expect(settingsText(adviceAsSet(advice))).toBe("f/8 · 1/125 · 3 m");
    expect(differsFromAdvice(frame.set, advice)).toBe(true);
    expect(differsFromAdvice(adviceAsSet(advice), advice)).toBe(false);
  });
});
