// The result's rules, kept apart from the screen so they can be tested:
// the shutter's three forms, the focus scale, the advice lines, the reasoning and the estimate sheet.
import { isRefusal, recommend } from "./engine/index.ts";
import type { Conditions, Focus, Recommendation, SharpZone, Shutter, Warning } from "./engine/types.ts";
import { strings } from "./strings.ts";

const text = strings.app.result;
const engineText = strings.engine;

/** The shutter as the dial marks it: "1/250", "1 s", or B held for some seconds. */
export type ShutterForm = { form: "fraction"; big: string } | { form: "seconds"; big: string } | { form: "bulb"; seconds: number };

export function shutterForm(shutter: Shutter, bulbSeconds: number | null): ShutterForm {
  if (shutter === "B") return { form: "bulb", seconds: bulbSeconds ?? 1 };
  if (shutter.startsWith("1/")) return { form: "fraction", big: shutter.slice(2) };
  return { form: "seconds", big: shutter };
}

/** The shutter in words for a screen reader: "1/250 of a second", "1 second", "B, held for 8 seconds". */
export function shutterSaid(form: ShutterForm) {
  if (form.form === "bulb") return text.shutterSaid.bulb(form.seconds);
  if (form.form === "seconds") return text.shutterSaid.seconds(Number(form.big));
  return text.shutterSaid.fraction(`1/${form.big}`);
}

/**
 * A line and the settings at its end, so the settings never break across lines: "Low sun (estimate),
 * 1 extra step: " and "f/11, 1/60". A line without settings is all text.
 */
export function splitSettings(line: string) {
  const found = line.match(/^(.*: )(f\/[^:]*|no matching setting)$/);
  return found ? { text: found[1], settings: found[2] } : { text: line, settings: "" };
}

/**
 * A warning in words. "Not enough light" also names the support that would reach the light, with the
 * engine's own settings there. The app never changes the support the user chose.
 */
export function warningLine(conditions: Conditions, warning: Warning) {
  if (warning.code === "not_enough_light" && warning.suggestSupport) {
    const there = recommend({ ...conditions, support: warning.suggestSupport });
    if (!isRefusal(there)) {
      const { aperture, shutter, bulbSeconds } = there.final;
      return engineText.notEnoughLightWith(warning.stops ?? 0, warning.suggestSupport, engineText.settings(aperture, shutter, bulbSeconds));
    }
  }
  return engineText.warning(warning);
}

/** The advice card's warnings. "This value is an estimate." is left out: "Values are estimated" says it. */
export const adviceWarnings = (conditions: Conditions, result: Recommendation) =>
  result.warnings.filter((warning) => warning.code !== "light_estimate").map((warning) => splitSettings(warningLine(conditions, warning)));

/** How the app got there: each step and the settings after it. The last one always matches the film strip. */
export const howSteps = (result: Recommendation) => result.steps.map((step) => splitSettings(engineText.stepLine(step)));

/** The focus distance as the card shows it, without its unit: "1", "2.5" or "∞". */
export const focusNumber = (focus: Focus) => (focus.meters === null ? "∞" : String(focus.meters));

/** The scale's ticks, placed as the design places them, on a log scale from 0.5 m, with ∞ at the end. */
export const SCALE_TICKS = [
  { label: "0.5", metres: 0.5, at: 2 },
  { label: "1", metres: 1, at: 16.9 },
  { label: "2", metres: 2, at: 33.8 },
  { label: "5", metres: 5, at: 56.2 },
  { label: "10", metres: 10, at: 73.1 },
  { label: "∞", metres: null, at: 96 },
] as const;

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Where a distance sits on the scale, in % of its width. 1 m is at 16.9 and each tenfold step adds 56.2,
 * as in the design. Very near and very far distances stop short of the ends, so ∞ stays apart.
 */
export function scaleAt(metres: number | null) {
  if (metres === null) return 96;
  return round1(Math.min(90, Math.max(2, 16.9 + 56.2 * Math.log10(metres))));
}

/** The sharp zone as a band on the scale, the pointer at the set distance, and the tick to make bold, if any. */
export function focusScale(focus: Focus, zone: SharpZone) {
  const left = scaleAt(zone.nearM);
  const right = Math.max(scaleAt(zone.farM), left + 1);
  return {
    left,
    width: round1(right - left),
    mark: scaleAt(focus.meters),
    boldTick: SCALE_TICKS.find((tick) => tick.metres === focus.meters)?.label ?? null,
  };
}

/** Why the values are estimated: the reasons in one line, then one group per affected setting. Null if nothing is. */
export function estimateExplained(conditions: Conditions, result: Recommendation) {
  if (result.estimates.length === 0) return null;
  const light = result.estimates.filter((reason) => reason !== "usual_distance");
  const groups: { title: string; text: string }[] = [];
  if (light.length > 0) groups.push({ title: text.estimateLight, text: light.map((reason) => engineText.estimate.why[reason]).join(" ") });
  const { subject } = conditions;
  const { meters } = result.final.focus;
  if (result.estimates.includes("usual_distance") && meters !== null && (subject === "portrait" || subject === "two_people" || subject === "group")) {
    groups.push({ title: text.estimateFocus, text: engineText.estimate.usualDistance(meters, subject, conditions.camera.focalLengthMm) });
  }
  return { reasons: result.estimates.map((reason) => engineText.estimate.label[reason]).join(" · "), groups };
}

/** The three settings in words, for the Last shot card: "f/4, 1/250, 1 m". */
export function settingsSaid(aperture: string, shutter: Shutter, bulbSeconds: number | null, focus: Focus) {
  const where = focus.meters === null ? "∞" : `${focus.meters} ${text.metres}`;
  return `${engineText.settings(aperture, shutter, bulbSeconds)}, ${where}`;
}
