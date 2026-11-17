// How rolls read on screen: their dates, titles and counts. The words are in strings.ts.
import { filmLine } from "./setup.ts";
import type { Roll } from "./store.ts";
import { strings } from "./strings.ts";

const text = strings.app.rolls;

const partsOf = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, date };
};

/** "3 Nov 2026", or "3 Nov" without the year. */
export function dayText(day: string, withYear = true) {
  const { year, month, date } = partsOf(day);
  const shown = `${date} ${text.months[month - 1]}`;
  return withYear ? `${shown} ${year}` : shown;
}

/** A roll's dates, as short as they stay clear: "3 – 14 Nov 2026", "28 Oct – 3 Nov 2026", "28 Dec 2025 – 3 Jan 2026". */
export function rangeText(from: string, to: string) {
  if (from === to) return dayText(from);
  const start = partsOf(from);
  const end = partsOf(to);
  if (start.year !== end.year) return `${dayText(from)} – ${dayText(to)}`;
  if (start.month !== end.month) return `${dayText(from, false)} – ${dayText(to)}`;
  return `${start.date} – ${dayText(to)}`;
}

/** When a frame was recorded: "14 Nov 2026, 15:42". */
export const momentText = (moment: string) => `${dayText(moment.slice(0, 10))}, ${moment.slice(11, 16)}`;

/** A roll's name, or else its film: "ISO 400 colour". */
export const rollTitle = (roll: Roll) => roll.name || filmLine(roll);

/** "12 of 36 recorded". */
export const recordedText = (count: number, frames: number) => text.recorded(count, frames);

/** A camera's roll on its card in Cameras: "ISO 400 colour · 12 of 36", or "No film loaded". */
export const cameraRollLine = (roll: Roll | null, count: number) => (roll ? `${filmLine(roll)} · ${text.ofFrames(count, roll.frames)}` : filmLine(null));
