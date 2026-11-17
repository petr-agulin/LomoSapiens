// First setup's rules, kept apart from the screens so they can be tested.
import { answersToCamera, FOCAL_LENGTHS, NOT_SURE, type CameraAnswers } from "./cameraAnswers.ts";
import { FASTEST_SHUTTERS, SLOWEST_SHUTTERS, SMALLEST_APERTURES, WIDEST_APERTURES } from "./engine/index.ts";
import type { AppFilmType, Film, Roll, RollDraft } from "./store.ts";
import { strings } from "./strings.ts";

export type QuestionKey = keyof CameraAnswers;

/** The six questions, lens first, then the shutter speed dial, as on the camera. */
export const CAMERA_QUESTIONS: { key: QuestionKey; group: "lens" | "dial" }[] = [
  { key: "widestAperture", group: "lens" },
  { key: "smallestAperture", group: "lens" },
  { key: "focalLengthMm", group: "lens" },
  { key: "fastestShutter", group: "dial" },
  { key: "slowestShutter", group: "dial" },
  { key: "hasBulb", group: "dial" },
];

/** The answers each question offers: the engine's own values, then "Not sure" on every question but B. */
export function optionsFor(key: QuestionKey): { value: string }[] {
  const values: readonly string[] = {
    widestAperture: WIDEST_APERTURES,
    smallestAperture: SMALLEST_APERTURES,
    focalLengthMm: FOCAL_LENGTHS.map(String),
    fastestShutter: FASTEST_SHUTTERS,
    slowestShutter: SLOWEST_SHUTTERS,
    hasBulb: ["yes", "no"],
  }[key];
  return [...values, ...(key === "hasBulb" ? [] : [NOT_SURE])].map((value) => ({ value }));
}

export interface ShownValue {
  before: string;
  big: string;
  after: string;
}

/** A value as the camera marks it: a small f/, 1/, mm or s around a big number. */
export function shownValue(key: QuestionKey, value: string): ShownValue {
  const shown = (before: string, big: string, after = "") => ({ before, big, after });
  if (value === NOT_SURE) return shown("", strings.app.setup.notSure);
  switch (key) {
    case "widestAperture":
    case "smallestAperture":
      return shown("f/", value);
    case "focalLengthMm":
      return shown("", value, "mm");
    case "fastestShutter":
    case "slowestShutter":
      return value === "1" ? shown("", "1", "s") : shown("1/", value.slice(2));
    case "hasBulb":
      return shown("", value === "yes" ? strings.app.questions.yes : strings.app.questions.no);
  }
}

/** The four film speeds offered as tiles. Any other is typed. */
export const FILM_SPEEDS = ["100", "200", "400", "800"] as const;
export type SpeedChoice = (typeof FILM_SPEEDS)[number] | "other";

/**
 * The usual roll lengths, offered as tiles; any other is typed. Source: Wikipedia, "135 film",
 * section "Length": 36 exposures is the standard full roll, 24 and 12 the shorter rolls sold since about 1980, and
 * 20 the shorter roll before then. Its 27 exposures are for disposable cameras only, so they aren't offered.
 */
export const FRAME_COUNTS = ["12", "20", "24", "36"] as const;
export type FramesChoice = (typeof FRAME_COUNTS)[number] | "other";

/** What the user has answered so far, before the camera or the roll is saved. */
export interface SetupDraft {
  /** The camera's name. */
  name: string;
  answers: CameraAnswers;
  speed: SpeedChoice;
  otherSpeed: string;
  type: AppFilmType;
  frames: FramesChoice;
  otherFrames: string;
  /** The roll's own name, such as what's printed on the box. */
  rollName: string;
}

/**
 * A new camera starts at "Not sure" on every question, and without B: the safe side, so the app never
 * suggests a setting the camera may not have. The film starts at ISO 400 colour, as in the design.
 */
export const newDraft = (): SetupDraft => ({
  name: "",
  answers: {
    widestAperture: NOT_SURE,
    smallestAperture: NOT_SURE,
    focalLengthMm: NOT_SURE,
    fastestShutter: NOT_SURE,
    slowestShutter: NOT_SURE,
    hasBulb: "no",
  },
  speed: "400",
  otherSpeed: "",
  type: "color_negative",
  frames: "36",
  otherFrames: "",
  rollName: "",
});

/** A typed film speed: a whole number above 0, of up to five digits. Anything else is refused. */
export function parseIso(text: string): number | null {
  const typed = text.trim();
  if (!/^\d{1,5}$/.test(typed)) return null;
  const iso = Number(typed);
  return iso > 0 ? iso : null;
}

/** A typed number of frames on a roll: a whole number from 1 to 99. Anything else is refused. */
export function parseFrames(text: string): number | null {
  const typed = text.trim();
  if (!/^\d{1,2}$/.test(typed)) return null;
  const frames = Number(typed);
  return frames >= 1 ? frames : null;
}

/** The film speed the draft holds, picked or typed, or null while a typed one isn't valid. */
export const draftIso = (draft: SetupDraft): number | null => (draft.speed === "other" ? parseIso(draft.otherSpeed) : Number(draft.speed));

/** The roll's length the draft holds, picked or typed, or null while a typed one isn't valid. */
export const draftFrames = (draft: SetupDraft): number | null => (draft.frames === "other" ? parseFrames(draft.otherFrames) : Number(draft.frames));

/** The roll the draft describes, or null while a typed speed or length isn't valid. */
export function draftRoll(draft: SetupDraft): RollDraft | null {
  const iso = draftIso(draft);
  const frames = draftFrames(draft);
  return iso && frames ? { iso, type: draft.type, frames, name: draft.rollName.trim() } : null;
}

/** The film step, opened on a camera's roll for Roll details. An empty camera starts at 36 frames of ISO 400 colour, as first setup does. */
export function rollDraft(cameraName: string, roll: Roll | null): SetupDraft {
  const start = { ...newDraft(), name: cameraName };
  if (!roll) return start;
  const speed = FILM_SPEEDS.find((tile) => Number(tile) === roll.iso);
  const frames = FRAME_COUNTS.find((tile) => Number(tile) === roll.frames);
  return {
    ...start,
    speed: speed ?? "other",
    otherSpeed: speed ? "" : String(roll.iso),
    type: roll.type,
    frames: frames ?? "other",
    otherFrames: frames ? "" : String(roll.frames),
    rollName: roll.name,
  };
}

/** A camera in one line, as its card in Settings shows it: "40 mm · f/2.8 · 1/15 to 1/250". Not sure counts as the app counts it. */
export function cameraSpec(answers: CameraAnswers) {
  const camera = answersToCamera(answers);
  return strings.app.cameras.spec(camera.focalLengthMm, camera.widestAperture, strings.engine.shutter(camera.slowestShutter), camera.fastestShutter);
}

/** The film on a camera's card: "ISO 400 colour", "ISO 200 black and white", or "No film loaded". */
export function filmLine(film: Film | null) {
  const text = strings.app.cameras;
  if (!film) return text.noFilm;
  return film.type === "bw_negative" ? text.blackAndWhite(film.iso) : text.colour(film.iso);
}

/** The film in the pill: "400 colour", "100 B&W", or "No film". */
export function filmLabel(film: Film | null) {
  const pill = strings.app.pill;
  if (!film) return pill.noFilm;
  return film.type === "bw_negative" ? pill.blackAndWhite(film.iso) : pill.colour(film.iso);
}
