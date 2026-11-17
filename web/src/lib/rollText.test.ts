// How rolls read on screen: their dates, titles and counts.
import { describe, expect, it } from "vitest";
import { cameraRollLine, dayText, momentText, rangeText, recordedText, rollTitle } from "./rollText.ts";
import type { Roll } from "./store.ts";

const roll = (more: Partial<Roll> = {}): Roll => ({ id: "r1", iso: 400, type: "color_negative", frames: 36, name: "", loadedOn: "2026-11-03", ...more });

describe("dates, as the UK writes them", () => {
  it("writes a day with a short month, with or without the year", () => {
    expect(dayText("2026-11-03")).toBe("3 Nov 2026");
    expect(dayText("2026-01-31", false)).toBe("31 Jan");
  });

  it("writes when a frame was recorded, to the minute", () => {
    expect(momentText("2026-11-14T15:42")).toBe("14 Nov 2026, 15:42");
    expect(momentText("2026-01-03T09:05")).toBe("3 Jan 2026, 09:05");
  });

  it("writes a roll's dates as short as they stay clear", () => {
    expect(rangeText("2026-11-03", "2026-11-14")).toBe("3 – 14 Nov 2026");
    expect(rangeText("2026-10-28", "2026-11-03")).toBe("28 Oct – 3 Nov 2026");
    expect(rangeText("2025-12-28", "2026-01-03")).toBe("28 Dec 2025 – 3 Jan 2026");
    expect(rangeText("2026-11-14", "2026-11-14")).toBe("14 Nov 2026");
  });
});

describe("a roll on screen", () => {
  it("is called by its name, or else by its film", () => {
    expect(rollTitle(roll({ name: "Kodak box" }))).toBe("Kodak box");
    expect(rollTitle(roll())).toBe("ISO 400 colour");
    expect(rollTitle(roll({ iso: 100, type: "bw_negative" }))).toBe("ISO 100 black and white");
  });

  it("counts the frames recorded against the roll's length", () => {
    expect(recordedText(12, 36)).toBe("12 of 36 recorded");
    expect(recordedText(0, 24)).toBe("0 of 24 recorded");
  });

  it("sums up a camera's roll on its card, or says there is none", () => {
    expect(cameraRollLine(roll(), 12)).toBe("ISO 400 colour · 12 of 36");
    expect(cameraRollLine(roll({ type: "bw_negative", frames: 24 }), 0)).toBe("ISO 400 black and white · 0 of 24");
    expect(cameraRollLine(null, 0)).toBe("No film loaded");
  });
});
