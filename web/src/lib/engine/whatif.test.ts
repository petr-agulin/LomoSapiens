import { describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import { evaluate, recommend, scanApertures, scanShutters } from "./index.ts";
import type { Camera, Conditions, Recommendation, WhatIf } from "./index.ts";

const cameras = cameraSet.cameras as Record<string, Camera>;

// The worked example on the compact test camera: the recommendation is f/4, 1/250, focus at 1 m.
const portrait: Conditions = {
  film: { iso: 400, type: "color_negative" },
  light: { kind: "daylight", sky: "sun_behind_clouds", scene: "open" },
  subject: "portrait",
  lowSun: true,
  camera: cameras.compact,
};

const whatIf = (options: Parameters<typeof evaluate>[1]) => evaluate(portrait, options) as WhatIf;
const codes = (result: WhatIf) => result.warnings.map((warning) => warning.code);

describe("evaluate", () => {
  it("naming nothing returns the recommendation itself, with no change in light", () => {
    const recommendation = recommend(portrait) as Recommendation;
    const result = whatIf({});
    expect(result.aperture).toBe("4");
    expect(result.shutter).toBe("1/250");
    expect(result.stepsVsRecommendation).toBe(0);
    expect(result.focus).toEqual(recommendation.final.focus);
    expect(result.sharpZone).toEqual(recommendation.final.sharpZone);
    expect(result.shakeRisk).toBe(recommendation.final.shakeRisk);
    expect(result.warnings).toEqual(recommendation.warnings);
  });

  it("opening the aperture from f/4 to f/2.8 gives 1 step more light and a thinner sharp zone", () => {
    const result = whatIf({ aperture: "2.8" });
    expect(result.stepsVsRecommendation).toBe(1);
    expect(result.sharpZone).toEqual({ nearM: 0.95, farM: 1.05 });
  });

  it("closing to f/8 gives 2 steps less light and warns that blur is limited", () => {
    const result = whatIf({ aperture: "8" });
    expect(result.stepsVsRecommendation).toBe(-2);
    expect(codes(result)).toContain("blur_limited");
  });

  it("a slower shutter gives more light and more shake risk", () => {
    const result = whatIf({ shutter: "1/60" });
    expect(result.stepsVsRecommendation).toBe(2);
    expect(result.shakeRisk).toBe("medium");
  });

  it("warns about people at 1/30 and 1/15", () => {
    expect(codes(whatIf({ shutter: "1/30" }))).toContain("people_hold_still");
    expect(codes(whatIf({ shutter: "1/15" }))).toContain("people_not_recommended");
    expect(whatIf({ shutter: "1/15" }).shakeRisk).toBe("very_high");
  });

  it("works out B from the seconds, with 1 second as the default", () => {
    const twoSeconds = whatIf({ shutter: "B", bulbSeconds: 2 });
    expect(twoSeconds.stepsVsRecommendation).toBe(9);
    expect(twoSeconds.warnings).toContainEqual({ code: "b_counted_seconds", seconds: 2 });
    expect(codes(twoSeconds)).toContain("long_exposure");
    expect(codes(twoSeconds)).toContain("people_not_recommended");

    const oneSecond = whatIf({ shutter: "B" });
    expect(oneSecond.bulbSeconds).toBe(1);
    expect(oneSecond.stepsVsRecommendation).toBe(8);
    expect(codes(oneSecond)).not.toContain("long_exposure");
  });

  it("focus at infinity reaches from the hyperfocal distance onward", () => {
    const result = whatIf({ focusM: null });
    expect(result.focus).toEqual({ meters: null, source: "given" });
    expect(result.sharpZone).toEqual({ nearM: 13.37, farM: null });
    expect(codes(result)).not.toContain("focus_critical");
  });

  it("a distance below 1 m stays as given, and asks to check the lens", () => {
    const result = whatIf({ focusM: 0.7 });
    expect(result.focus).toEqual({ meters: 0.7, source: "given" });
    expect(codes(result)).toContain("close_focus");
  });

  it("refuses a setting the camera doesn't have", () => {
    expect(evaluate(portrait, { aperture: "1.4" })).toEqual({ refused: "not_on_camera" });
    expect(evaluate(portrait, { shutter: "1/500" })).toEqual({ refused: "not_on_camera" });
    expect(evaluate({ ...portrait, camera: cameras.half }, { shutter: "B" })).toEqual({ refused: "not_on_camera" });
  });

  it("passes on a refusal from the recommendation", () => {
    const slide: Conditions = { ...portrait, film: { iso: 100, type: "slide" } };
    expect(evaluate(slide, {})).toEqual({ refused: "unsupported_film" });
    expect(scanApertures(slide, "1/250")).toEqual({ refused: "unsupported_film" });
    expect(scanShutters(slide, "4")).toEqual({ refused: "unsupported_film" });
  });
});

describe("scans", () => {
  it("scanApertures covers every aperture on the camera at the named shutter", () => {
    const rows = scanApertures(portrait, "1/250") as WhatIf[];
    expect(rows.map((row) => [row.aperture, row.stepsVsRecommendation])).toEqual([
      ["2.8", 1],
      ["4", 0],
      ["5.6", -1],
      ["8", -2],
      ["11", -3],
      ["16", -4],
      ["22", -5],
    ]);
  });

  it("scanShutters covers every shutter on the camera, including B at 1 and 2 seconds", () => {
    const rows = scanShutters(portrait, "4") as WhatIf[];
    expect(rows.map((row) => [row.shutter, row.bulbSeconds, row.stepsVsRecommendation])).toEqual([
      ["B", 2, 9],
      ["B", 1, 8],
      ["1/15", null, 4],
      ["1/30", null, 3],
      ["1/60", null, 2],
      ["1/125", null, 1],
      ["1/250", null, 0],
    ]);
  });

  it("scans follow the camera: the next camera has 1 s to 1/1000", () => {
    const next = { ...portrait, camera: cameras.fast };
    const shutters = (scanShutters(next, "2") as WhatIf[]).map((row) => row.shutter);
    expect(shutters).toEqual(["B", "B", "1", "1/2", "1/4", "1/8", "1/15", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"]);
    const apertures = (scanApertures(next, "1/1000") as WhatIf[]).map((row) => row.aperture);
    expect(apertures).toEqual(["1.4", "2", "2.8", "4", "5.6", "8", "11", "16", "22"]);
  });
});
