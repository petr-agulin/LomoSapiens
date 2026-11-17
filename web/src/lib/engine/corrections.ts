// ENGINE_SPEC section 4: corrections for the light, each adding light.
//
// Source for shade and backlight in full sun: Kodak Ultra Max 400 data sheet, publication E-7023.
// ESTIMATES, labelled in the app: the same corrections in hazy sun, and low sun.
import type { Conditions } from "./types.ts";

export interface Correction {
  kind: "shade" | "backlight" | "low_sun";
  stops: number;
  estimate: boolean;
}

const SUN_STOPS = { sun: 2, sun_haze: 1 } as const;

export function lightCorrections(conditions: Conditions): Correction[] {
  const { light, subject, sunBehindSubject, lowSun } = conditions;
  if (light.kind !== "daylight") return [];

  const corrections: Correction[] = [];
  if (light.sky === "sun" || light.sky === "sun_haze") {
    const stops = SUN_STOPS[light.sky];
    const estimate = light.sky === "sun_haze";
    const closeSubject = subject === "portrait" || subject === "two_people";
    // Shade and backlight do not add together. They are the same size, so one entry is enough.
    if (light.scene === "under_trees") corrections.push({ kind: "shade", stops, estimate });
    else if (sunBehindSubject && closeSubject) corrections.push({ kind: "backlight", stops, estimate });
  }
  if (lowSun) corrections.push({ kind: "low_sun", stops: 1, estimate: true });
  return corrections;
}
