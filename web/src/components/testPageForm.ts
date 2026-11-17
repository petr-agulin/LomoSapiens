// What the test page's controls hold, and how that becomes the engine's input.
// Kept apart from the page so it can be tested without a browser.
import { effectiveGoal, sunCanBeSeen } from "../lib/engine/index.ts";
import type {
  AnyScene,
  Conditions,
  FilmType,
  Goal,
  IndoorLight,
  Light,
  LowLight,
  Sky,
  Subject,
  Support,
} from "../lib/engine/types.ts";
import type { ParseResult } from "../lib/parser.ts";

import { answersToCamera, type CameraAnswers } from "../lib/cameraAnswers.ts";

// The camera answers live in lib/, shared with the app. The test page keeps its own names for them.
export { FOCAL_LENGTHS, NOT_SURE, NOT_SURE_CAMERA, answersToCamera } from "../lib/cameraAnswers.ts";
export type { Answer, CameraAnswers } from "../lib/cameraAnswers.ts";

/** The test page starts at the `compact` test camera, without naming it on screen. */
export const STARTING_CAMERA: CameraAnswers = {
  widestAperture: "2.8",
  smallestAperture: "22",
  focalLengthMm: "40",
  fastestShutter: "1/250",
  slowestShutter: "1/15",
  hasBulb: "yes",
};

export const SKIES: Sky[] = ["sun", "sun_haze", "sun_behind_clouds", "overcast", "storm"];
export const SCENES: AnyScene[] = [
  "snow_sand",
  "open",
  "under_trees",
  "indoor_window",
  "indoor_room",
  "indoor_lamps",
  "indoor_office",
];
export const LOW_LIGHTS: LowLight[] = ["sun_low", "sun_just_set", "dusk", "street_night", "home_lamps", "floodlit"];
export const SUBJECTS: Subject[] = ["portrait", "two_people", "group", "landscape", "other"];
export const GOALS: Goal[] = ["blur", "sharp", "moving"];
export const SUPPORTS: Support[] = ["hand", "braced", "surface"];
export const FILM_TYPES: FilmType[] = ["color_negative", "bw_negative", "slide"];
// A testing list: the whole steps from ISO 25 to 3200, the speeds sold between them, which round to the nearest
// step, and two very slow ones. The real app's picker offers common speeds and typing.
export const FILM_SPEEDS = [10, 16, 25, 32, 50, 64, 100, 125, 160, 200, 250, 320, 400, 500, 800, 1600, 3200];

export interface TestForm {
  camera: CameraAnswers;
  lightKind: "daylight" | "lowlight";
  sky: Sky;
  scene: AnyScene;
  lowlight: LowLight;
  subject: Subject;
  /** As typed. */
  distance: string;
  goal: Goal;
  iso: string;
  filmType: FilmType;
  /** The support the user has. The app never picks one for them. */
  support: Support;
  lowSun: boolean;
  sunBehindSubject: boolean;
  sunAhead: boolean;
}

/** The worked example: winter in Sweden, sun behind clouds, outdoor portrait, ISO 400. */
export const DEFAULT_FORM: TestForm = {
  camera: STARTING_CAMERA,
  lightKind: "daylight",
  sky: "sun_behind_clouds",
  scene: "open",
  lowlight: "sun_low",
  subject: "portrait",
  distance: "",
  goal: "blur",
  iso: "400",
  filmType: "color_negative",
  support: "hand",
  lowSun: true,
  sunBehindSubject: false,
  sunAhead: false,
};

function readDistance(typed: string) {
  const meters = Number(typed);
  return typed.trim() !== "" && Number.isFinite(meters) && meters > 0 ? meters : null;
}

/** "Sun behind the subject" and "Sun ahead of the camera" only mean something when the sun can be seen. */
export const showsSunOptions = (form: TestForm) => sunCanBeSeen(formToConditions(form).light);

/** The film speed list, plus the current speed if the AI read one the list doesn't have. */
export function filmSpeedChoices(current: string) {
  const speed = Number(current);
  if (FILM_SPEEDS.includes(speed) || !Number.isFinite(speed)) return FILM_SPEEDS;
  return [...FILM_SPEEDS, speed].sort((a, b) => a - b);
}

export type NotSaid = "light" | "sky" | "scene" | "subject" | "iso" | "goal" | "distance" | "support";
export type Notice = "out_of_scope" | "follow_up";

export interface ParseReport {
  form: TestForm;
  notSaid: NotSaid[];
  assumptions: Array<{ field: string; why: string | null }>;
  notice: Notice | null;
}

const numbersIn = (text: string) => text.match(/\d+(?:[.,/]\d+)*/g) ?? [];

/** Hard rule 2: numbers shown to the user come from the engine or their own words, so a reason holding any other number is dropped. */
function safeReason(why: string, words: string) {
  const said = new Set(numbersIn(words));
  return numbersIn(why).every((number) => said.has(number)) ? why : null;
}

/**
 * Each description is a new scene. What it says fills the controls. What it doesn't say goes back
 * to the default, except the light, subject and film speed, which the app would ask for: those stay
 * as they were, and the report says so.
 */
export function applyParse(form: TestForm, parse: ParseResult, words: string): ParseReport {
  if (parse.kind !== "new_shot") {
    const notice = parse.kind === "out_of_scope" ? "out_of_scope" : "follow_up";
    return { form, notSaid: [], assumptions: [], notice };
  }

  const said = parse.conditions ?? {};
  const notSaid: NotSaid[] = [];
  const next: TestForm = { ...form };

  const light = said.light;
  if (light?.lowlight) {
    next.lightKind = "lowlight";
    next.lowlight = light.lowlight;
  } else if (light?.sky || light?.scene) {
    next.lightKind = "daylight";
    if (light.scene) next.scene = light.scene;
    else notSaid.push("scene");
    if (light.sky) next.sky = light.sky;
    else if (sceneUsesSky(next.scene)) notSaid.push("sky");
  } else {
    notSaid.push("light");
  }

  if (said.subject) next.subject = said.subject;
  else notSaid.push("subject");

  if (said.film?.iso != null) next.iso = String(said.film.iso);
  else notSaid.push("iso");
  if (said.film?.type) next.filmType = said.film.type;

  next.goal = said.goal ?? effectiveGoal({ subject: next.subject });
  if (!said.goal) notSaid.push("goal");

  next.distance = said.subjectDistanceM != null ? String(said.subjectDistanceM) : "";
  if (said.subjectDistanceM == null) notSaid.push("distance");

  next.support = said.support ?? "hand";
  if (!said.support) notSaid.push("support");

  next.lowSun = said.lowSun === true;
  next.sunBehindSubject = said.sunBehindSubject === true;
  next.sunAhead = said.sunAhead === true;

  return {
    form: next,
    notSaid,
    assumptions: (parse.assumptions ?? []).map(({ field, why }) => ({ field, why: safeReason(why, words) })),
    notice: null,
  };
}

/** Choosing a subject selects its usual goal. Any other can then be picked. */
export const withSubject = (form: TestForm, subject: Subject): TestForm => ({
  ...form,
  subject,
  goal: effectiveGoal({ subject }),
});

/** The goal list marks the subject's usual goal. */
export const marksAsUsual = (goal: Goal, subject: Subject) => goal === effectiveGoal({ subject });

const INDOOR_PREFIX = "indoor_";

/** The indoor light a Scene choice means, or null for the three outdoor scenes. */
export const asIndoor = (scene: AnyScene) =>
  scene.startsWith(INDOOR_PREFIX) ? (scene.slice(INDOOR_PREFIX.length) as IndoorLight) : null;

/** Outdoors, and for a window or room, the sky outside matters. With lamps or in an office it doesn't. */
export function sceneUsesSky(scene: AnyScene) {
  const indoor = asIndoor(scene);
  return indoor === null || indoor === "window" || indoor === "room";
}

function formLight(form: TestForm): Light {
  if (form.lightKind === "lowlight") return { kind: "lowlight", lowlight: form.lowlight };
  const indoor = asIndoor(form.scene);
  if (indoor === null) return { kind: "daylight", sky: form.sky, scene: form.scene as Exclude<AnyScene, `indoor_${string}`> };
  return sceneUsesSky(form.scene) ? { kind: "indoors", indoor, sky: form.sky } : { kind: "indoors", indoor };
}

export function formToConditions(form: TestForm): Conditions {
  const outsideLightMatters = form.lightKind === "daylight" && sceneUsesSky(form.scene);
  return {
    film: { iso: Number(form.iso), type: form.filmType },
    light: formLight(form),
    subject: form.subject,
    subjectDistanceM: readDistance(form.distance),
    goal: form.goal,
    lowSun: outsideLightMatters && form.lowSun,
    sunBehindSubject: form.sunBehindSubject,
    sunAhead: form.sunAhead,
    support: form.support,
    camera: answersToCamera(form.camera),
  };
}
