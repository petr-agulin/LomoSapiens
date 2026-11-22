import { beforeAll, describe, expect, it } from "vitest";
import cameraSet from "../../../../testset/engine/cameras.json" with { type: "json" };
import inputs from "../../../../testset/engine/common-sense-inputs.json" with { type: "json" };
import { validateRecommendation } from "../validate.ts";
import { isRefusal, recommend } from "./index.ts";
import type { Camera, Conditions, Recommendation } from "./index.ts";

// The rules in ENGINE_SPEC section 13.3, run over every combination of inputs on every test camera.
// The light numbers are repeated from section 2 so this file checks the engine, not trusts it.
const A: Record<string, number> = {
  "1.4": 1, "1.7": 2, "1.8": 2, "2": 2, "2.8": 3, "3.5": 4, "4": 4, "4.5": 5, "5.6": 5, "8": 6, "11": 7, "16": 8, "22": 9, "32": 10,
};
const S: Record<string, number> = {
  "1": 0, "1/2": 1, "1/4": 2, "1/8": 3, "1/15": 4, "1/30": 5, "1/60": 6, "1/125": 7, "1/250": 8, "1/500": 9, "1/1000": 10, "1/2000": 11,
};
const IN_BETWEEN = ["1.7", "1.8", "3.5", "4.5"];
const PEOPLE = ["portrait", "two_people", "group"];
const cameras = cameraSet.cameras as Record<string, Camera>;

// Section 6: by hand 1/60 and braced 1/30, but never slower than the camera's own slowest speed.
const floor = (camera: Camera, support: Conditions["support"]) =>
  support === "surface" ? S[camera.slowestShutter] : Math.max(support === "braced" ? 5 : 6, S[camera.slowestShutter]);

const shutterIndex = (shutter: string, bulbSeconds: number | null) =>
  shutter === "B" ? -Math.log2(bulbSeconds!) : S[shutter];

const lightOfFinal = ({ final }: Recommendation) => A[final.aperture] + shutterIndex(final.shutter, final.bulbSeconds);

const has = (result: Recommendation, ...codes: string[]) =>
  result.warnings.some((warning) => codes.includes(warning.code));

const stepsShort = (result: Recommendation) =>
  result.warnings.find((warning) => warning.code === "not_enough_light")?.stops ?? 0;

// Section 12a: the light, then the corrections, then the focus.
const ESTIMATE_ORDER = [
  "storm", "snow_sand_not_sun", "shade_not_sun", "indoor", "evening", "dusk",
  "hazy_backlight", "storm_outside", "low_sun", "usual_distance",
];

function estimatesHold(c: Conditions, result: Recommendation) {
  const places = result.estimates.map((reason) => ESTIMATE_ORDER.indexOf(reason));
  if (places.some((place, i) => place < 0 || (i > 0 && place <= places[i - 1]))) return false;
  const usual = result.estimates.includes("usual_distance");
  if (usual !== (result.final.focus.source === "default")) return false;
  if (result.estimate !== result.estimates.some((reason) => reason !== "usual_distance")) return false;
  // Low sun is swept only with lights that take it, so it must always be a reason.
  return result.estimates.includes("low_sun") === Boolean(c.lowSun);
}

const effectiveGoal = (c: Conditions) =>
  c.goal ?? (c.subject === "portrait" ? "blur" : "sharp");

function onCamera(camera: Camera, { final }: Recommendation) {
  const a = A[final.aperture];
  if (a === undefined || a < A[camera.widestAperture] || a > A[camera.smallestAperture]) return false;
  // The widest aperture is named as marked on the lens; every other one has its whole-step name.
  if (a === A[camera.widestAperture] ? final.aperture !== camera.widestAperture : IN_BETWEEN.includes(final.aperture)) return false;
  if (final.shutter === "B") return camera.hasBulb;
  const s = S[final.shutter];
  return s !== undefined && s >= S[camera.slowestShutter] && s <= S[camera.fastestShutter];
}

function* everyCombination(): Generator<Conditions> {
  const lights: Conditions["light"][] = [
    ...inputs.scene.flatMap((scene) =>
      inputs.skyLightestFirst.map((sky) => ({ kind: "daylight", sky, scene }) as Conditions["light"]),
    ),
    ...inputs.lowlight.map((lowlight) => ({ kind: "lowlight", lowlight }) as Conditions["light"]),
    ...inputs.indoorFollowingDaylight.flatMap((indoor) =>
      inputs.skyLightestFirst.map((sky) => ({ kind: "indoors", indoor, sky }) as Conditions["light"]),
    ),
    ...inputs.indoorFixed.map((indoor) => ({ kind: "indoors", indoor }) as Conditions["light"]),
  ];
  for (const cameraId of inputs.cameras)
    for (const iso of inputs.iso)
      for (const light of lights)
        for (const subject of inputs.subject)
          for (const goal of inputs.goal)
            for (const lowSun of [false, true])
              for (const sunBehindSubject of [false, true])
                for (const support of inputs.support) {
                  if (lowSun && !("sky" in light)) continue;
                  yield {
                    film: { iso, type: "color_negative" },
                    light,
                    subject,
                    ...(goal ? { goal } : {}),
                    lowSun,
                    sunBehindSubject,
                    support,
                    camera: cameras[cameraId],
                  } as Conditions;
                }
}

const RULES = {
  noRefusal: "a supported film always gets an answer",
  portraitFocus: "a portrait never focuses at infinity, or beyond 1.5 m",
  landscapeInfinity: "a landscape always keeps infinity sharp",
  peopleWarning: "a result for people at 1/30 or slower always carries a warning",
  onCamera: "every result uses an aperture and shutter within the camera's limits, and B only on a camera that has it",
  handShutter: "by hand, the shutter is never slower than 1/60",
  handShort: "by hand, if the light falls short, a warning says so",
  neverLessLight: "the final result never gives less light than the light value for the conditions, unless a warning says so",
  sharpInRange: "with goal sharp, the result uses f/8 or f/11 whenever the light, the camera and the support allow a pair there",
  fasterFilm: "a faster film never gets more light in the final result",
  darkerSky: "a darker sky never gets less light in the final result",
  widerLens: "a camera with a wider widest aperture never falls further short of the light",
  identical: "results are identical across 100 runs with the same input",
  surfaceAlwaysReaches: "G34: on a surface, with B on the camera, not_enough_light never appears",
  schema: "every result matches schema/recommendation.schema.json",
  estimates: "estimates holds each reason once, in order; usual_distance exactly with the usual focus; estimate exactly with another reason",
} as const;

type Rule = keyof typeof RULES;
const failures = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, [] as unknown[]])) as Record<Rule, unknown[]>;
let combinations = 0;

function fail(rule: Rule, conditions: Conditions, result?: Recommendation) {
  // Keep a few examples to read: the count is what matters, and it must be zero.
  if (failures[rule].length < 3) failures[rule].push({ conditions, final: result?.final, warnings: result?.warnings });
  else failures[rule].push(null);
}

function check(c: Conditions) {
  const result = recommend(c);
  if (isRefusal(result)) return fail("noRefusal", c);
  const light = lightOfFinal(result);
  const { final, steps } = result;

  if (c.subject === "portrait" && (final.focus.meters === null || final.focus.meters > 1.5)) fail("portraitFocus", c, result);
  if (c.subject === "landscape" && final.sharpZone.farM !== null) fail("landscapeInfinity", c, result);

  const slow = shutterIndex(final.shutter, final.bulbSeconds) <= 5;
  if (PEOPLE.includes(c.subject) && slow && !has(result, "people_hold_still", "people_not_recommended")) fail("peopleWarning", c, result);

  if (!onCamera(c.camera, result)) fail("onCamera", c, result);

  if (final.support === "hand" && shutterIndex(final.shutter, final.bulbSeconds) < 6) fail("handShutter", c, result);
  if (c.support === "hand") {
    const unconstrained = recommend({ ...c, support: null }) as Recommendation;
    if (light > lightOfFinal(unconstrained) && !has(result, "not_enough_light")) fail("handShort", c, result);
  }

  const first = steps[0];
  if (first.kind === "daylight_value" && first.aperture && first.shutter) {
    const firstLight = A[first.aperture] + shutterIndex(first.shutter, first.bulbSeconds ?? null);
    if (light > firstLight && !has(result, "not_enough_light", "least_light_limit")) fail("neverLessLight", c, result);
  }

  // Dusk has its own fixed rule (ENGINE_SPEC section 5), whatever the goal.
  const dusk = c.light.kind === "lowlight" && c.light.lowlight === "dusk";
  if (effectiveGoal(c) === "sharp" && !dusk && final.shutter !== "B" && !has(result, "not_enough_light", "least_light_limit")) {
    const slowest = floor(c.camera, final.support);
    const fits = (a: number) =>
      a >= A[c.camera.widestAperture] && a <= A[c.camera.smallestAperture] && light - a >= slowest && light - a <= S[c.camera.fastestShutter];
    if ((fits(6) || fits(7)) && A[final.aperture] !== 6 && A[final.aperture] !== 7) fail("sharpInRange", c, result);
  }

  const nextIso = inputs.iso[inputs.iso.indexOf(c.film.iso) + 1];
  if (nextIso) {
    const faster = recommend({ ...c, film: { ...c.film, iso: nextIso } }) as Recommendation;
    if (lightOfFinal(faster) < light) fail("fasterFilm", c, result);
  }

  if ("sky" in c.light && c.light.sky) {
    const nextSky = inputs.skyLightestFirst[inputs.skyLightestFirst.indexOf(c.light.sky) + 1];
    if (nextSky) {
      const darker = recommend({ ...c, light: { ...c.light, sky: nextSky } } as Conditions) as Recommendation;
      if (lightOfFinal(darker) > light) fail("darkerSky", c, result);
    }
  }

  if (has(result, "not_enough_light") && c.camera.widestAperture !== "1.4") {
    const wider = recommend({ ...c, camera: { ...c.camera, widestAperture: "1.4" } }) as Recommendation;
    if (stepsShort(wider) > stepsShort(result)) fail("widerLens", c, result);
  }

  if (c.camera.hasBulb && c.support === "surface" && has(result, "not_enough_light")) fail("surfaceAlwaysReaches", c, result);
  if (!validateRecommendation(result).ok) fail("schema", c, result);
  if (!estimatesHold(c, result)) fail("estimates", c, result);

  // Repeating every combination 100 times would add nothing, so sample evenly.
  if (combinations % 500 === 0) {
    const firstRun = JSON.stringify(result);
    for (let run = 0; run < 100; run++) {
      if (JSON.stringify(recommend(c)) !== firstRun) {
        fail("identical", c, result);
        break;
      }
    }
  }
}

describe("common-sense rules from ENGINE_SPEC section 13.3", () => {
  beforeAll(() => {
    for (const conditions of everyCombination()) {
      combinations += 1;
      check(conditions);
    }
  }, 300_000);

  it("covers every combination of inputs, on every test camera", () => {
    // 29,696 for each of the five subjects in the inputs: Something further off made them five, from four.
    expect(combinations).toBe(148_480 * inputs.cameras.length);
  });

  for (const rule of Object.keys(RULES) as Rule[]) {
    it(RULES[rule], () => {
      expect(failures[rule].filter(Boolean)).toEqual([]);
    });
  }
});
