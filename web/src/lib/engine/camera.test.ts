import { describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import { APERTURE_INDEX, SHUTTER_INDEX, cameraApertures, cameraShutters, recommend } from "./index.ts";
import type { Camera, Conditions } from "./index.ts";

const cameras = cameraSet.cameras as Record<string, Camera>;

describe("camera limits, ENGINE_SPEC section 1a", () => {
  it("the compact test camera is a 40 mm camera from f/2.8 to f/22, 1/15 to 1/250, with B", () => {
    expect(cameras.compact).toEqual({ widestAperture: "2.8", smallestAperture: "22", focalLengthMm: 40, fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: true });
  });

  it("every aperture and shutter a camera can have has a light number from section 2", () => {
    expect(Object.keys(APERTURE_INDEX).sort()).toEqual(
      ["1.4", "1.7", "1.8", "2", "2.8", "3.5", "4", "4.5", "5.6", "8", "11", "16", "22", "32"].sort(),
    );
    expect(Object.keys(SHUTTER_INDEX).sort()).toEqual(
      ["1", "1/2", "1/4", "1/8", "1/15", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000", "1/2000"].sort(),
    );
  });

  it("lists the compact camera's settings as its rings show them", () => {
    expect(cameraApertures(cameras.compact)).toEqual(["2.8", "4", "5.6", "8", "11", "16", "22"]);
    expect(cameraShutters(cameras.compact)).toEqual(["1/15", "1/30", "1/60", "1/125", "1/250"]);
  });

  it("names a widest aperture between whole steps as marked on the lens", () => {
    expect(cameraApertures(cameras.half)).toEqual(["1.8", "2.8", "4", "5.6", "8", "11", "16", "22"]);
    expect(cameraApertures(cameras.slow)).toEqual(["3.5", "5.6", "8", "11", "16"]);
  });

  // f/1.7 is its own choice, and simpler lenses of f/4.5 and f/5.6 are covered.
  it("names f/1.7, f/4.5 and f/5.6 lenses as marked", () => {
    const lens = (widestAperture: string) => ({ ...cameras.compact, widestAperture }) as Camera;
    expect(cameraApertures(lens("1.7"))).toEqual(["1.7", "2.8", "4", "5.6", "8", "11", "16", "22"]);
    expect(cameraApertures(cameras.dim)).toEqual(["4.5", "8", "11", "16", "22"]);
    expect(cameraApertures(lens("5.6"))).toEqual(["5.6", "8", "11", "16", "22"]);
  });

  // Simpler cameras, so the app never names a setting they can't make.
  it("knows a camera with f/11 as its smallest aperture and 1/60 to 1/125 on its dial", () => {
    expect(cameraApertures(cameras.box)).toEqual(["5.6", "8", "11"]);
    expect(cameraShutters(cameras.box)).toEqual(["1/60", "1/125"]);
  });

  it("counts a lens between whole steps as the next step down, so the app never assumes more light than the lens gives", () => {
    expect(APERTURE_INDEX["1.7"]).toBe(APERTURE_INDEX["2"]);
    expect(APERTURE_INDEX["1.8"]).toBe(APERTURE_INDEX["2"]);
    expect(APERTURE_INDEX["3.5"]).toBe(APERTURE_INDEX["4"]);
    expect(APERTURE_INDEX["4.5"]).toBe(APERTURE_INDEX["5.6"]);
  });

  it("works out the sharp zone with the lens's real f-number: f/1.7 is a little shallower than f/1.8", () => {
    const shot = {
      film: { iso: 100, type: "color_negative" },
      light: { kind: "lowlight", lowlight: "street_night" },
      subject: "group",
      support: "hand",
    } as const;
    const zone = (widestAperture: string) => {
      const result = recommend({ ...shot, camera: { ...cameras.half, widestAperture } as Camera });
      if ("refused" in result) throw new Error(result.refused);
      return result.final;
    };
    const f17 = zone("1.7");
    const f18 = zone("1.8");
    expect([f17.aperture, f18.aperture]).toEqual(["1.7", "1.8"]);
    expect(f17.sharpZone.farM! - f17.sharpZone.nearM).toBeLessThan(f18.sharpZone.farM! - f18.sharpZone.nearM);
  });

  it("lists the next camera's speeds from 1 s to 1/1000", () => {
    expect(cameraShutters(cameras.fast)).toEqual([
      "1", "1/2", "1/4", "1/8", "1/15", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000",
    ]);
  });

  it("refuses limits that aren't on the lists", () => {
    const shot = {
      film: { iso: 400, type: "color_negative" },
      light: { kind: "daylight", sky: "sun", scene: "open" },
      subject: "group",
    } as const;
    const odd = (changes: Record<string, unknown>) =>
      recommend({ ...shot, camera: { ...cameras.compact, ...changes } } as unknown as Conditions);
    expect(odd({ widestAperture: "1.2" })).toEqual({ refused: "unsupported_camera" });
    expect(odd({ fastestShutter: "1/4000" })).toEqual({ refused: "unsupported_camera" });
  });
});

describe("engine purity", () => {
  // Hard rule 1: no AI, no clock, no network, no randomness, no storage.
  const sources = import.meta.glob<string>("./*.ts", { query: "?raw", import: "default", eager: true });
  const forbidden = [
    /\bDate\b/,
    /performance\.now/,
    /Math\.random/,
    /crypto\./,
    /\bfetch\b/,
    /XMLHttpRequest/,
    /localStorage|sessionStorage/,
    /\bnavigator\b/,
    /\bprocess\./,
    /from "node:/,
  ];

  for (const [path, source] of Object.entries(sources)) {
    if (path.endsWith(".test.ts")) continue;
    it(`${path} uses nothing outside its inputs`, () => {
      for (const pattern of forbidden) expect(source).not.toMatch(pattern);
    });
  }
});
