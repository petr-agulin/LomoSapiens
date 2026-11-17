// What the app keeps between visits: the user's cameras, each with the roll loaded in it, the camera in
// use, how the camera is held, the last shot, and the roll history: finished rolls, and the
// frames the user recorded. Kept in this browser only (hard rule 7 is about keys; this data holds no key).
// Every change returns a new state, so screens can't edit it by accident; a change the app can't keep
// returns the very state it was given.
import { answersToCamera, NOT_SURE, type CameraAnswers } from "./cameraAnswers.ts";
import { isDay, isMinute, now, today } from "./dates.ts";
import { APERTURE_INDEX, SHUTTER_INDEX, isKnownCamera, lensSupported } from "./engine/index.ts";
import type {
  Aperture,
  FilmType,
  Focus,
  Goal,
  IndoorLight,
  LowLight,
  Scene,
  Shutter,
  Sky,
  Subject,
  Support,
} from "./engine/types.ts";
import type { Store } from "./settings.ts";
import { strings } from "./strings.ts";

export const STORE_KEY = "lomosapiens.data";
/** Where saved data the app can't read is kept, rather than lost, the first time it happens. */
const UNREADABLE_KEY = `${STORE_KEY}.unreadable`;
/** Version 1: cameras and their films. Version 2 adds the roll history; version 1 is upgraded on loading. */
const VERSION = 2;
/** The saved data's version, as a backup file names it. */
export const DATA_VERSION = VERSION;

/** The app offers colour and black and white negative film. Slide film isn't supported. */
export type AppFilmType = Exclude<FilmType, "slide">;

export interface Film {
  iso: number;
  type: AppFilmType;
}

/** A roll of film: its speed and colour, how many frames it has, the user's name for it, and the day it went in. */
export interface Roll extends Film {
  id: string;
  /** Frames on the roll, from the box: 24, 36 or another number from 1 to 99. */
  frames: number;
  /** The user's own name, such as what's printed on the box, or "" for none. */
  name: string;
  /** "2026-11-14". */
  loadedOn: string;
}

/** What loading a roll is given: the film, with the length and the name when the user gave them. */
export type RollDraft = Film & { frames?: number; name?: string };

/** A roll taken out of its camera. It keeps the camera's id, and its name for when the camera is deleted. */
export interface FinishedRoll extends Roll {
  cameraId: string;
  cameraName: string;
  finishedOn: string;
}

export interface SavedCamera {
  id: string;
  /** The user's own name for it. The app never names a camera model. */
  name: string;
  answers: CameraAnswers;
  /** The roll loaded in this camera, or null when it's empty. Each camera holds one roll at most. */
  film: Roll | null;
}

/** The evening and night lights. "Home interior, lamps" is "Lamps only" in the Indoors group. */
export type EveningLight = Exclude<LowLight, "home_lamps">;

/** The light step's answer. "Outside, by day" always has a place; the other groups don't take one. */
export type LightChoice =
  | { group: "day"; sky: Sky; place: Scene }
  | { group: "evening"; lowlight: EveningLight }
  | { group: "indoors"; indoor: IndoorLight };

/** Everything the user answered for one shot, as the next shot's starting point. */
export interface ShotAnswers {
  light: LightChoice;
  lowSun: boolean;
  stormOutside: boolean;
  subject: Subject;
  /** A distance the user typed, or null for the subject's usual one. */
  distanceM: number | null;
  goal: Goal;
  sunBehind: boolean;
}

/** The settings as they were advised, kept as they were: Home shows them, never recalculated. */
export interface ShotSummary {
  aperture: Aperture;
  shutter: Shutter;
  bulbSeconds: number | null;
  focus: Focus;
}

export interface LastShot {
  answers: ShotAnswers;
  result: ShotSummary;
}

/** The labels after developing, in the order the app shows them. */
export const LABELS = ["good", "too_dark", "too_light", "out_of_focus", "movement", "other"] as const;
export type FrameLabel = (typeof LABELS)[number];

/** What the user set on the camera for a frame. B keeps its seconds; a focus of null is ∞. */
export interface SetSettings {
  aperture: Aperture;
  shutter: Shutter;
  bulbSeconds: number | null;
  focusM: number | null;
}

/** One shot the user took and recorded: a frame on a roll. */
export interface Frame {
  id: string;
  rollId: string;
  /** As on the camera's frame counter, from 1 to 99. Two frames may share a number: both are kept. */
  number: number;
  /** When it was recorded, to the minute: "2026-11-14T15:42". */
  recordedAt: string;
  /** What the user set, which may differ from the advice. */
  set: SetSettings;
  /** The engine's advice as it was given, never recalculated. */
  advice: ShotSummary;
  answers: ShotAnswers;
  hold: Support;
  note: string;
  /** The photo of the scene: its key among the photos kept on the phone, or null. */
  photo: string | null;
  labels: FrameLabel[];
  developedNote: string;
}

/** What recording a frame is given. The app adds the id and the time; the labels come after developing. */
export type FrameDraft = Omit<Frame, "id" | "recordedAt" | "labels" | "developedNote">;

export interface AppState {
  cameras: SavedCamera[];
  /** The camera new shots use. Null only when there's no camera yet. */
  inUse: string | null;
  /** How the user holds the camera: a setting, not asked for each shot. */
  hold: Support;
  lastShot: LastShot | null;
  /** Rolls taken out of their cameras, in the order they were finished. */
  rolls: FinishedRoll[];
  /** Every frame recorded, on any roll, in the order recorded. */
  frames: Frame[];
}

export const EMPTY_STATE: AppState = { cameras: [], inUse: null, hold: "hand", lastShot: null, rolls: [], frames: [] };

const MAX_NUMBER = 99;
const DEFAULT_FRAMES = 36;
const MAX_NAME = 40;
const MAX_NOTE = 200;

// ---------------------------------------------------------------- reading

export const isSetUp = (state: AppState) => state.cameras.length > 0;

export const cameraInUse = (state: AppState): SavedCamera | null =>
  state.cameras.find((camera) => camera.id === state.inUse) ?? null;

/** The rolls in cameras, the camera in use first, then in the cameras' order. Empty cameras are left out. */
export function rollsInCameras(state: AppState): { roll: Roll; camera: SavedCamera }[] {
  const inUseFirst = [...state.cameras].sort((a, b) => Number(b.id === state.inUse) - Number(a.id === state.inUse));
  return inUseFirst.flatMap((camera) => (camera.film ? [{ roll: camera.film, camera }] : []));
}

/** Finished rolls, the most recently finished first. */
export const finishedRolls = (state: AppState): FinishedRoll[] =>
  [...state.rolls].sort(
    (a, b) => b.finishedOn.localeCompare(a.finishedOn) || b.loadedOn.localeCompare(a.loadedOn) || idNumber(b.id) - idNumber(a.id),
  );

/**
 * A roll wherever it is, with its camera's name: the camera's name as it is now, or as it was when the
 * camera was deleted. `finishedOn` is null for a roll still in its camera.
 */
export function findRoll(
  state: AppState,
  rollId: string,
): { roll: Roll; cameraId: string; cameraName: string; finishedOn: string | null } | null {
  const camera = state.cameras.find((saved) => saved.film?.id === rollId);
  if (camera?.film) return { roll: camera.film, cameraId: camera.id, cameraName: camera.name, finishedOn: null };
  const finished = state.rolls.find((roll) => roll.id === rollId);
  if (!finished) return null;
  const owner = state.cameras.find((saved) => saved.id === finished.cameraId);
  return { roll: finished, cameraId: finished.cameraId, cameraName: owner?.name ?? finished.cameraName, finishedOn: finished.finishedOn };
}

/** A roll's frames, by frame number, then in the order they were recorded. */
export const framesOn = (state: AppState, rollId: string): Frame[] =>
  state.frames
    .filter((frame) => frame.rollId === rollId)
    .sort((a, b) => a.number - b.number || a.recordedAt.localeCompare(b.recordedAt) || idNumber(a.id) - idNumber(b.id));

/**
 * Home's last recorded frame: on the roll in a camera that was last recorded on, whichever
 * camera that is, the frame furthest along it, where its film has got to. A frame added later with a lower number
 * still brings Home to its roll. Frames of finished rolls are left out. Null when no roll in a camera has a frame.
 */
export function lastRecordedFrame(state: AppState): { frame: Frame; roll: Roll; camera: SavedCamera } | null {
  const loaded = new Map(state.cameras.flatMap((camera) => (camera.film ? [[camera.film.id, camera] as const] : [])));
  let latest: Frame | null = null;
  for (const frame of state.frames) {
    if (!loaded.has(frame.rollId)) continue;
    if (!latest || frame.recordedAt.localeCompare(latest.recordedAt) > 0 || (frame.recordedAt === latest.recordedAt && idNumber(frame.id) > idNumber(latest.id))) latest = frame;
  }
  if (!latest) return null;
  const camera = loaded.get(latest.rollId)!;
  const onRoll = framesOn(state, latest.rollId);
  return { frame: onRoll[onRoll.length - 1], roll: camera.film!, camera };
}

/** How many frames are recorded on a roll. */
export const recordedCount = (state: AppState, rollId: string) => state.frames.filter((frame) => frame.rollId === rollId).length;

/** The number the next frame on a roll starts at: the highest recorded plus 1, or 1 on a new roll, up to 99. */
export function nextFrameNumber(state: AppState, rollId: string): number {
  const numbers = state.frames.filter((frame) => frame.rollId === rollId).map((frame) => frame.number);
  return Math.min(MAX_NUMBER, Math.max(0, ...numbers) + 1);
}

// ---------------------------------------------------------------- cameras

/** "My camera" for the first, then "Camera 2", "Camera 3" and so on, never repeating a name. */
export function defaultCameraName(state: AppState) {
  if (state.cameras.length === 0) return strings.app.firstCameraName;
  const taken = new Set(state.cameras.map((camera) => camera.name));
  let number = state.cameras.length + 1;
  while (taken.has(strings.app.cameraName(number))) number += 1;
  return strings.app.cameraName(number);
}

const idNumber = (id: string) => Number(/(\d+)$/.exec(id)?.[1] ?? 0);
const nextId = (prefix: string, ids: string[]) => `${prefix}${Math.max(0, ...ids.filter((id) => id.startsWith(prefix)).map(idNumber)) + 1}`;

/** A new camera's id. Never one a finished roll still names, so a deleted camera's rolls keep its name. */
const nextCameraId = (state: AppState) => nextId("c", [...state.cameras.map((camera) => camera.id), ...state.rolls.map((roll) => roll.cameraId)]);
const nextRollId = (state: AppState) =>
  nextId("r", [...state.cameras.flatMap((camera) => (camera.film ? [camera.film.id] : [])), ...state.rolls.map((roll) => roll.id)]);
const nextFrameId = (state: AppState) => nextId("f", state.frames.map((frame) => frame.id));

/** Adds a camera, with a roll loaded that day if one is given. The first camera becomes the one in use; later ones don't, until the user switches. */
export function addCamera(
  state: AppState,
  { name, answers, film }: { name: string; answers: CameraAnswers; film: RollDraft | null },
  day = today(),
): { state: AppState; id: string } {
  const id = nextCameraId(state);
  const camera: SavedCamera = { id, name: name.trim() || defaultCameraName(state), answers, film: film && makeRoll(state, film, day) };
  return { state: { ...state, cameras: [...state.cameras, camera], inUse: state.inUse ?? id }, id };
}

export const setInUse = (state: AppState, id: string): AppState =>
  state.cameras.some((camera) => camera.id === id) ? { ...state, inUse: id } : state;

export const setHold = (state: AppState, hold: Support): AppState => ({ ...state, hold });

export const setLastShot = (state: AppState, lastShot: LastShot): AppState => ({ ...state, lastShot });

const changeCamera = (state: AppState, id: string, change: (camera: SavedCamera) => SavedCamera): AppState =>
  state.cameras.some((camera) => camera.id === id)
    ? { ...state, cameras: state.cameras.map((camera) => (camera.id === id ? change(camera) : camera)) }
    : state;

/** Renames a camera as the user types. An emptied name gets the default, as a new camera would. */
export function renameCamera(state: AppState, id: string, name: string): AppState {
  const others = { ...state, cameras: state.cameras.filter((camera) => camera.id !== id) };
  return changeCamera(state, id, (camera) => ({ ...camera, name: name.trim() || defaultCameraName(others) }));
}

/** Changes one answer about the camera, such as its focal length after swapping lenses. */
export const setAnswer = (state: AppState, id: string, key: keyof CameraAnswers, value: string): AppState =>
  changeCamera(state, id, (camera) => ({ ...camera, answers: { ...camera.answers, [key]: value } as CameraAnswers }));

/**
 * Deletes a camera. Its roll is finished that day and stays in the history with its frames, under the
 * camera's name. If it was in use, the first camera left takes over. Deleting the
 * last one starts the app again from first setup, keeping how the camera is held and the history.
 */
export function deleteCamera(state: AppState, id: string, day = today()): AppState {
  const camera = state.cameras.find((saved) => saved.id === id);
  if (!camera) return state;
  const emptied = finishRoll(state, id, day);
  if (camera.film && emptied === state) return state;
  const cameras = emptied.cameras.filter((saved) => saved.id !== id);
  if (cameras.length === 0) return { ...EMPTY_STATE, hold: state.hold, rolls: emptied.rolls, frames: emptied.frames };
  return { ...emptied, cameras, inUse: state.inUse === id ? cameras[0].id : state.inUse };
}

/** The camera that would take over if this one were deleted, or null if none would. */
export const nextInUse = (state: AppState, id: string): SavedCamera | null =>
  state.inUse === id ? (state.cameras.find((camera) => camera.id !== id) ?? null) : null;

// ---------------------------------------------------------------- rolls

/** A trimmed text, cut to its longest. */
const fit = (text: string, max: number) => text.trim().slice(0, max).trimEnd();

function makeRoll(state: AppState, draft: RollDraft, day: string): Roll | null {
  const frames = draft.frames ?? DEFAULT_FRAMES;
  if (!isFilm(draft) || !isWhole(frames, 1, MAX_NUMBER) || !isDay(day)) return null;
  return { id: nextRollId(state), iso: draft.iso, type: draft.type, frames, name: fit(draft.name ?? "", MAX_NAME), loadedOn: day };
}

/** Loads a new roll into a camera that day. A roll already in it is finished first, keeping its frames. */
export function loadRoll(state: AppState, cameraId: string, draft: RollDraft, day = today()): AppState {
  const camera = state.cameras.find((saved) => saved.id === cameraId);
  if (!camera) return state;
  const emptied = camera.film ? finishRoll(state, cameraId, day) : state;
  const roll = makeRoll(emptied, draft, day);
  if (!roll || (camera.film && emptied === state)) return state;
  return changeCamera(emptied, cameraId, (saved) => ({ ...saved, film: roll }));
}

/** Takes the roll out of a camera that day. It stays in the history, with the camera's name and its frames. */
export function finishRoll(state: AppState, cameraId: string, day = today()): AppState {
  const camera = state.cameras.find((saved) => saved.id === cameraId);
  if (!camera?.film || !isDay(day)) return state;
  const finished: FinishedRoll = { ...camera.film, cameraId, cameraName: camera.name, finishedOn: day };
  return { ...changeCamera(state, cameraId, (saved) => ({ ...saved, film: null })), rolls: [...state.rolls, finished] };
}

/** Changes a roll's details, in a camera or finished. Only a finished roll has a finishing day to change. */
export function editRoll(
  state: AppState,
  rollId: string,
  change: Partial<Pick<Roll, "iso" | "type" | "frames" | "name" | "loadedOn">> & { finishedOn?: string },
): AppState {
  const fix = <R extends Roll>(roll: R): R | null => {
    const next = {
      ...roll,
      iso: change.iso ?? roll.iso,
      type: change.type ?? roll.type,
      frames: change.frames ?? roll.frames,
      name: change.name === undefined ? roll.name : fit(change.name, MAX_NAME),
      loadedOn: change.loadedOn ?? roll.loadedOn,
    };
    return isRoll(next) ? next : null;
  };
  const camera = state.cameras.find((saved) => saved.film?.id === rollId);
  if (camera?.film) {
    const next = change.finishedOn === undefined ? fix(camera.film) : null;
    return next ? changeCamera(state, camera.id, (saved) => ({ ...saved, film: next })) : state;
  }
  const finished = state.rolls.find((roll) => roll.id === rollId);
  const next = finished && fix({ ...finished, finishedOn: change.finishedOn ?? finished.finishedOn });
  if (!next || !isDay(next.finishedOn)) return state;
  return { ...state, rolls: state.rolls.map((roll) => (roll.id === rollId ? next : roll)) };
}

/** Deletes a roll and its frames, in a camera or finished. A camera whose roll is deleted is empty. */
export function deleteRoll(state: AppState, rollId: string): AppState {
  if (!findRoll(state, rollId)) return state;
  return {
    ...state,
    cameras: state.cameras.map((camera) => (camera.film?.id === rollId ? { ...camera, film: null } : camera)),
    rolls: state.rolls.filter((roll) => roll.id !== rollId),
    frames: state.frames.filter((frame) => frame.rollId !== rollId),
  };
}

// ---------------------------------------------------------------- frames

const copySet = ({ aperture, shutter, bulbSeconds, focusM }: SetSettings): SetSettings => ({ aperture, shutter, bulbSeconds, focusM });

/** A frame numbered past the roll's end makes the roll that long, never shorter. */
function longEnoughFor(state: AppState, rollId: string, number: number): AppState {
  const found = findRoll(state, rollId);
  if (!found || number <= found.roll.frames) return state;
  if (found.finishedOn === null) return changeCamera(state, found.cameraId, (camera) => ({ ...camera, film: camera.film && { ...camera.film, frames: number } }));
  return { ...state, rolls: state.rolls.map((roll) => (roll.id === rollId ? { ...roll, frames: number } : roll)) };
}

/** Records a frame on a roll, at the given minute. Returns a null id, and the state as it was, if it can't be kept. */
export function recordFrame(state: AppState, draft: FrameDraft, at = now()): { state: AppState; id: string | null } {
  const id = nextFrameId(state);
  const frame: Frame = {
    id,
    rollId: draft.rollId,
    number: draft.number,
    recordedAt: at,
    set: isObject(draft.set) ? copySet(draft.set) : draft.set,
    advice: draft.advice,
    answers: draft.answers,
    hold: draft.hold,
    note: typeof draft.note === "string" ? fit(draft.note, MAX_NOTE) : draft.note,
    photo: draft.photo,
    labels: [],
    developedNote: "",
  };
  if (!findRoll(state, draft.rollId) || !isFrame(frame)) return { state, id: null };
  return { state: longEnoughFor({ ...state, frames: [...state.frames, frame] }, frame.rollId, frame.number), id };
}

/** Changes a frame: its number and settings, its note and photo, or its labels after developing. Never its advice or time. */
export function editFrame(
  state: AppState,
  frameId: string,
  change: Partial<Pick<Frame, "number" | "set" | "note" | "photo" | "labels" | "developedNote">>,
): AppState {
  const frame = state.frames.find((saved) => saved.id === frameId);
  if (!frame) return state;
  const next: Frame = {
    ...frame,
    number: change.number ?? frame.number,
    set: change.set ? copySet(change.set) : frame.set,
    note: change.note === undefined ? frame.note : fit(change.note, MAX_NOTE),
    photo: change.photo === undefined ? frame.photo : change.photo,
    labels: change.labels === undefined ? frame.labels : LABELS.filter((label) => change.labels?.includes(label)),
    developedNote: change.developedNote === undefined ? frame.developedNote : fit(change.developedNote, MAX_NOTE),
  };
  if (!isFrame(next)) return state;
  return longEnoughFor({ ...state, frames: state.frames.map((saved) => (saved.id === frameId ? next : saved)) }, next.rollId, next.number);
}

export const deleteFrame = (state: AppState, frameId: string): AppState =>
  state.frames.some((frame) => frame.id === frameId) ? { ...state, frames: state.frames.filter((frame) => frame.id !== frameId) } : state;

// ---------------------------------------------------------------- saving and loading

/** Saves the state. Returns false when the browser won't keep it, such as in a full or blocked storage. */
export function saveState(store: Store | null, state: AppState): boolean {
  if (!store) return false;
  try {
    store.setItem(STORE_KEY, JSON.stringify({ version: VERSION, ...state }));
    return true;
  } catch {
    return false;
  }
}

/** The version of the saved data, or null when nothing readable is saved. */
export function savedVersion(store: Store | null): number | null {
  try {
    const text = store?.getItem(STORE_KEY);
    const saved: unknown = text ? JSON.parse(text) : null;
    return isObject(saved) && typeof saved.version === "number" ? saved.version : null;
  } catch {
    return null;
  }
}

/**
 * Reads the saved state, upgrading version 1 data: each camera's film becomes its roll of 36, loaded on
 * `day`. Anything that can't be read, or that the engine wouldn't accept, is left out rather than trusted:
 * a bad camera, roll or frame is dropped on its own. Saved data that can't be read at all starts the app
 * empty, and is first kept aside under another key, so it is never lost.
 */
export function loadState(store: Store | null, day = today()): AppState {
  let text: string | null | undefined;
  try {
    text = store?.getItem(STORE_KEY);
  } catch {
    return EMPTY_STATE;
  }
  if (!text) return EMPTY_STATE;
  const saved = parsed(text);
  if (!isObject(saved) || (saved.version !== 1 && saved.version !== VERSION) || !Array.isArray(saved.cameras)) {
    keepAside(store, text);
    return EMPTY_STATE;
  }

  let upgraded = 0;
  const cameras = saved.cameras.flatMap((item): SavedCamera[] => {
    if (!isObject(item) || typeof item.id !== "string" || typeof item.name !== "string" || !isCameraAnswers(item.answers)) {
      return [];
    }
    let film: Roll | null = null;
    if (saved.version === 1 && isFilm(item.film)) {
      upgraded += 1;
      film = { id: `r${upgraded}`, iso: item.film.iso, type: item.film.type, frames: DEFAULT_FRAMES, name: "", loadedOn: day };
    } else if (isRoll(item.film)) {
      film = readRoll(item.film);
    }
    return [{ id: item.id, name: item.name, answers: item.answers, film }];
  });
  const rolls = (Array.isArray(saved.rolls) ? saved.rolls : []).flatMap((item): FinishedRoll[] =>
    isFinishedRoll(item) ? [{ ...readRoll(item), cameraId: item.cameraId, cameraName: item.cameraName, finishedOn: item.finishedOn }] : [],
  );
  const rollIds = new Set([...cameras.flatMap((camera) => (camera.film ? [camera.film.id] : [])), ...rolls.map((roll) => roll.id)]);
  const frames = (Array.isArray(saved.frames) ? saved.frames : []).flatMap((item): Frame[] => {
    const frame = readFrame(item);
    return frame && rollIds.has(frame.rollId) ? [frame] : [];
  });
  const inUse = cameras.some((camera) => camera.id === saved.inUse) ? (saved.inUse as string) : (cameras[0]?.id ?? null);
  return {
    cameras,
    inUse,
    hold: SUPPORTS.includes(saved.hold as Support) ? (saved.hold as Support) : "hand",
    lastShot: isLastShot(saved.lastShot) ? saved.lastShot : null,
    rolls,
    frames,
  };
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function keepAside(store: Store | null, text: string) {
  try {
    if (store && store.getItem(UNREADABLE_KEY) === null) store.setItem(UNREADABLE_KEY, text);
  } catch {
    // Nothing more can be done without storage.
  }
}

/** Only the fields a roll has, so nothing unknown is carried along. */
const readRoll = (roll: Roll): Roll => ({ id: roll.id, iso: roll.iso, type: roll.type, frames: roll.frames, name: roll.name, loadedOn: roll.loadedOn });

/** A saved frame, with any label the app doesn't know dropped, or null if the frame can't be read. */
function readFrame(value: unknown): Frame | null {
  if (!isObject(value) || !Array.isArray(value.labels)) return null;
  const candidate = { ...value, labels: LABELS.filter((label) => (value.labels as unknown[]).includes(label)) };
  if (!isFrame(candidate)) return null;
  const { id, rollId, number, recordedAt, set, advice, answers, hold, note, photo, labels, developedNote } = candidate;
  return { id, rollId, number, recordedAt, set: copySet(set), advice, answers, hold, note, photo, labels, developedNote };
}

// ---------------------------------------------------------------- checks for saved data

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T => values.includes(value as T);
const isWhole = (value: unknown, low: number, high: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= low && value <= high;
const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

const SUPPORTS: Support[] = ["hand", "braced", "surface"];
const SKIES: Sky[] = ["sun", "sun_haze", "sun_behind_clouds", "overcast", "storm"];
const SCENES: Scene[] = ["snow_sand", "open", "under_trees"];
const EVENING: Exclude<LowLight, "home_lamps">[] = ["sun_low", "sun_just_set", "dusk", "street_night", "floodlit"];
const INDOORS: IndoorLight[] = ["window", "room", "lamps", "office"];
const SUBJECTS: Subject[] = ["portrait", "two_people", "group", "landscape", "other"];
const GOALS: Goal[] = ["blur", "sharp", "moving"];
const FOCUS_SOURCES: Focus["source"][] = ["default", "given", "landscape"];

function isCameraAnswers(value: unknown): value is CameraAnswers {
  if (!isObject(value) || (value.hasBulb !== "yes" && value.hasBulb !== "no")) return false;
  const focal = value.focalLengthMm;
  if (focal !== NOT_SURE && !(typeof focal === "string" && Number.isFinite(Number(focal)))) return false;
  const camera = answersToCamera(value as unknown as CameraAnswers);
  return isKnownCamera(camera) && lensSupported(camera);
}

function isFilm(value: unknown): value is Film {
  return isObject(value) && isPositive(value.iso) && oneOf<AppFilmType>(["color_negative", "bw_negative"], value.type);
}

function isRoll(value: unknown): value is Roll {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    isWhole(value.frames, 1, MAX_NUMBER) &&
    isText(value.name, MAX_NAME) &&
    isDay(value.loadedOn) &&
    isFilm(value)
  );
}

function isFinishedRoll(value: unknown): value is FinishedRoll {
  return isObject(value) && typeof value.cameraId === "string" && typeof value.cameraName === "string" && isDay(value.finishedOn) && isRoll(value);
}

const isAperture = (value: unknown): value is Aperture => typeof value === "string" && Object.hasOwn(APERTURE_INDEX, value);
const isTimedShutter = (value: unknown) => typeof value === "string" && value !== "B" && Object.hasOwn(SHUTTER_INDEX, value);

/** B always has its seconds; a timed speed never has any. A focus is null (∞) or a distance under 1000 m. */
function isSetSettings(value: unknown): value is SetSettings {
  if (!isObject(value) || !isAperture(value.aperture)) return false;
  const timed = isTimedShutter(value.shutter) && value.bulbSeconds === null;
  const bulb = value.shutter === "B" && isPositive(value.bulbSeconds);
  const focus = value.focusM === null || (isPositive(value.focusM) && value.focusM < 1000);
  return (timed || bulb) && focus;
}

function isFrame(value: unknown): value is Frame {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.rollId === "string" &&
    isWhole(value.number, 1, MAX_NUMBER) &&
    isMinute(value.recordedAt) &&
    isSetSettings(value.set) &&
    isShotSummary(value.advice) &&
    isShotAnswers(value.answers) &&
    oneOf(SUPPORTS, value.hold) &&
    isText(value.note, MAX_NOTE) &&
    (value.photo === null || typeof value.photo === "string") &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => oneOf(LABELS, label)) &&
    isText(value.developedNote, MAX_NOTE)
  );
}

function isLightChoice(value: unknown): value is LightChoice {
  if (!isObject(value)) return false;
  if (value.group === "day") return oneOf(SKIES, value.sky) && oneOf(SCENES, value.place);
  if (value.group === "evening") return oneOf(EVENING, value.lowlight);
  if (value.group === "indoors") return oneOf(INDOORS, value.indoor);
  return false;
}

function isShotAnswers(value: unknown): value is ShotAnswers {
  return (
    isObject(value) &&
    isLightChoice(value.light) &&
    typeof value.lowSun === "boolean" &&
    typeof value.stormOutside === "boolean" &&
    oneOf(SUBJECTS, value.subject) &&
    (value.distanceM === null || (typeof value.distanceM === "number" && value.distanceM > 0)) &&
    oneOf(GOALS, value.goal) &&
    typeof value.sunBehind === "boolean"
  );
}

function isShotSummary(value: unknown): value is ShotSummary {
  if (!isObject(value) || !isObject(value.focus)) return false;
  const { meters, source } = value.focus;
  return (
    isAperture(value.aperture) &&
    (value.shutter === "B" || isTimedShutter(value.shutter)) &&
    (value.bulbSeconds === null || typeof value.bulbSeconds === "number") &&
    (meters === null || typeof meters === "number") &&
    oneOf(FOCUS_SOURCES, source)
  );
}

const isLastShot = (value: unknown): value is LastShot =>
  isObject(value) && isShotAnswers(value.answers) && isShotSummary(value.result);
