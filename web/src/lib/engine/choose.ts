// ENGINE_SPEC section 6: choosing the aperture and shutter that give the target light, within the camera's limits.
import { limitsOf, type Limits } from "./camera.ts";
import { shutterAt } from "./light.ts";
import type { Camera, Goal, Support, TimedShutter } from "./types.ts";

const SUPPORTS_LEAST_FIRST: Support[] = ["hand", "braced", "surface"];
/** By hand 1/60 and braced 1/30, for a lens of 28 to 58 mm. On a surface, the camera's slowest timed speed. */
const HELD_FLOOR_S = { hand: 6, braced: 5 };
const SHARP_RANGE = { from: 6, to: 7 }; // f/8 to f/11

/** The slowest shutter each kind of support allows, as S. */
export function floorS(support: Support, limits: Limits) {
  return support === "surface" ? limits.slowestS : Math.max(HELD_FLOOR_S[support], limits.slowestS);
}

/** The slowest timed shutter a support allows on this camera, as the camera names it. A surface may also allow B. */
export const slowestShutter = (support: Support, camera: Camera) =>
  shutterAt(floorS(support, limitsOf(camera))) as TimedShutter;

export interface Selection {
  a: number;
  s: number;
  /** Set when the shutter is B. */
  bulbSeconds: number | null;
  support: Support;
  /** The blur goal opened the aperture one step beyond the target light. */
  blurExtra: boolean;
  /** Set when the camera can't reach the target with the support the user gave. */
  short: { stops: number; suggestSupport?: Support } | null;
  /** Set when the target is beyond the least light the camera can give. */
  overLimitStops: number | null;
}

interface Pair {
  a: number;
  s: number;
  blurExtra: boolean;
}

const isValid = (a: number, s: number, slowest: number, limits: Limits) =>
  a >= limits.widestA && a <= limits.smallestA && s >= slowest && s <= limits.fastestS;

function fastestPair(target: number, limits: Limits): Pair {
  const a = target - limits.fastestS;
  return a < limits.widestA
    ? { a: limits.widestA, s: target - limits.widestA, blurExtra: false }
    : { a, s: limits.fastestS, blurExtra: false };
}

function blur(target: number, limits: Limits): Pair {
  const pair = fastestPair(target, limits);
  return pair.a > limits.widestA ? { ...pair, a: pair.a - 1, blurExtra: true } : pair;
}

function sharp(target: number, slowest: number, limits: Limits): Pair | null {
  let best: (Pair & { distance: number }) | null = null;
  // Fastest shutter first, so a tie keeps the faster shutter.
  for (let s = limits.fastestS; s >= slowest; s--) {
    const a = target - s;
    if (!isValid(a, s, slowest, limits)) continue;
    const distance = a < SHARP_RANGE.from ? SHARP_RANGE.from - a : a > SHARP_RANGE.to ? a - SHARP_RANGE.to : 0;
    if (!best || distance < best.distance) best = { a, s, blurExtra: false, distance };
  }
  return best;
}

function pairForGoal(target: number, goal: Goal, slowest: number, limits: Limits): Pair | null {
  const pair = goal === "blur" ? blur(target, limits) : goal === "moving" ? fastestPair(target, limits) : sharp(target, slowest, limits);
  return pair && isValid(pair.a, pair.s, slowest, limits) ? pair : null;
}

/** B, in whole seconds: the widest aperture that needs at least a full second. */
function onBulb(target: number, limits: Limits): Selection {
  const a = Math.max(limits.widestA, target);
  const s = target - a;
  return { a, s, bulbSeconds: 2 ** -s, support: "surface", blurExtra: false, short: null, overLimitStops: null };
}

function reaches(target: number, support: Support, limits: Limits) {
  if (support === "surface" && limits.hasBulb) return true;
  return target - limits.widestA >= floorS(support, limits);
}

/** @param support What the user gave, or null to use the least support that reaches the target. */
export function selectSettings(target: number, goal: Goal, support: Support | null, limits: Limits): Selection {
  if (target > limits.maxLight) {
    return {
      a: limits.smallestA,
      s: limits.fastestS,
      bulbSeconds: null,
      support: support ?? "hand",
      blurExtra: false,
      short: null,
      overLimitStops: target - limits.maxLight,
    };
  }

  for (const candidate of support ? [support] : SUPPORTS_LEAST_FIRST) {
    const pair = pairForGoal(target, goal, floorS(candidate, limits), limits);
    if (pair) return { ...pair, bulbSeconds: null, support: candidate, short: null, overLimitStops: null };
  }

  if ((support === null || support === "surface") && limits.hasBulb) return onBulb(target, limits);

  // Nothing reaches the target: the most light the support allows, and the least support that would reach it.
  const used: Support = support ?? "surface";
  const s = floorS(used, limits);
  const suggestSupport = SUPPORTS_LEAST_FIRST.find((candidate) => reaches(target, candidate, limits));
  return {
    a: limits.widestA,
    s,
    bulbSeconds: null,
    support: used,
    blurExtra: false,
    short: { stops: limits.widestA + s - target, ...(suggestSupport ? { suggestSupport } : {}) },
    overLimitStops: null,
  };
}
