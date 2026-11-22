// ENGINE_SPEC sections 9 and 10. Warning text lives in strings.ts.
import { lightCorrections } from "./corrections.ts";
import { daylightIsEstimate } from "./daylight.ts";
import { CLOSE_FOCUS_M, isFocusCritical } from "./focus.ts";
import { APERTURE_INDEX, SHUTTER_INDEX } from "./light.ts";
import type { Aperture, Camera, Conditions, Goal, Light, ShakeRisk, Shutter, Support, Warning } from "./types.ts";

const S_1_250 = SHUTTER_INDEX["1/250"];
const S_1_125 = SHUTTER_INDEX["1/125"];
const S_1_60 = SHUTTER_INDEX["1/60"];
const S_1_30 = SHUTTER_INDEX["1/30"];
const A_F8 = APERTURE_INDEX["8"];

export function shakeRisk(shutter: Shutter): ShakeRisk {
  if (shutter === "B") return "very_high";
  const s = SHUTTER_INDEX[shutter];
  if (s >= S_1_250) return "none";
  if (s === S_1_125) return "low";
  if (s === S_1_60) return "medium";
  if (s === S_1_30) return "high";
  return "very_high";
}

export function sunCanBeSeen(light: Light) {
  if (light.kind === "daylight") return light.sky !== "overcast" && light.sky !== "storm";
  return light.kind === "lowlight" && light.lowlight === "sun_low";
}

export function effectiveGoal({ goal, subject }: Pick<Conditions, "goal" | "subject">): Goal {
  if (goal) return goal;
  // There is no "No preference": everything but a portrait keeps everything sharp.
  return subject === "portrait" ? "blur" : "sharp";
}

export interface WarningContext {
  camera: Camera;
  conditions: Conditions;
  aperture: Aperture;
  shutter: Shutter;
  bulbSeconds: number | null;
  /** Null means infinity. */
  focusM: number | null;
  overLimitStops?: number | null;
  short?: { stops: number; suggestSupport?: Support } | null;
}

/** Warnings come back in the order of the table in section 10. */
export function buildWarnings(context: WarningContext): Warning[] {
  const { camera, conditions, aperture, shutter, bulbSeconds, focusM } = context;
  const { light, subject, sunAhead, sunBehindSubject } = conditions;
  const goal = effectiveGoal(conditions);
  // Every choice that may hold people, near or further off; not a landscape, or a distance typed for anything else.
  const people = subject === "portrait" || subject === "two_people" || subject === "group" || subject === "far";
  const daylight = light.kind === "daylight";
  const streetNight = light.kind === "lowlight" && light.lowlight === "street_night";
  const s = shutter === "B" ? null : SHUTTER_INDEX[shutter];

  const warnings: Warning[] = [];
  const add = (code: Warning["code"], details: Omit<Warning, "code"> = {}) => warnings.push({ code, ...details });

  if (context.overLimitStops) add("least_light_limit", { stops: context.overLimitStops });
  if (context.short) add("not_enough_light", context.short);
  if (light.kind === "lowlight" && light.lowlight === "dusk") add("dusk_no_value");
  const estimatedDaylight = light.kind === "daylight" && daylightIsEstimate(light.sky, light.scene);
  if (!daylight || estimatedDaylight || lightCorrections(conditions).some((correction) => correction.estimate)) add("light_estimate");
  if ((sunAhead || sunBehindSubject) && sunCanBeSeen(light)) add("flare_risk");
  if (goal === "blur" && APERTURE_INDEX[aperture] >= A_F8) add("blur_limited");
  if (goal === "moving" && (s === null || s < S_1_125)) add("motion_blur_risk");
  if (isFocusCritical(camera, aperture, focusM)) add("focus_critical");
  if (focusM !== null && focusM < CLOSE_FOCUS_M) add("close_focus");
  if (people && (s === S_1_30 || (s === S_1_60 && streetNight))) add("people_hold_still");
  if (people && (s === null || s < S_1_30)) add("people_not_recommended");
  if (shutter === "B") {
    add("b_counted_seconds", { seconds: bulbSeconds ?? 1 });
    if ((bulbSeconds ?? 1) > 1) add("long_exposure");
  }
  return warnings;
}
