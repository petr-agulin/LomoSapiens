import { describe, expect, it } from "vitest";
import cameraSet from "../../../testset/engine/cameras.json" with { type: "json" };
import { NOT_SURE, type CameraAnswers } from "./cameraAnswers.ts";
import { isRefusal, recommend } from "./engine/index.ts";
import type { Camera } from "./engine/types.ts";
import {
  distanceText,
  isComplete,
  lowSunApplies,
  newShotDraft,
  parseDistance,
  pickLight,
  pickSubject,
  stormApplies,
  sunBehindApplies,
  toAnswers,
  toConditions,
  toggle,
  usualDistanceText,
  type ShotDraft,
} from "./shot.ts";
import type { LastShot, LightChoice, SavedCamera } from "./store.ts";

const compactCamera = (cameraSet.cameras as Record<string, Camera>).compact;
const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const saved: SavedCamera = { id: "c1", name: "Mine", answers: compact, film: { id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-14" } };

const day = (sky: "sun" | "sun_haze" | "sun_behind_clouds" | "overcast" | "storm", place: "snow_sand" | "open" | "under_trees" = "open"): LightChoice => ({ group: "day", sky, place });
const evening = (lowlight: "sun_low" | "sun_just_set" | "dusk" | "street_night" | "floodlit"): LightChoice => ({ group: "evening", lowlight });
const indoors = (indoor: "window" | "room" | "lamps" | "office"): LightChoice => ({ group: "indoors", indoor });

describe("the switches show only when they apply", () => {
  it("Low sun: every day sky, and the two daylight indoor options", () => {
    for (const sky of ["sun", "sun_haze", "sun_behind_clouds", "overcast", "storm"] as const) expect(lowSunApplies(day(sky))).toBe(true);
    expect(lowSunApplies(indoors("window"))).toBe(true);
    expect(lowSunApplies(indoors("room"))).toBe(true);
    for (const light of [indoors("lamps"), indoors("office"), evening("sun_low"), evening("dusk"), null]) expect(lowSunApplies(light)).toBe(false);
  });

  it("Storm clouds outside: only the two daylight indoor options", () => {
    expect(stormApplies(indoors("window"))).toBe(true);
    expect(stormApplies(indoors("room"))).toBe(true);
    for (const light of [indoors("lamps"), indoors("office"), day("storm"), evening("dusk"), null]) expect(stormApplies(light)).toBe(false);
  });

  it("Sun behind the person: a portrait or two people, with the sun in view", () => {
    for (const light of [day("sun"), day("sun_haze"), day("sun_behind_clouds"), evening("sun_low")]) {
      expect(sunBehindApplies(light, "portrait")).toBe(true);
      expect(sunBehindApplies(light, "two_people")).toBe(true);
      expect(sunBehindApplies(light, "group")).toBe(false);
      expect(sunBehindApplies(light, "landscape")).toBe(false);
    }
    for (const light of [day("overcast"), day("storm"), evening("sun_just_set"), indoors("window")]) {
      expect(sunBehindApplies(light, "portrait")).toBe(false);
    }
  });
});

describe("a new shot starts from the last one", () => {
  const last: LastShot = {
    answers: { light: day("sun_behind_clouds"), lowSun: true, stormOutside: false, subject: "portrait", distanceM: 1.2, goal: "sharp", sunBehind: false },
    result: { aperture: "8", shutter: "1/60", bulbSeconds: null, focus: { meters: 1.2, source: "given" } },
  };

  it("starts empty on the first shot", () => {
    const draft = newShotDraft(null);
    expect(draft.light).toBeNull();
    expect(draft.subject).toBeNull();
    expect([draft.lowSun, draft.stormOutside, draft.sunBehind]).toEqual([false, false, false]);
    expect(isComplete(draft)).toBe(false);
  });

  it("picks every answer of the last shot, and marks the switches that are on because of it", () => {
    const draft = newShotDraft(last);
    expect(toAnswers(draft)).toEqual(last.answers);
    expect(draft.fromLast).toEqual({ lowSun: true, stormOutside: false, sunBehind: false });
  });

  it("stops saying a switch is on from the last shot once the user touches it", () => {
    const draft = newShotDraft(last);
    const touched = toggle(toggle(draft, "lowSun"), "lowSun");
    expect(touched.lowSun).toBe(true);
    expect(touched.fromLast.lowSun).toBe(false);
  });
});

describe("answering", () => {
  const start = newShotDraft(null);

  it("needs a light, a subject and, for Something else, a distance", () => {
    let draft: ShotDraft = pickLight(start, day("sun"));
    expect(isComplete(draft)).toBe(false);
    draft = pickSubject(draft, "group");
    expect(isComplete(draft)).toBe(true);
    expect(isComplete(pickSubject(draft, "other"))).toBe(false);
    expect(isComplete(pickSubject(draft, "other", 2.5))).toBe(true);
  });

  it("resets the goal and the distance to the subject's usual ones when the subject changes", () => {
    let draft = pickSubject(pickLight(start, day("sun")), "portrait");
    expect(draft.goal).toBe("blur");
    draft = { ...draft, goal: "moving", distanceM: 2 };
    draft = pickSubject(draft, "group");
    expect(draft.goal).toBe("sharp");
    expect(draft.distanceM).toBeNull();
  });

  it("keeps a switch's value while its light hides it, but never sends it to the engine", () => {
    let draft = toggle(pickSubject(pickLight(start, day("sun")), "group"), "lowSun");
    draft = pickLight(draft, evening("street_night"));
    expect(draft.lowSun).toBe(true);
    expect(toConditions(toAnswers(draft)!, saved, "hand")?.lowSun).toBe(false);
  });
});

describe("the engine's input", () => {
  const conditions = (light: LightChoice, extra: Partial<ShotDraft> = {}) => {
    const draft = { ...pickSubject(pickLight(newShotDraft(null), light), "portrait"), ...extra };
    return toConditions(toAnswers(draft)!, saved, "braced")!;
  };

  it("maps each group to the engine's own lights", () => {
    expect(conditions(day("overcast", "under_trees")).light).toEqual({ kind: "daylight", sky: "overcast", scene: "under_trees" });
    expect(conditions(evening("street_night")).light).toEqual({ kind: "lowlight", lowlight: "street_night" });
    expect(conditions(indoors("lamps")).light).toEqual({ kind: "indoors", indoor: "lamps", sky: null });
  });

  it("turns Storm clouds outside into the indoor sky, for the window options only", () => {
    expect(conditions(indoors("window"), { stormOutside: true }).light).toEqual({ kind: "indoors", indoor: "window", sky: "storm" });
    expect(conditions(indoors("office"), { stormOutside: true }).light).toEqual({ kind: "indoors", indoor: "office", sky: null });
  });

  it("carries the film, the camera, how it's held, the goal and a typed distance", () => {
    const c = conditions(day("sun"), { goal: "moving", distanceM: 3, sunBehind: true });
    expect(c).toMatchObject({ film: { iso: 400, type: "color_negative" }, support: "braced", goal: "moving", subjectDistanceM: 3, sunBehindSubject: true, subject: "portrait" });
    expect(c.camera).toEqual(compactCamera);
  });

  it("gives nothing without a film: an empty camera asks for a roll first", () => {
    const draft = pickSubject(pickLight(newShotDraft(null), day("sun")), "group");
    expect(toConditions(toAnswers(draft)!, { ...saved, film: null }, "hand")).toBeNull();
  });

  it("gives the worked example its known result: f/4, 1/250", () => {
    const draft = toggle(pickSubject(pickLight(newShotDraft(null), day("sun_behind_clouds")), "portrait"), "lowSun");
    const result = recommend(toConditions(toAnswers(draft)!, saved, "hand")!);
    if (isRefusal(result)) throw new Error(result.refused);
    expect([result.final.aperture, result.final.shutter]).toEqual(["4", "1/250"]);
  });
});

describe("distances", () => {
  it("accepts a comma or a point, and shows a point", () => {
    expect(parseDistance("2,5")).toBe(2.5);
    expect(parseDistance("2.5")).toBe(2.5);
    expect(parseDistance(" 4 ")).toBe(4);
    expect(parseDistance("0.8")).toBe(0.8);
    expect(distanceText(2.5)).toBe("2.5 m");
  });

  it("refuses anything that isn't a distance above 0", () => {
    for (const typed of ["", "0", "0,0", "-1", "abc", "2.5.1", "1,234", "10000"]) expect(parseDistance(typed), typed).toBeNull();
  });

  it("gives the usual distance for the lens, or says the landscape focus keeps ∞ sharp", () => {
    expect(usualDistanceText(saved, "portrait")).toBe("About 1 m");
    expect(usualDistanceText(saved, "group")).toBe("About 4 m");
    expect(usualDistanceText({ ...saved, answers: { ...compact, focalLengthMm: "50" } }, "portrait")).toBe("About 1.3 m");
    expect(usualDistanceText(saved, "landscape")).toBe("Focus keeps ∞ sharp");
    expect(usualDistanceText({ ...saved, answers: { ...compact, focalLengthMm: NOT_SURE } }, "two_people")).toBe("About 1.8 m");
  });
});
