// ENGINE_SPEC section 1a: the user's own camera, described only by its limits. No camera database.
import { APERTURE_INDEX, SHUTTER_INDEX, shutterAt, wholeStepAperture } from "./light.ts";
import type {
  Aperture,
  Camera,
  FastestShutter,
  SlowestShutter,
  SmallestAperture,
  TimedShutter,
  WidestAperture,
} from "./types.ts";

export const WIDEST_APERTURES: WidestAperture[] = ["1.4", "1.7", "1.8", "2", "2.8", "3.5", "4", "4.5", "5.6"];
export const SMALLEST_APERTURES: SmallestAperture[] = ["11", "16", "22", "32"];
export const FASTEST_SHUTTERS: FastestShutter[] = ["1/125", "1/250", "1/500", "1/1000", "1/2000"];
export const SLOWEST_SHUTTERS: SlowestShutter[] = ["1", "1/2", "1/4", "1/8", "1/15", "1/30", "1/60"];
/** v1 covers lenses of about 28 to 58 mm, because the by-hand limit assumes one. */
export const FOCAL_LENGTH_MM = { min: 28, max: 58 };

/** The camera's limits as light-number indexes. */
export interface Limits {
  widestA: number;
  smallestA: number;
  slowestS: number;
  fastestS: number;
  hasBulb: boolean;
  /** The least light the camera can give. */
  maxLight: number;
}

export function isKnownCamera(camera: Camera | undefined | null): camera is Camera {
  return (
    !!camera &&
    WIDEST_APERTURES.includes(camera.widestAperture) &&
    SMALLEST_APERTURES.includes(camera.smallestAperture) &&
    FASTEST_SHUTTERS.includes(camera.fastestShutter) &&
    SLOWEST_SHUTTERS.includes(camera.slowestShutter) &&
    typeof camera.hasBulb === "boolean" &&
    typeof camera.focalLengthMm === "number" &&
    Number.isFinite(camera.focalLengthMm)
  );
}

export const lensSupported = (camera: Camera) =>
  camera.focalLengthMm >= FOCAL_LENGTH_MM.min && camera.focalLengthMm <= FOCAL_LENGTH_MM.max;

export function limitsOf(camera: Camera): Limits {
  const widestA = APERTURE_INDEX[camera.widestAperture];
  const smallestA = APERTURE_INDEX[camera.smallestAperture];
  const fastestS = SHUTTER_INDEX[camera.fastestShutter];
  return {
    widestA,
    smallestA,
    slowestS: SHUTTER_INDEX[camera.slowestShutter],
    fastestS,
    hasBulb: camera.hasBulb,
    maxLight: smallestA + fastestS,
  };
}

/** The aperture at this index, if the camera has it. The widest is named as marked on the lens, such as f/1.8. */
export function apertureName(camera: Camera, index: number): Aperture | null {
  const { widestA, smallestA } = limitsOf(camera);
  if (index < widestA || index > smallestA) return null;
  return index === widestA ? camera.widestAperture : wholeStepAperture(index);
}

/** The timed shutter at this index, if the camera has it. */
export function shutterName(camera: Camera, index: number): TimedShutter | null {
  const { slowestS, fastestS } = limitsOf(camera);
  return index < slowestS || index > fastestS ? null : shutterAt(index);
}

/** Every aperture on the camera, widest first. */
export function cameraApertures(camera: Camera): Aperture[] {
  const { widestA, smallestA } = limitsOf(camera);
  const names: Aperture[] = [];
  for (let index = widestA; index <= smallestA; index++) names.push(apertureName(camera, index) as Aperture);
  return names;
}

/** Every timed shutter on the camera, slowest first. */
export function cameraShutters(camera: Camera): TimedShutter[] {
  const { slowestS, fastestS } = limitsOf(camera);
  const names: TimedShutter[] = [];
  for (let index = slowestS; index <= fastestS; index++) names.push(shutterAt(index) as TimedShutter);
  return names;
}
