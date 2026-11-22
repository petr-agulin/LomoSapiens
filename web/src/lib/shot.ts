// A new shot's rules, kept apart from the screens
// so they can be tested: which switches apply, starting from the last shot, and the engine's input.
import { answersToCamera } from "./cameraAnswers.ts";
import { effectiveGoal, usualDistanceM } from "./engine/index.ts";
import type { Conditions, Goal, Subject, Support } from "./engine/types.ts";
import type { LastShot, LightChoice, SavedCamera, ShotAnswers } from "./store.ts";
import { strings } from "./strings.ts";

export type SwitchKey = "lowSun" | "stormOutside" | "sunBehind";

/** The shot being answered. Switches keep their value while their light hides them. */
export interface ShotDraft {
  light: LightChoice | null;
  lowSun: boolean;
  stormOutside: boolean;
  sunBehind: boolean;
  /** Switches that are on only because the last shot had them on, and haven't been touched since. */
  fromLast: Record<SwitchKey, boolean>;
  subject: Subject | null;
  /** A typed distance, or null for the subject's usual one. */
  distanceM: number | null;
  goal: Goal | null;
}

const daylightIndoors = (light: LightChoice | null) =>
  light?.group === "indoors" && (light.indoor === "window" || light.indoor === "room");

/** Low sun: every day sky, and the two indoor options lit by daylight. */
export const lowSunApplies = (light: LightChoice | null) => light?.group === "day" || daylightIndoors(light);

/** Storm clouds outside: only the two indoor options lit by daylight. */
export const stormApplies = (light: LightChoice | null) => daylightIndoors(light);

/** Sun behind your subject: a portrait or a subject close by, with the sun in view. */
export function sunBehindApplies(light: LightChoice | null, subject: Subject | null) {
  if (subject !== "portrait" && subject !== "two_people") return false;
  if (light?.group === "day") return light.sky === "sun" || light.sky === "sun_haze" || light.sky === "sun_behind_clouds";
  return light?.group === "evening" && light.lowlight === "sun_low";
}

/** A new shot starts from the last one: every answer picked, and the switches that are on say so. */
export function newShotDraft(last: LastShot | null): ShotDraft {
  if (!last) {
    return {
      light: null,
      lowSun: false,
      stormOutside: false,
      sunBehind: false,
      fromLast: { lowSun: false, stormOutside: false, sunBehind: false },
      subject: null,
      distanceM: null,
      goal: null,
    };
  }
  const { light, lowSun, stormOutside, sunBehind, subject, distanceM, goal } = last.answers;
  return { light, lowSun, stormOutside, sunBehind, fromLast: { lowSun, stormOutside, sunBehind }, subject, distanceM, goal };
}

export const pickLight = (draft: ShotDraft, light: LightChoice): ShotDraft => ({ ...draft, light });

export const toggle = (draft: ShotDraft, key: SwitchKey): ShotDraft => ({
  ...draft,
  [key]: !draft[key],
  fromLast: { ...draft.fromLast, [key]: false },
});

/** Picking a subject resets the goal and the distance to its usual ones. Other comes with its distance. */
export const pickSubject = (draft: ShotDraft, subject: Subject, distanceM: number | null = null): ShotDraft => ({
  ...draft,
  subject,
  goal: effectiveGoal({ subject }),
  distanceM,
});

export const setGoal = (draft: ShotDraft, goal: Goal): ShotDraft => ({ ...draft, goal });
export const setDistance = (draft: ShotDraft, distanceM: number | null): ShotDraft => ({ ...draft, distanceM });

export const isComplete = (draft: ShotDraft) =>
  draft.light !== null && draft.subject !== null && draft.goal !== null && (draft.subject !== "other" || draft.distanceM !== null);

/** The answers to keep as the last shot, once complete. */
export function toAnswers(draft: ShotDraft): ShotAnswers | null {
  if (!isComplete(draft)) return null;
  const { light, lowSun, stormOutside, sunBehind, subject, distanceM, goal } = draft;
  return { light: light!, lowSun, stormOutside, sunBehind, subject: subject!, distanceM, goal: goal! };
}

/** The engine's input for these answers on this camera. Null when the camera has no film loaded. */
export function toConditions(answers: ShotAnswers, camera: SavedCamera, hold: Support): Conditions | null {
  if (!camera.film) return null;
  const { light: choice, subject } = answers;
  const light: Conditions["light"] =
    choice.group === "day"
      ? { kind: "daylight", sky: choice.sky, scene: choice.place }
      : choice.group === "evening"
        ? { kind: "lowlight", lowlight: choice.lowlight }
        : { kind: "indoors", indoor: choice.indoor, sky: answers.stormOutside && stormApplies(choice) ? "storm" : null };
  return {
    film: { iso: camera.film.iso, type: camera.film.type },
    light,
    subject,
    subjectDistanceM: answers.distanceM,
    goal: answers.goal,
    // A hidden switch never reaches the engine as on, even if its kept value is on.
    lowSun: answers.lowSun && lowSunApplies(choice),
    sunBehindSubject: answers.sunBehind && sunBehindApplies(choice, subject),
    support: hold,
    camera: answersToCamera(camera.answers),
  };
}

/** A typed distance: up to three digits, then a comma or a point and up to two more. Above 0. */
export function parseDistance(text: string): number | null {
  const typed = text.trim();
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(typed)) return null;
  const metres = Number(typed.replace(",", "."));
  return metres > 0 ? metres : null;
}

/** A distance as the app shows it, with a point: "2.5 m". */
export const distanceText = (metres: number) => `${metres} ${strings.app.shot.metres}`;

/** The subject's usual distance with the camera's lens, as the subject step shows it. */
export function usualDistanceText(camera: SavedCamera, subject: Subject) {
  const text = strings.app.shot;
  if (subject === "landscape") return text.keepsInfinity;
  if (subject === "other") return text.subjects.other.desc;
  return text.about(String(usualDistanceM(answersToCamera(camera.answers), subject)));
}
