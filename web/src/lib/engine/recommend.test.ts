import { describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import { recommend, shakeRisk } from "./index.ts";
import type { Camera, Conditions, Recommendation } from "./index.ts";

// Behaviour from ENGINE_SPEC that the golden table doesn't spell out.
// Every expected value is worked out by hand from the spec.
const cameras = cameraSet.cameras as Record<string, Camera>;
const base: Conditions = {
  film: { iso: 400, type: "color_negative" },
  light: { kind: "daylight", sky: "sun", scene: "open" },
  subject: "group",
  camera: cameras.compact,
};

const ask = (changes: Partial<Conditions>) => recommend({ ...base, ...changes }) as Recommendation;
const iso = (value: number) => ({ film: { iso: value, type: "color_negative" as const } });
const daylight = (sky: "sun" | "sun_haze" | "sun_behind_clouds" | "overcast" | "storm", scene: "snow_sand" | "open" | "under_trees") => ({
  light: { kind: "daylight" as const, sky, scene },
});
const low = (lowlight: "sun_low" | "sun_just_set" | "dusk" | "street_night" | "home_lamps" | "floodlit") => ({
  light: { kind: "lowlight" as const, lowlight },
});
const codes = (result: Recommendation) => result.warnings.map((warning) => warning.code);

describe("refusals", () => {
  it("refuses subject other with no distance", () => {
    expect(recommend({ ...base, subject: "other" })).toEqual({ refused: "missing_distance" });
  });

  it("gives advice for any film speed, however slow", () => {
    expect(ask(iso(6)).final).toBeDefined();
  });
});

describe("the reasoning steps", () => {
  it("shows the light for the sky and scene, then each change", () => {
    expect(ask({ ...daylight("sun", "under_trees") }).steps).toEqual([
      { kind: "daylight_value", aperture: "11", shutter: "1/250" },
      { kind: "shade", stops: 2, aperture: "5.6", shutter: "1/250" },
      { kind: "same_light_for_goal", aperture: "8", shutter: "1/125" },
    ]);
  });

  it("moves to a shutter the support allows", () => {
    expect(ask({ ...daylight("storm", "open"), support: "hand" }).steps).toEqual([
      { kind: "daylight_value", aperture: "16", shutter: "1/15" },
      { kind: "same_light_for_support", aperture: "8", shutter: "1/60" },
    ]);
  });

  it("starts from a faster shutter when the light needs more than the smallest aperture", () => {
    expect(ask({ ...iso(800), ...daylight("overcast", "snow_sand"), support: "hand" }).steps).toEqual([
      { kind: "daylight_value", aperture: "22", shutter: "1/60" },
      { kind: "same_light_for_goal", aperture: "11", shutter: "1/250" },
    ]);
  });

  it("reports hitting the camera's limit", () => {
    expect(ask({ ...iso(800), ...daylight("sun", "snow_sand") }).steps).toEqual([
      { kind: "daylight_value", aperture: null, shutter: null },
      { kind: "least_light_limit", stops: 1, aperture: "22", shutter: "1/250" },
    ]);
  });

  it("shows no settings for a step the camera has no setting for, then finds one on B", () => {
    const result = ask({ ...iso(25), ...daylight("storm", "under_trees"), lowSun: true });
    expect(result.steps).toEqual([
      { kind: "daylight_value", aperture: "2.8", shutter: "1/15" },
      { kind: "low_sun", stops: 1, aperture: null, shutter: null },
      { kind: "same_light_for_support", aperture: "8", shutter: "B", bulbSeconds: 1 },
    ]);
    expect(result.final).toMatchObject({ aperture: "8", shutter: "B", bulbSeconds: 1, support: "surface" });
  });

  it("uses a timed second where the LOMO needs B", () => {
    const shot = { ...iso(100), ...low("floodlit") };
    expect(ask(shot).final).toMatchObject({ aperture: "2.8", shutter: "B", bulbSeconds: 1, support: "surface" });
    const result = recommend({ ...base, ...shot, camera: cameras.fast }) as Recommendation;
    expect(result.final).toMatchObject({ aperture: "2.8", shutter: "1", bulbSeconds: null, support: "surface" });
  });

  it("reports falling short in daylight", () => {
    const result = ask({ ...iso(25), ...daylight("storm", "under_trees"), support: "hand" });
    expect(result.steps).toEqual([
      { kind: "daylight_value", aperture: "2.8", shutter: "1/15" },
      { kind: "not_enough_light", stops: 2, aperture: "2.8", shutter: "1/60" },
    ]);
    expect(result.warnings).toContainEqual({ code: "not_enough_light", stops: 2, suggestSupport: "surface" });
  });

  it("starts low light from the published value", () => {
    expect(ask(low("sun_just_set")).steps).toEqual([{ kind: "published_value", aperture: "5.6", shutter: "1/60" }]);
    expect(ask({ ...low("floodlit") }).steps).toEqual([
      { kind: "published_value", aperture: "5.6", shutter: "B", bulbSeconds: 1 },
    ]);
  });

  it("shows no published settings when the support can't reach them", () => {
    expect(ask({ ...low("home_lamps"), support: "hand" }).steps).toEqual([
      { kind: "published_value", aperture: null, shutter: null },
      { kind: "not_enough_light", stops: 2, aperture: "2.8", shutter: "1/60" },
    ]);
  });

  it("explains dusk, which has no published value", () => {
    expect(ask(low("dusk")).steps).toEqual([{ kind: "dusk_no_value", aperture: "2.8", shutter: "1/60" }]);
  });

  it("keeps dusk at f/2.8 on a faster lens, so unknown light never gets an extreme exposure", () => {
    const result = recommend({ ...base, ...low("dusk"), camera: cameras.fast, support: "surface" }) as Recommendation;
    expect(result.final).toMatchObject({ aperture: "2.8", shutter: "1/15" });
  });
});

describe("indoors", () => {
  const indoors = (indoor: "window" | "room" | "lamps" | "office", sky?: "sun" | "storm") => ({
    light: { kind: "indoors" as const, indoor, ...(sky ? { sky } : {}) },
  });

  it("the window and room values are estimates worked out for this app", () => {
    expect(ask(indoors("window", "sun")).steps).toEqual([{ kind: "indoor_estimate", aperture: "2.8", shutter: "1/60" }]);
    expect(ask(indoors("room", "sun")).steps).toEqual([{ kind: "indoor_estimate", aperture: "2.8", shutter: "1/30" }]);
  });

  it("the lamps and office values come from the published table", () => {
    expect(ask(indoors("lamps")).steps).toEqual([{ kind: "published_value", aperture: "2.8", shutter: "1/15" }]);
    expect(ask(indoors("office")).steps).toEqual([{ kind: "published_value", aperture: "2.8", shutter: "1/60" }]);
  });

  it("shows storm clouds and low sun as their own steps", () => {
    expect(ask({ ...indoors("window", "storm"), lowSun: true }).steps).toEqual([
      { kind: "indoor_estimate", aperture: "2.8", shutter: "1/60" },
      { kind: "dark_sky", stops: 1, aperture: "2.8", shutter: "1/30" },
      { kind: "low_sun", stops: 1, aperture: "2.8", shutter: "1/15" },
    ]);
  });

  it("says how far short the light falls by hand", () => {
    const result = ask({ ...indoors("window", "storm"), support: "hand" });
    expect(result.steps).toEqual([
      { kind: "indoor_estimate", aperture: "2.8", shutter: "1/60" },
      { kind: "dark_sky", stops: 1, aperture: null, shutter: null },
      { kind: "not_enough_light", stops: 1, aperture: "2.8", shutter: "1/60" },
    ]);
    expect(result.warnings).toContainEqual({ code: "not_enough_light", stops: 1, suggestSupport: "braced" });
  });

  it("a faster lens holds a room by hand", () => {
    const result = recommend({ ...base, ...indoors("room", "sun"), camera: cameras.fast, support: "hand" }) as Recommendation;
    expect(result.final).toMatchObject({ aperture: "2", shutter: "1/60", support: "hand" });
  });

  it("works without a sky, as if the sky were ordinary", () => {
    expect(ask(indoors("window")).final).toMatchObject({ aperture: "2.8", shutter: "1/60" });
  });

  it("goals still apply: a moving subject on fast film gets a fast shutter", () => {
    const result = ask({ ...iso(3200), ...indoors("window", "sun"), goal: "moving" });
    expect(result.final).toMatchObject({ aperture: "4", shutter: "1/250" });
  });
});

describe("goals in low light", () => {
  it("blur opens one step from the published value", () => {
    const result = ask({ ...low("sun_low"), subject: "portrait" });
    expect(result.final).toMatchObject({ aperture: "5.6", shutter: "1/250" });
    expect(result.steps).toEqual([
      { kind: "published_value", aperture: "8", shutter: "1/250" },
      { kind: "blur_extra", stops: 1, aperture: "5.6", shutter: "1/250" },
    ]);
  });

  it("blur uses the camera's fastest shutter", () => {
    const result = recommend({ ...base, ...low("sun_low"), subject: "portrait", camera: cameras.fast }) as Recommendation;
    expect(result.final).toMatchObject({ aperture: "2.8", shutter: "1/1000" });
  });

  it("sharp picks the aperture closest to f/8 that the support allows", () => {
    expect(ask({ ...low("street_night"), subject: "landscape", support: "surface" }).final).toMatchObject({
      aperture: "5.6",
      shutter: "1/15",
    });
  });

  it("moving warns when the shutter can't stay at 1/125 or faster", () => {
    const result = ask({ ...low("street_night"), goal: "moving" });
    expect(result.final).toMatchObject({ aperture: "2.8", shutter: "1/60" });
    expect(codes(result)).toContain("motion_blur_risk");
  });

  it("fast film moves to a smaller aperture rather than beyond the fastest shutter", () => {
    expect(ask({ ...iso(1600), ...low("sun_low") }).final).toMatchObject({ aperture: "16", shutter: "1/250" });
  });

  it("ignores low sun, which applies to daylight only", () => {
    expect(ask({ ...low("sun_low"), lowSun: true })).toEqual(ask(low("sun_low")));
  });
});

describe("limits", () => {
  it("warns that blur is limited at the camera's least-light limit", () => {
    const result = ask({ ...iso(800), ...daylight("sun", "snow_sand"), subject: "portrait" });
    expect(result.final).toMatchObject({ aperture: "22", shutter: "1/250" });
    expect(codes(result)).toEqual(expect.arrayContaining(["least_light_limit", "blur_limited"]));
  });

  it("uses whole seconds on B, and warns when longer than 1 second", () => {
    const result = ask({ ...iso(16), ...low("floodlit"), subject: "landscape" });
    expect(result.final).toMatchObject({ aperture: "2.8", shutter: "B", bulbSeconds: 8 });
    expect(result.warnings).toContainEqual({ code: "b_counted_seconds", seconds: 8 });
    expect(codes(result)).toContain("long_exposure");
  });

  it("doesn't warn about a long exposure at 1 second", () => {
    expect(codes(ask(low("floodlit")))).not.toContain("long_exposure");
  });

  it("never uses B on a camera without it", () => {
    const result = recommend({ ...base, ...iso(16), ...low("floodlit"), subject: "landscape", camera: cameras.half }) as Recommendation;
    expect(result.final.shutter).not.toBe("B");
    expect(result.final).toMatchObject({ aperture: "1.8", shutter: "1", support: "surface" });
    expect(result.warnings).toContainEqual({ code: "not_enough_light", stops: 2 });
  });
});

describe("focus", () => {
  it("a distance the user gives wins over the portrait default", () => {
    expect(ask({ ...daylight("sun", "open"), subject: "portrait", subjectDistanceM: 2 }).final.focus).toEqual({
      meters: 2,
      source: "given",
    });
  });

  it("a distance the user gives wins over the landscape rule", () => {
    const { final } = ask({ ...daylight("overcast", "open"), subject: "landscape", subjectDistanceM: 5 });
    expect(final.aperture).toBe("8");
    expect(final.focus).toEqual({ meters: 5, source: "given" });
    expect(final.sharpZone).toEqual({ nearM: 2.87, farM: 19.53 });
  });

  it("names infinity for a landscape", () => {
    const { final } = ask({ ...iso(16), ...daylight("sun_behind_clouds", "open"), subject: "landscape" });
    expect(final.focus).toEqual({ meters: null, source: "landscape" });
  });

  it("works the sharp zone out from the camera's own focal length", () => {
    const { final } = recommend({ ...base, ...daylight("sun", "open"), subject: "portrait", camera: cameras.fast }) as Recommendation;
    expect(final.aperture).toBe("5.6");
    expect(final.focus).toEqual({ meters: 1.3, source: "default" });
    expect(final.sharpZone.nearM).toBeLessThan(1.3);
    expect(final.sharpZone.farM).toBeGreaterThan(1.3);
  });
});

describe("time of day, ENGINE_SPEC section 8", () => {
  it("takes no month or hour, and checks no hours", () => {
    const result = ask({});
    expect(result).not.toHaveProperty("hours");
    expect(Object.keys(result)).toEqual(["steps", "final", "estimate", "estimates", "warnings", "facts"]);
  });
});

describe("goals, ENGINE_SPEC section 6", () => {
  it("has no No preference: every subject but a portrait uses Everything sharp", () => {
    for (const subject of ["two_people", "group", "landscape"] as const) {
      expect(ask({ ...daylight("overcast", "open"), subject, support: "hand" }).final).toMatchObject({ aperture: "8", shutter: "1/125" });
    }
    expect(ask({ ...daylight("overcast", "open"), subject: "portrait", support: "hand" }).final).toMatchObject({ aperture: "4", shutter: "1/250" });
  });

  it("names the support when it decided the shutter, and the goal otherwise", () => {
    const byHand = ask({ ...daylight("storm", "open"), support: "hand" }).steps.at(-1);
    expect(byHand).toEqual({ kind: "same_light_for_support", aperture: "8", shutter: "1/60" });
    const forGoal = ask({ ...daylight("overcast", "open"), support: "hand" }).steps.at(-1);
    expect(forGoal).toEqual({ kind: "same_light_for_goal", aperture: "8", shutter: "1/125" });
  });
});

describe("estimates in daylight, ENGINE_SPEC section 3", () => {
  it("labels storm clouds under every scene", () => {
    for (const scene of ["snow_sand", "open", "under_trees"] as const) {
      expect(codes(ask(daylight("storm", scene)))).toContain("light_estimate");
    }
  });

  it("labels snow or sand and under trees under every sky but sun", () => {
    for (const sky of ["sun_haze", "sun_behind_clouds", "overcast"] as const) {
      expect(codes(ask(daylight(sky, "snow_sand")))).toContain("light_estimate");
      expect(codes(ask(daylight(sky, "under_trees")))).toContain("light_estimate");
    }
    expect(codes(ask(daylight("sun", "snow_sand")))).not.toContain("light_estimate");
    expect(codes(ask(daylight("sun", "under_trees")))).not.toContain("light_estimate");
  });
});

describe("usual distances, ENGINE_SPEC section 7", () => {
  it("follows the lens: a longer lens stands further back for the same framing", () => {
    const portraitAt = (focalLengthMm: number) =>
      (recommend({ ...base, subject: "portrait", camera: { ...cameras.compact, focalLengthMm } }) as Recommendation).final.focus;
    expect(portraitAt(28)).toEqual({ meters: 0.7, source: "default" });
    expect(portraitAt(40)).toEqual({ meters: 1, source: "default" });
    expect(portraitAt(58)).toEqual({ meters: 1.5, source: "default" });
  });

  it("asks to check the lens below 1 m, whether the distance is given or usual", () => {
    const wide = { ...cameras.compact, focalLengthMm: 28 };
    expect(codes(recommend({ ...base, subject: "portrait", camera: wide }) as Recommendation)).toContain("close_focus");
    expect(codes(ask({ subject: "other", subjectDistanceM: 0.9 }))).toContain("close_focus");
    expect(codes(ask({ subject: "portrait" }))).not.toContain("close_focus");
  });
});

describe("shake risk, ENGINE_SPEC section 9", () => {
  it.each([
    ["1/1000", "none"],
    ["1/500", "none"],
    ["1/250", "none"],
    ["1/125", "low"],
    ["1/60", "medium"],
    ["1/30", "high"],
    ["1/15", "very_high"],
    ["1", "very_high"],
    ["B", "very_high"],
  ] as const)("%s is %s", (shutter, risk) => {
    expect(shakeRisk(shutter)).toBe(risk);
  });
});
