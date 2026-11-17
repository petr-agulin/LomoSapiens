// ENGINE_SPEC sections 3 to 12: from shooting conditions and the user's camera limits to the settings and the reasoning.
// Pure: no AI, no clock, no network. Same input, same output.
import { strings } from "../strings.ts";
import { apertureName, isKnownCamera, lensSupported, limitsOf, shutterName, type Limits } from "./camera.ts";
import { floorS, selectSettings, type Selection } from "./choose.ts";
import { lightCorrections } from "./corrections.ts";
import { SKY_START_S, daylightValue } from "./daylight.ts";
import { estimateReasons } from "./estimates.ts";
import { chooseFocus, sharpZone } from "./focus.ts";
import { followsDaylight, indoorAdjustments, indoorTarget } from "./indoors.ts";
import { APERTURE_INDEX, SHUTTER_INDEX } from "./light.ts";
import { lowLightTarget } from "./lowlight.ts";
import { buildWarnings, effectiveGoal, shakeRisk } from "./warnings.ts";
import type {
  Aperture,
  Camera,
  Conditions,
  EngineResult,
  IndoorLight,
  LowLight,
  Recommendation,
  Refusal,
  Scene,
  Shutter,
  Sky,
  Step,
  StepKind,
  Support,
} from "./types.ts";

/** Dusk has no published value. The app's own safe choice on every camera: f/2.8 at 1/60, 1/30 or 1/15, never extreme. */
const DUSK = { a: APERTURE_INDEX["2.8"], surfaceS: SHUTTER_INDEX["1/15"] };

export const isRefusal = (result: unknown): result is Refusal =>
  typeof result === "object" && result !== null && "refused" in result;

/** Both names, or neither if the pair isn't on the camera. */
function settingsAt(camera: Camera, a: number, s: number, bulbSeconds: number | null = null) {
  const aperture = apertureName(camera, a);
  const shutter: Shutter | null = bulbSeconds === null ? shutterName(camera, s) : camera.hasBulb ? "B" : null;
  return aperture && shutter ? { aperture, shutter } : { aperture: null, shutter: null };
}

/** The pair a step shows, if the camera has it. */
type Shown = { a: number; s: number } | null;

function makeStep(
  camera: Camera,
  kind: StepKind,
  a: number,
  s: number,
  details: { stops?: number; bulbSeconds?: number | null } = {},
): Step {
  const { stops, bulbSeconds = null } = details;
  return {
    kind,
    ...(stops === undefined ? {} : { stops }),
    ...settingsAt(camera, a, s, bulbSeconds),
    ...(bulbSeconds === null ? {} : { bulbSeconds }),
  };
}

const shownBy = (step: Step, a: number, s: number): Shown => (step.aperture ? { a, s } : null);

/** Everything between the last reasoning step and the final settings. */
function stepsToFinal(camera: Camera, limits: Limits, last: Shown, chosen: Selection): Step[] {
  if (chosen.overLimitStops) return [makeStep(camera, "least_light_limit", chosen.a, chosen.s, { stops: chosen.overLimitStops })];
  if (chosen.short) return [makeStep(camera, "not_enough_light", chosen.a, chosen.s, { stops: chosen.short.stops })];

  const steps: Step[] = [];
  const beforeExtra = chosen.a + (chosen.blurExtra ? 1 : 0);
  if (!last || last.a !== beforeExtra || last.s !== chosen.s) {
    // The support decided the shutter if it is the slowest the support allows, or B. Otherwise the goal did.
    const bySupport = chosen.bulbSeconds !== null || chosen.s === floorS(chosen.support, limits);
    const kind: StepKind = bySupport ? "same_light_for_support" : "same_light_for_goal";
    steps.push(makeStep(camera, kind, beforeExtra, chosen.s, { bulbSeconds: chosen.bulbSeconds }));
  }
  if (chosen.blurExtra) steps.push(makeStep(camera, "blur_extra", chosen.a, chosen.s, { stops: 1 }));
  return steps;
}

/** The first pair shown for the light: the sky's starting shutter, moved within the camera's apertures. */
function startingPair(target: number, skyS: number, limits: Limits) {
  let s = skyS;
  let a = target - s;
  if (a > limits.smallestA) {
    a = limits.smallestA;
    s = target - a;
  } else if (a < limits.widestA) {
    a = limits.widestA;
    s = target - a;
  }
  return { a, s };
}

function daylightPlan(camera: Camera, limits: Limits, conditions: Conditions, sky: Sky, scene: Scene) {
  const goal = effectiveGoal(conditions);
  const skyS = SKY_START_S[sky];
  let target = daylightValue(sky, scene, conditions.film.iso);

  const start = startingPair(target, skyS, limits);
  const first = makeStep(camera, "daylight_value", start.a, start.s);
  const steps: Step[] = [first];
  let last = shownBy(first, start.a, start.s);

  // In the reasoning, a correction opens the aperture first. Past the widest, the shutter gets slower.
  let a = target - skyS;
  let s = skyS;
  for (const { kind, stops } of lightCorrections(conditions)) {
    target -= stops;
    a -= stops;
    if (a < limits.widestA) {
      s -= limits.widestA - a;
      a = limits.widestA;
    }
    const step = makeStep(camera, kind, a, s, { stops });
    steps.push(step);
    last = shownBy(step, a, s);
  }

  const chosen = selectSettings(target, goal, conditions.support ?? null, limits);
  steps.push(...stepsToFinal(camera, limits, last, chosen));
  return { steps, chosen, first };
}

function tableStep(camera: Camera, kind: StepKind, reached: Selection, stops?: number): Step {
  if (reached.short) return { kind, ...(stops === undefined ? {} : { stops }), aperture: null, shutter: null };
  return makeStep(camera, kind, reached.a, reached.s, { stops, bulbSeconds: reached.bulbSeconds });
}

/** A single value for the whole situation, from a table, with any adjustments shown as their own steps. */
function tablePlan(
  camera: Camera,
  limits: Limits,
  conditions: Conditions,
  firstKind: StepKind,
  baseTarget: number,
  adjustments: Array<{ kind: StepKind; stops: number }>,
) {
  const goal = effectiveGoal(conditions);
  const support = conditions.support ?? null;

  let target = baseTarget;
  // Each table step is shown as the pair goal "sharp" would choose.
  let reached = selectSettings(target, "sharp", support, limits);
  const steps: Step[] = [tableStep(camera, firstKind, reached)];
  for (const { kind, stops } of adjustments) {
    target -= stops;
    reached = selectSettings(target, "sharp", support, limits);
    steps.push(tableStep(camera, kind, reached, stops));
  }

  const chosen = selectSettings(target, goal, support, limits);
  return { steps: [...steps, ...stepsToFinal(camera, limits, { a: reached.a, s: reached.s }, chosen)], chosen };
}

function indoorPlan(camera: Camera, limits: Limits, conditions: Conditions, indoor: IndoorLight) {
  const firstKind: StepKind = followsDaylight(indoor) ? "indoor_estimate" : "published_value";
  return tablePlan(camera, limits, conditions, firstKind, indoorTarget(indoor, conditions.film.iso), indoorAdjustments(conditions));
}

function lowLightPlan(camera: Camera, limits: Limits, conditions: Conditions, lowlight: LowLight) {
  if (lowlight === "dusk") {
    // No published value: f/2.8, or the widest if narrower, at the slowest shutter the support allows. Never B.
    const duskSupport: Support = conditions.support ?? "hand";
    const s = duskSupport === "surface" ? Math.max(DUSK.surfaceS, limits.slowestS) : floorS(duskSupport, limits);
    const chosen: Selection = {
      a: Math.max(DUSK.a, limits.widestA),
      s,
      bulbSeconds: null,
      support: duskSupport,
      blurExtra: false,
      short: null,
      overLimitStops: null,
    };
    return { steps: [makeStep(camera, "dusk_no_value", chosen.a, chosen.s)], chosen };
  }

  return tablePlan(camera, limits, conditions, "published_value", lowLightTarget(lowlight, conditions.film.iso), []);
}

export function recommend(conditions: Conditions): EngineResult {
  const { film, light, subject, camera } = conditions;
  const subjectDistanceM = conditions.subjectDistanceM ?? null;

  if (!isKnownCamera(camera)) return { refused: "unsupported_camera" };
  if (!lensSupported(camera)) return { refused: "unsupported_lens" };
  if (film.type === "slide") return { refused: "unsupported_film" };
  if (subject === "other" && subjectDistanceM === null) return { refused: "missing_distance" };

  const limits = limitsOf(camera);
  const daylight = light.kind === "daylight" ? daylightPlan(camera, limits, conditions, light.sky, light.scene) : null;
  const plan =
    daylight ??
    (light.kind === "lowlight"
      ? lowLightPlan(camera, limits, conditions, light.lowlight)
      : indoorPlan(camera, limits, conditions, (light as Extract<typeof light, { kind: "indoors" }>).indoor));
  const { chosen, steps } = plan;
  const first: Step | null = daylight ? daylight.first : null;

  const { aperture, shutter } = settingsAt(camera, chosen.a, chosen.s, chosen.bulbSeconds) as { aperture: Aperture; shutter: Shutter };
  const focus = chooseFocus(camera, subject, subjectDistanceM, aperture);
  const warnings = buildWarnings({
    camera,
    conditions,
    aperture,
    shutter,
    bulbSeconds: chosen.bulbSeconds,
    focusM: focus.meters,
    overLimitStops: chosen.overLimitStops,
    short: chosen.short,
  });

  const result: Recommendation = {
    steps,
    final: {
      aperture,
      shutter,
      bulbSeconds: chosen.bulbSeconds,
      support: chosen.support,
      focus,
      sharpZone: sharpZone(camera, aperture, focus.meters),
      shakeRisk: shakeRisk(shutter),
    },
    estimate: warnings.some((warning) => warning.code === "light_estimate"),
    estimates: estimateReasons(conditions, focus),
    warnings,
    facts:
      first && first.aperture && first.shutter
        ? [{ id: "f1", text: strings.engine.daylightSays(first.aperture, first.shutter), kb: [] }]
        : [],
  };
  return result;
}
