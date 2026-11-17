import { describe, expect, it } from "vitest";
import cameraSet from "../../../testset/engine/cameras.json" with { type: "json" };
import golden from "../../../testset/engine/golden.json" with { type: "json" };
import { recommend } from "./engine/index.ts";
import type { Camera, Conditions } from "./engine/index.ts";
import { validateConditions, validateRecommendation } from "./validate.ts";

const cameras = cameraSet.cameras as Record<string, Camera>;
const good: Conditions = {
  film: { iso: 400, type: "color_negative" },
  light: { kind: "daylight", sky: "sun", scene: "open" },
  subject: "group",
  camera: cameras.compact,
};

const rejects = (data: unknown) => expect(validateConditions(data).ok).toBe(false);

describe("validateConditions", () => {
  it("accepts every golden test input on its test camera", () => {
    for (const goldenCase of golden.cases as Array<{ input: object; camera?: string; cameraChanges?: object }>) {
      if (goldenCase.cameraChanges) continue;
      const camera = cameras[goldenCase.camera ?? golden.defaultCamera];
      expect(validateConditions({ ...golden.defaults, camera, ...goldenCase.input })).toEqual({ ok: true });
    }
  });

  it("accepts every test camera, and rejects limits that aren't on the lists", () => {
    for (const camera of Object.values(cameras)) expect(validateConditions({ ...good, camera }).ok).toBe(true);
    rejects({ ...good, camera: { ...cameras.compact, widestAperture: "1.2" } });
    rejects({ ...good, camera: { ...cameras.compact, fastestShutter: "1/4000" } });
    rejects({ ...good, camera: { ...cameras.compact, focalLengthMm: 24 } });
    rejects({ ...good, camera: { ...cameras.compact, focalLengthMm: 85 } });
    rejects({ ...good, camera: { ...cameras.compact, name: "My camera" } });
    const { hasBulb: _hasBulb, ...noBulbAnswer } = cameras.compact;
    rejects({ ...good, camera: noBulbAnswer });
  });

  it("has no camera name or list: a camera id is not accepted", () => {
    const { camera: _camera, ...withoutCamera } = good;
    rejects({ ...withoutCamera, cameraId: "my-camera" });
  });

  it("rejects missing required fields", () => {
    rejects({ ...good, film: undefined });
    rejects({ film: good.film, light: good.light, subject: good.subject });
    rejects({ ...good, light: undefined });
  });

  it("rejects values outside the enums and ranges", () => {
    rejects({ ...good, subject: "cat" });
    rejects({ ...good, goal: "dreamy" });
    rejects({ ...good, support: "monopod" });
    rejects({ ...good, light: { kind: "daylight", sky: "sun", scene: "beach" } });
    rejects({ ...good, light: { kind: "daylight", sky: "sun", scene: "snow" } });
    rejects({ ...good, light: { kind: "daylight", sky: "fog", scene: "open" } });
    rejects({ ...good, light: { kind: "lowlight", lowlight: "candle" } });
    rejects({ ...good, film: { iso: 0, type: "color_negative" } });
  });

  it("rejects a month or hour, which the engine no longer takes", () => {
    rejects({ ...good, month: 12 });
    rejects({ ...good, hour: 14 });
  });

  it("rejects daylight fields mixed with low light", () => {
    rejects({ ...good, light: { kind: "lowlight", lowlight: "dusk", sky: "sun" } });
  });

  it("rejects fields the engine doesn't know, such as a location", () => {
    rejects({ ...good, location: "Sweden" });
  });

  it("requires a distance for subject other", () => {
    rejects({ ...good, subject: "other" });
    rejects({ ...good, subject: "other", subjectDistanceM: null });
    expect(validateConditions({ ...good, subject: "other", subjectDistanceM: 2 }).ok).toBe(true);
  });

  it("explains what is wrong", () => {
    const result = validateConditions({ ...good, subject: "cat" });
    expect(result.ok === false && result.errors.join()).toContain("/subject");
  });
});

describe("validateConditions, indoors", () => {
  it("accepts the four indoor scenes, with or without a sky", () => {
    for (const indoor of ["window", "room", "lamps", "office"]) {
      expect(validateConditions({ ...good, light: { kind: "indoors", indoor } }).ok).toBe(true);
      expect(validateConditions({ ...good, light: { kind: "indoors", indoor, sky: "storm" } }).ok).toBe(true);
    }
  });

  it("rejects an indoor scene it doesn't know, and an outdoor scene mixed in", () => {
    rejects({ ...good, light: { kind: "indoors", indoor: "cave" } });
    rejects({ ...good, light: { kind: "indoors", indoor: "window", scene: "open" } });
    rejects({ ...good, light: { kind: "indoors" } });
  });
});

describe("validateConditions, film types", () => {
  it("has no chromogenic type any more", () => {
    rejects({ ...good, film: { iso: 400, type: "bw_chromogenic" } });
    expect(validateConditions({ ...good, film: { iso: 400, type: "bw_negative" } }).ok).toBe(true);
  });
});

describe("validateRecommendation", () => {
  it("accepts a real result", () => {
    expect(validateRecommendation(recommend(good))).toEqual({ ok: true });
  });

  it("rejects a setting no camera has", () => {
    const result = recommend(good);
    const tampered = JSON.parse(JSON.stringify(result));
    tampered.final.aperture = "1.2";
    expect(validateRecommendation(tampered).ok).toBe(false);
  });
});
