// Recording a shot: the form starts from the advice,
// the user changes what they set differently, and the frame keeps both. How far the settings are from the
// advice is counted in steps of light with the engine's own light numbers (ENGINE_SPEC section 2): plain
// maths, no new facts.
import { lightNumber } from "./engine/light.ts";
import type { Aperture, Shutter, Support } from "./engine/types.ts";
import type { Frame, FrameDraft, SetSettings, ShotAnswers, ShotSummary } from "./store.ts";
import { strings } from "./strings.ts";

const text = strings.app.record;

/** The record form as the user fills it in. Only the frame number is typed on the form itself. */
export interface RecordDraft {
  number: string;
  aperture: Aperture;
  shutter: Shutter;
  /** B's seconds, kept when the shutter is B. */
  bulbSeconds: number | null;
  /** Null is ∞. */
  focusM: number | null;
  note: string;
  /** The photo of the scene, by its key among the photos on the phone. */
  photo: string | null;
}

/** The form's start, or a frame recorded straight from the result: the advice, the next frame number on the roll, and the photo just taken, if any. */
export const recordDraftFrom = (advice: ShotSummary, number: number, photo: string | null = null): RecordDraft => ({
  number: String(number),
  aperture: advice.aperture,
  shutter: advice.shutter,
  bulbSeconds: advice.bulbSeconds,
  focusM: advice.focus.meters,
  note: "",
  photo,
});

/** The form opened on a recorded frame, to change it. */
export const recordDraftOfFrame = (frame: Frame): RecordDraft => ({
  number: String(frame.number),
  aperture: frame.set.aperture,
  shutter: frame.set.shutter,
  bulbSeconds: frame.set.bulbSeconds,
  focusM: frame.set.focusM,
  note: frame.note,
  photo: frame.photo,
});

/** The advice written as settings, to show it the way the frame's own settings are shown. */
export const adviceAsSet = (advice: ShotSummary): SetSettings => ({
  aperture: advice.aperture,
  shutter: advice.shutter,
  bulbSeconds: advice.shutter === "B" ? advice.bulbSeconds : null,
  focusM: advice.focus.meters,
});

/** Whether anything set differs from the advice, focus included. */
export const differsFromAdvice = (set: SetSettings, advice: ShotSummary) => settingsText(set) !== settingsText(adviceAsSet(advice));

/** A frame number typed as on the camera's counter: a whole number from 1 to 99. */
export function parseFrameNumber(typed: string): number | null {
  const trimmed = typed.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return number >= 1 ? number : null;
}

/** What the user set, as the frame keeps it: B with its seconds, a timed speed without. */
export const setOf = (draft: RecordDraft): SetSettings => ({
  aperture: draft.aperture,
  shutter: draft.shutter,
  bulbSeconds: draft.shutter === "B" ? draft.bulbSeconds : null,
  focusM: draft.focusM,
});

/** The frame the form makes, or null while its number isn't valid or B has no seconds. */
export function toFrameDraft(draft: RecordDraft, rollId: string, advice: ShotSummary, answers: ShotAnswers, hold: Support): FrameDraft | null {
  const number = parseFrameNumber(draft.number);
  const set = setOf(draft);
  if (number === null || (set.shutter === "B" && !(set.bulbSeconds && set.bulbSeconds > 0))) return null;
  return { rollId, number, set, advice, answers, hold, note: draft.note.trim(), photo: draft.photo };
}

export type LightDifference =
  | { kind: "as_advised" }
  /** Steps more light than advised: negative is less light. `about` when B's time makes part of a step. */
  | { kind: "steps"; steps: number; about: boolean };

/**
 * How far the light of what was set is from the advice. "As advised" only when nothing was changed; focus
 * doesn't change the light, so a focus changed alone gives the same light.
 */
export function lightDifference(set: SetSettings, advice: ShotSummary): LightDifference {
  if (!differsFromAdvice(set, advice)) return { kind: "as_advised" };
  // A higher light number lets in less light, so the advice's minus what was set is the extra light.
  const exact = lightNumber(advice.aperture, advice.shutter, advice.bulbSeconds) - lightNumber(set.aperture, set.shutter, set.bulbSeconds);
  const steps = Math.round(exact * 2) / 2;
  return { kind: "steps", steps, about: Math.abs(exact - steps) > 1e-9 };
}

/** "1 step more light than advised", "Same light as advised", "About half a step less light than advised". */
export function differenceText(difference: LightDifference): string {
  if (difference.kind === "as_advised") return text.asAdvised;
  const { steps, about } = difference;
  if (steps === 0) return about ? text.aboutSameLight : text.sameLight;
  const count = text.stepCount(Math.abs(steps));
  return steps > 0 ? text.moreLight(count, about) : text.lessLight(count, about);
}

/** The shutter as the camera marks it, in one line: "1/125", "1 s", or "B 4 s". */
export const shutterLine = (shutter: Shutter, bulbSeconds: number | null) =>
  shutter === "B" ? text.bulb(bulbSeconds ?? 1) : shutter === "1" ? text.seconds(1) : shutter;

/** A distance, or ∞: "3 m". */
export const focusLine = (focusM: number | null) => (focusM === null ? text.infinity : text.metres(focusM));

/** A frame's settings in one line: "f/5.6 · 1/125 · 3 m". */
export const settingsText = (set: SetSettings) => [`f/${set.aperture}`, shutterLine(set.shutter, set.bulbSeconds), focusLine(set.focusM)].join(" · ");
