import { describe, expect, it } from "vitest";
import { strings } from "./strings.ts";

const { warning, extraSteps, handling } = strings.engine;

describe("engine text", () => {
  it("gives the numbers in warnings, with singular and plural", () => {
    expect(warning({ code: "least_light_limit", stops: 1 })).toContain("1 step too much");
    expect(warning({ code: "not_enough_light", stops: 2, suggestSupport: "surface" })).toContain("2 steps short");
    expect(warning({ code: "not_enough_light", stops: 2, suggestSupport: "surface" })).toContain("surface");
    expect(warning({ code: "b_counted_seconds", seconds: 1 })).toContain("1 second.");
    expect(warning({ code: "b_counted_seconds", seconds: 2 })).toContain("2 seconds.");
    expect(extraSteps(1)).toBe("1 extra step");
    expect(extraSteps(2)).toBe("2 extra steps");
  });
});

describe("handling advice, ENGINE_SPEC section 9", () => {
  // No shake risk, no advice. The section is hidden, whatever the support.
  it.each([
    ["1/250", "hand"],
    ["1/250", "braced"],
    ["1/250", "surface"],
    ["1/1000", "hand"],
  ] as const)("gives no advice at %s, %s", (shutter, support) => {
    expect(handling({ shutter, shakeRisk: "none", support })).toBeNull();
  });

  it.each([
    ["1/125", "low", "Smooth press, elbows tucked."],
    ["1/60", "medium", "Camera to face, half exhale, hold the button about 0.5 s after the click (estimate)."],
    ["1/30", "high", "Camera to face, half exhale, hold the button about 0.5 s after the click (estimate), and brace."],
  ] as const)("by hand or braced at %s", (shutter, shakeRisk, advice) => {
    expect(handling({ shutter, shakeRisk, support: "hand" })).toBe(advice);
    expect(handling({ shutter, shakeRisk, support: "braced" })).toBe(advice);
  });

  const onSurface = "Camera on a surface, hold the button about 1 s after the click (estimate).";

  it.each([
    ["1/125", "low"],
    ["1/60", "medium"],
    ["1/30", "high"],
    ["1/15", "very_high"],
  ] as const)("on a surface at %s, it never says camera to face", (shutter, shakeRisk) => {
    expect(handling({ shutter, shakeRisk, support: "surface" })).toBe(onSurface);
  });

  it("on B, it gives no hold time, because holding the button is the exposure", () => {
    const advice = handling({ shutter: "B", shakeRisk: "very_high", support: "surface" });
    expect(advice).toBe("Camera on a surface. Use a cable release if you have one.");
    expect(advice).not.toContain("after the click");
  });
});
