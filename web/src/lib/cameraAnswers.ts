// The user's answers about their own camera, and how they become the engine's camera.
// Shared by the app and the test page. No camera database: only what the user reads off the camera.
import type { Camera, FastestShutter, SlowestShutter, SmallestAperture, WidestAperture } from "./engine/types.ts";

/** "Not sure" is an answer to every camera question except B, which is printed on the dial. */
export const NOT_SURE = "not_sure";
export type Answer<T> = T | typeof NOT_SURE;

/** The user's answers about their own camera. */
export interface CameraAnswers {
  widestAperture: Answer<WidestAperture>;
  smallestAperture: Answer<SmallestAperture>;
  /** In mm, as chosen. */
  focalLengthMm: Answer<string>;
  fastestShutter: Answer<FastestShutter>;
  slowestShutter: Answer<SlowestShutter>;
  hasBulb: "yes" | "no";
}

/** What "Not sure" counts as: values nearly every manual camera can set. */
export const NOT_SURE_CAMERA = {
  widestAperture: "4",
  smallestAperture: "16",
  focalLengthMm: 50,
  fastestShutter: "1/250",
  slowestShutter: "1/30",
} as const satisfies Omit<Camera, "hasBulb">;

/** The focal lengths offered, within the 28 to 58 mm the engine covers. */
export const FOCAL_LENGTHS = [28, 35, 38, 40, 45, 50, 55, 58];

const answered = <T>(answer: Answer<T>, notSure: T) => (answer === NOT_SURE ? notSure : answer);

export function answersToCamera(answers: CameraAnswers): Camera {
  return {
    widestAperture: answered(answers.widestAperture, NOT_SURE_CAMERA.widestAperture),
    smallestAperture: answered(answers.smallestAperture, NOT_SURE_CAMERA.smallestAperture),
    focalLengthMm: answers.focalLengthMm === NOT_SURE ? NOT_SURE_CAMERA.focalLengthMm : Number(answers.focalLengthMm),
    fastestShutter: answered(answers.fastestShutter, NOT_SURE_CAMERA.fastestShutter),
    slowestShutter: answered(answers.slowestShutter, NOT_SURE_CAMERA.slowestShutter),
    hasBulb: answers.hasBulb === "yes",
  };
}
