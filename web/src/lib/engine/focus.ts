// ENGINE_SPEC section 7: focus and sharp zone. Plain maths, covered by tests.
import type { Aperture, Camera, Focus, SharpZone, Subject } from "./types.ts";

/** The real f-number behind each mark, for the maths. */
const TRUE_F_NUMBER: Record<Aperture, number> = {
  "1.4": 1.414,
  "1.7": 1.7,
  "1.8": 1.8,
  "2": 2,
  "2.8": 2.828,
  "3.5": 3.5,
  "4": 4,
  "4.5": 4.5,
  "5.6": 5.657,
  "8": 8,
  "11": 11.31,
  "16": 16,
  "22": 22.63,
  "32": 32,
};

/** Circle of confusion for 35 mm film. */
const COC_MM = 0.03;
const FOCUS_CRITICAL_M = 0.1;
/** Below this, the app asks the user to check that the lens focuses this close. */
export const CLOSE_FOCUS_M = 1;
/** Landscape focus uses the first of these at or beyond the hyperfocal distance. Focus rings can sit between marks. */
const ROUND_DISTANCES_M = [1, 1.5, 2, 3, 5, 10];
/** The height a 35 mm frame takes in, in mm. */
const FRAME_HEIGHT_MM = 24;
/**
 * ESTIMATES: the height each subject's framing covers, in mm. Head and shoulders; people waist up; people standing;
 * something small in the picture with a lot around it.
 */
const FRAMING_HEIGHT_MM = { portrait: 600, two_people: 850, group: 2400, far: 4800 };
type UsualSubject = keyof typeof FRAMING_HEIGHT_MM;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The usual distance for a subject with this lens, an estimate: focal length × framing height ÷ 24 mm, to 0.1 m.
 * Whole millimetres keep the sum exact, so halves round up as written.
 */
export const usualDistanceM = (camera: Camera, subject: UsualSubject) =>
  Math.round((camera.focalLengthMm * FRAMING_HEIGHT_MM[subject]) / FRAME_HEIGHT_MM / 100) / 10;

/** The closest focus that still keeps infinity sharp, in metres. */
export function hyperfocalM(camera: Camera, aperture: Aperture) {
  const f = camera.focalLengthMm;
  return (f * f / (TRUE_F_NUMBER[aperture] * COC_MM) + f) / 1000;
}

function zoneLimits(camera: Camera, aperture: Aperture, distanceM: number | null) {
  const H = hyperfocalM(camera, aperture);
  if (distanceM === null) return { near: H, far: Infinity };
  const f = camera.focalLengthMm / 1000;
  const s = distanceM;
  return {
    near: (s * (H - f)) / (H + s - 2 * f),
    far: s < H ? (s * (H - f)) / (H - s) : Infinity,
  };
}

/** Everything from nearM to farM looks sharp. A null distance or farM means infinity. */
export function sharpZone(camera: Camera, aperture: Aperture, distanceM: number | null): SharpZone {
  const { near, far } = zoneLimits(camera, aperture, distanceM);
  return { nearM: round2(near), farM: far === Infinity ? null : round2(far) };
}

export function isFocusCritical(camera: Camera, aperture: Aperture, distanceM: number | null) {
  const { near, far } = zoneLimits(camera, aperture, distanceM);
  return (far - near) / 2 < FOCUS_CRITICAL_M;
}

/** Where to focus a landscape so infinity stays sharp, or null for infinity itself. */
export function landscapeFocus(camera: Camera, aperture: Aperture): number | null {
  const H = hyperfocalM(camera, aperture);
  return ROUND_DISTANCES_M.find((distance) => distance >= H) ?? null;
}

/** A distance the user gave wins. A subject of "other" always has one: recommend() refuses it otherwise. */
export function chooseFocus(camera: Camera, subject: Subject, subjectDistanceM: number | null, aperture: Aperture): Focus {
  if (subjectDistanceM !== null) return { meters: subjectDistanceM, source: "given" };
  if (subject === "landscape") return { meters: landscapeFocus(camera, aperture), source: "landscape" };
  return { meters: usualDistanceM(camera, subject as UsualSubject), source: "default" };
}
