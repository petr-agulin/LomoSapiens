// The backup file: everything on this phone in
// one file the user keeps where they like, such as Google Drive. The saved data, as the app keeps it, and the
// photos inside it as data URLs. Reading it back uses the app's own checks for its saved data, so a backup of
// older data is upgraded, and anything that can't be read is left out, as when the app opens.
import { isMinute } from "./dates.ts";
import type { Store } from "./settings.ts";
import { DATA_VERSION, STORE_KEY, loadState, type AppState } from "./store.ts";

export const BACKUP_KIND = "lomosapiens-backup";

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  /** When it was saved, to the minute: "2026-11-14T15:42". */
  savedAt: string;
  /** The saved data as the app keeps it, with its version. */
  data: AppState & { version: number };
  /** The photos the frames point to, by key, as data URLs. */
  photos: Record<string, string>;
}

/** What a backup restores. */
export interface Restorable {
  state: AppState;
  photos: Record<string, string>;
  savedAt: string;
}

/** "lomosapiens-backup-2026-11-14.json". */
export const backupName = (day: string) => `lomosapiens-backup-${day}.json`;

export const makeBackup = (state: AppState, photos: Record<string, string>, savedAt: string): BackupFile => ({
  kind: BACKUP_KIND,
  savedAt,
  data: { version: DATA_VERSION, ...state },
  photos,
});

/** How many cameras, rolls and frames a backup holds, for the question before restoring. */
export const backupCounts = (state: AppState) => ({
  cameras: state.cameras.length,
  rolls: state.cameras.filter((camera) => camera.film).length + state.rolls.length,
  frames: state.frames.length,
});

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const PHOTO_KEY = /^p-[0-9a-z]+$/i;

/**
 * A backup read back, or null when the file isn't a LomoSapiens backup. `day` is the day a backup of version 1
 * data counts its films as loaded, as when the app upgrades its own.
 */
export function readBackup(text: string, day?: string): Restorable | null {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(file) || file.kind !== BACKUP_KIND || !isMinute(file.savedAt) || !isObject(file.data)) return null;
  const { data } = file;
  if ((data.version !== 1 && data.version !== DATA_VERSION) || !Array.isArray(data.cameras)) return null;
  const saved = JSON.stringify(data);
  const store: Store = { getItem: (key) => (key === STORE_KEY ? saved : null), setItem: () => undefined, removeItem: () => undefined };
  const photos = Object.fromEntries(
    Object.entries(isObject(file.photos) ? file.photos : {}).filter(
      (entry): entry is [string, string] => PHOTO_KEY.test(entry[0]) && typeof entry[1] === "string" && entry[1].startsWith("data:image/"),
    ),
  );
  return { state: loadState(store, day), photos, savedAt: file.savedAt };
}
