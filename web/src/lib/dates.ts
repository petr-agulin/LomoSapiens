// Dates for the roll history: when a roll was loaded or finished, and when a frame was recorded.
// In the phone's own time, as the user would write them. Only the app's saved data uses dates:
// the engine takes none.

const two = (value: number) => String(value).padStart(2, "0");

/** A day as "2026-11-14". */
export const dayOf = (moment: Date) => `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())}`;

/** A moment to the minute, as "2026-11-14T15:42". */
export const minuteOf = (moment: Date) => `${dayOf(moment)}T${two(moment.getHours())}:${two(moment.getMinutes())}`;

/** Today, read from the phone's clock. */
export const today = () => dayOf(new Date());

/** Now, to the minute, read from the phone's clock. */
export const now = () => minuteOf(new Date());

/** A real day written as "2026-11-14": not 30 February, not month 13. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return false;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** A real minute written as "2026-11-14T15:42". */
export function isMinute(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = /^(.{10})T(\d{2}):(\d{2})$/.exec(value);
  return !!parts && isDay(parts[1]) && Number(parts[2]) < 24 && Number(parts[3]) < 60;
}
