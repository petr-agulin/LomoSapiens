import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "./cameraAnswers.ts";
import { isRefusal, recommend } from "./engine/index.ts";
import type { Conditions, Recommendation } from "./engine/types.ts";
import {
  adviceWarnings,
  estimateExplained,
  focusNumber,
  focusScale,
  howSteps,
  scaleAt,
  settingsSaid,
  shutterForm,
  shutterSaid,
  splitSettings,
} from "./result.ts";
import { toConditions } from "./shot.ts";
import type { SavedCamera, ShotAnswers, LightChoice } from "./store.ts";

const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const camera = (iso = 400, answers: CameraAnswers = compact): SavedCamera => ({ id: "c1", name: "Mine", answers, film: { id: "r1", iso, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-14" } });
const shot = (light: LightChoice, more: Partial<ShotAnswers> = {}): ShotAnswers => ({
  light,
  lowSun: false,
  stormOutside: false,
  sunBehind: false,
  subject: "portrait",
  distanceM: null,
  goal: "blur",
  ...more,
});

function run(answers: ShotAnswers, hold: Conditions["support"] & string = "hand", saved = camera()) {
  const conditions = toConditions(answers, saved, hold)!;
  const result = recommend(conditions);
  if (isRefusal(result)) throw new Error(result.refused);
  return { conditions, result: result as Recommendation };
}

// The worked example (ENGINE_SPEC section 12): portrait, sun behind clouds, open terrain, low sun, ISO 400, by hand.
const example = run(shot({ group: "day", sky: "sun_behind_clouds", place: "open" }, { lowSun: true }));

describe("the shutter as the dial marks it", () => {
  it("has three forms: a fraction, whole seconds, and B with its seconds", () => {
    expect(shutterForm("1/250", null)).toEqual({ form: "fraction", big: "250" });
    expect(shutterForm("1/1000", null)).toEqual({ form: "fraction", big: "1000" });
    expect(shutterForm("1", null)).toEqual({ form: "seconds", big: "1" });
    expect(shutterForm("B", 8)).toEqual({ form: "bulb", seconds: 8 });
  });

  it("is read aloud in words", () => {
    expect(shutterSaid(shutterForm("1/250", null))).toBe("1/250 of a second");
    expect(shutterSaid(shutterForm("1", null))).toBe("1 second");
    expect(shutterSaid(shutterForm("B", 1))).toBe("B, held for 1 second");
    expect(shutterSaid(shutterForm("B", 16))).toBe("B, held for 16 seconds");
  });
});

describe("the focus scale, placed as in the design's samples", () => {
  it("puts 1 m at 16.9 %, 10 m at 73.1 % and ∞ at the end, keeping odd distances inside", () => {
    expect(scaleAt(1)).toBe(16.9);
    expect(scaleAt(5)).toBe(56.2);
    expect(scaleAt(10)).toBe(73.1);
    expect(scaleAt(null)).toBe(96);
    expect(scaleAt(0.2)).toBe(2);
    expect(scaleAt(500)).toBe(90);
  });

  it("draws the portrait's narrow band at 1 m, with 1 in bold", () => {
    expect(focusScale(example.result.final.focus, example.result.final.sharpZone)).toEqual({ left: 15.1, width: 3.7, mark: 16.9, boldTick: "1" });
  });

  it("runs a landscape's band to ∞, with the pointer and the bold tick at 5 m", () => {
    const { result } = run(shot({ group: "day", sky: "sun", place: "open" }, { subject: "landscape", goal: "sharp" }));
    expect(result.final.focus).toEqual({ meters: 5, source: "landscape" });
    expect(focusScale(result.final.focus, result.final.sharpZone)).toEqual({ left: 33.9, width: 62.1, mark: 56.2, boldTick: "5" });
    expect(focusNumber(result.final.focus)).toBe("5");
  });

  it("makes no tick bold away from the marks, and writes ∞ for infinity", () => {
    expect(focusScale({ meters: 2.5, source: "given" }, { nearM: 2, farM: 3.3 }).boldTick).toBeNull();
    expect(focusNumber({ meters: null, source: "landscape" })).toBe("∞");
  });
});

describe("the advice card and How the app got there", () => {
  it("keeps the settings at the end of a line together", () => {
    expect(splitSettings("Low sun (estimate), 1 extra step: f/11, 1/60")).toEqual({ text: "Low sun (estimate), 1 extra step: ", settings: "f/11, 1/60" });
    expect(splitSettings("Not enough light: 2 steps short. On a surface: f/2.8, 1/15.")).toEqual({
      text: "Not enough light: 2 steps short. On a surface: ",
      settings: "f/2.8, 1/15.",
    });
    expect(splitSettings("Everyone must hold still.")).toEqual({ text: "Everyone must hold still.", settings: "" });
  });

  it("leaves out \"This value is an estimate.\", which Values are estimated replaces", () => {
    expect(example.result.warnings.map((warning) => warning.code)).toEqual(["light_estimate", "focus_critical"]);
    expect(adviceWarnings(example.conditions, example.result)).toEqual([{ text: "Measure the distance carefully.", settings: "" }]);
  });

  it("names the support that would reach the light, with its settings, in the agreed hold words", () => {
    const night = run(shot({ group: "evening", lowlight: "street_night" }, { subject: "group", goal: "sharp" }), "hand", camera(200));
    expect(adviceWarnings(night.conditions, night.result)).toContainEqual({ text: "Not enough light: 1 step short. Braced: ", settings: "f/2.8, 1/30." });
  });

  it("lists the worked example step by step, the last matching the film strip", () => {
    expect(howSteps(example.result)).toEqual([
      { text: "Kodak's table for this sky and scene: ", settings: "f/16, 1/60" },
      { text: "Low sun (estimate), 1 extra step: ", settings: "f/11, 1/60" },
      { text: "Same light, adjusted for your goal: ", settings: "f/5.6, 1/250" },
      { text: "Blurred background, 1 extra step: ", settings: "f/4, 1/250" },
    ]);
    expect(example.result.final).toMatchObject({ aperture: "4", shutter: "1/250" });
  });

  it("says the last shot's settings in words, B and ∞ included", () => {
    expect(settingsSaid("4", "1/250", null, { meters: 1, source: "default" })).toBe("f/4, 1/250, 1 m");
    expect(settingsSaid("2.8", "B", 1, { meters: null, source: "landscape" })).toBe("f/2.8, B for 1 s, ∞");
  });
});

describe("why the values are estimated (ENGINE_SPEC section 12a)", () => {
  it("gives the worked example its two reasons, and one sentence for each setting", () => {
    expect(estimateExplained(example.conditions, example.result)).toEqual({
      reasons: "low sun · usual distance",
      groups: [
        { title: "Aperture and shutter speed", text: "The extra step for low sun is the app's own rule, not a published value." },
        {
          title: "Focus distance",
          text: "1 m is the usual distance for a portrait with your 40 mm lens, not measured. Set your own distance to remove this.",
        },
      ],
    });
  });

  it("puts every light reason under aperture and shutter speed, in order", () => {
    const snow = run(shot({ group: "day", sky: "sun_haze", place: "snow_sand" }, { lowSun: true, sunBehind: true, distanceM: 2 }));
    expect(estimateExplained(snow.conditions, snow.result)).toEqual({
      reasons: "snow or sand, not full sun · hazy sun behind the person · low sun",
      groups: [
        {
          title: "Aperture and shutter speed",
          text:
            "The published table has snow and sand only in full sun, so the app uses its own value. " +
            "The published extra light for sun behind the person is for full sun only, so the app uses its own value. " +
            "The extra step for low sun is the app's own rule, not a published value.",
        },
      ],
    });
  });

  it("names the subject and the lens in the distance sentence", () => {
    const fifty = run(shot({ group: "day", sky: "sun", place: "open" }, { subject: "two_people", goal: "sharp" }), "hand", camera(400, { ...compact, focalLengthMm: "50" }));
    expect(estimateExplained(fifty.conditions, fifty.result)?.groups).toEqual([
      { title: "Focus distance", text: "1.8 m is the usual distance for two people with your 50 mm lens, not measured. Set your own distance to remove this." },
    ]);
  });

  it("is absent when nothing is estimated", () => {
    const sunny = run(shot({ group: "day", sky: "sun", place: "open" }, { subject: "landscape", goal: "sharp" }));
    expect(estimateExplained(sunny.conditions, sunny.result)).toBeNull();
  });
});
