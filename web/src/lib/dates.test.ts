import { describe, expect, it } from "vitest";
import { dayOf, isDay, isMinute, minuteOf } from "./dates.ts";

describe("dates for the roll history, in the phone's own time", () => {
  it("writes a day and a minute as they read on the phone", () => {
    const moment = new Date(2026, 10, 4, 9, 5);
    expect(dayOf(moment)).toBe("2026-11-04");
    expect(minuteOf(moment)).toBe("2026-11-04T09:05");
  });

  it("knows a real day from anything else", () => {
    expect(isDay("2026-11-14")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "2026-1-14", "14/11/2026", "", 20261114, null]) expect(isDay(bad)).toBe(false);
  });

  it("knows a real minute from anything else", () => {
    expect(isMinute("2026-11-14T15:42")).toBe(true);
    for (const bad of ["2026-11-14T24:00", "2026-11-14T15:60", "2026-11-14 15:42", "2026-11-14", "2026-02-30T10:00"]) expect(isMinute(bad)).toBe(false);
  });
});
