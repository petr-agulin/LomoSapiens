// ENGINE_SPEC section 2. A step doubles or halves the light.
// Light number L = A + S. A higher L lets in less light. Two pairs with the same L give the same light.
import type { Aperture, Shutter, TimedShutter } from "./types.ts";

/**
 * A lens between whole steps counts as the next whole step down, on the safe side: the app never assumes more light
 * than the lens gives. f/1.7 and f/1.8 count as f/2, f/3.5 as f/4, and f/4.5 as f/5.6, which is up to about two-thirds
 * of a step less light than the lens gives.
 */
export const APERTURE_INDEX: Record<Aperture, number> = {
  "1.4": 1,
  "1.7": 2,
  "1.8": 2,
  "2": 2,
  "2.8": 3,
  "3.5": 4,
  "4": 4,
  "4.5": 5,
  "5.6": 5,
  "8": 6,
  "11": 7,
  "16": 8,
  "22": 9,
  "32": 10,
};

export const SHUTTER_INDEX: Record<TimedShutter, number> = {
  "1": 0,
  "1/2": 1,
  "1/4": 2,
  "1/8": 3,
  "1/15": 4,
  "1/30": 5,
  "1/60": 6,
  "1/125": 7,
  "1/250": 8,
  "1/500": 9,
  "1/1000": 10,
  "1/2000": 11,
};

/** The whole-step name for each aperture index. */
const WHOLE_STEP_APERTURE: Record<number, Aperture> = {
  1: "1.4",
  2: "2",
  3: "2.8",
  4: "4",
  5: "5.6",
  6: "8",
  7: "11",
  8: "16",
  9: "22",
  10: "32",
};

const shutterByIndex = new Map(
  (Object.entries(SHUTTER_INDEX) as Array<[TimedShutter, number]>).map(([name, index]) => [index, name]),
);

export const wholeStepAperture = (index: number): Aperture | null => WHOLE_STEP_APERTURE[index] ?? null;
export const shutterAt = (index: number): TimedShutter | null => shutterByIndex.get(index) ?? null;

/** S for B held for this many seconds: 1 second is 0, and each doubling of the time is one step lower. */
export const bulbIndex = (seconds: number) => -Math.log2(seconds);

export function lightNumber(aperture: Aperture, shutter: Shutter, bulbSeconds: number | null = null) {
  const s = shutter === "B" ? bulbIndex(bulbSeconds ?? 1) : SHUTTER_INDEX[shutter];
  return APERTURE_INDEX[aperture] + s;
}
