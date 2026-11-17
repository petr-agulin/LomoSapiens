// ENGINE_SPEC section 12a: why a result is an estimate. The light, then the corrections that were applied,
// then the focus. Each reason once; the words for them live in strings.ts.
import { lightCorrections } from "./corrections.ts";
import { daylightIsEstimate } from "./daylight.ts";
import { indoorAdjustments } from "./indoors.ts";
import type { Conditions, EstimateReason, Focus, Light } from "./types.ts";

/** The published value the reasoning starts from, if it is an estimate. */
function lightReason(light: Light): EstimateReason | null {
  if (light.kind === "indoors") return "indoor";
  if (light.kind === "lowlight") return light.lowlight === "dusk" ? "dusk" : "evening";
  if (light.sky === "storm") return "storm";
  if (!daylightIsEstimate(light.sky, light.scene)) return null;
  // Kodak covers snow or sand and open shade only in sun. Shade in hazy sun is this same reason.
  return light.scene === "snow_sand" ? "snow_sand_not_sun" : "shade_not_sun";
}

export function estimateReasons(conditions: Conditions, focus: Focus): EstimateReason[] {
  const reasons: EstimateReason[] = [];
  const light = lightReason(conditions.light);
  if (light) reasons.push(light);
  for (const { kind, estimate } of lightCorrections(conditions)) {
    if (kind === "backlight" && estimate) reasons.push("hazy_backlight");
    if (kind === "low_sun") reasons.push("low_sun");
  }
  for (const { kind } of indoorAdjustments(conditions)) reasons.push(kind === "dark_sky" ? "storm_outside" : "low_sun");
  if (focus.source === "default") reasons.push("usual_distance");
  return reasons;
}
