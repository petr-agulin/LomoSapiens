// The backup file in the browser: saving it to the phone's Downloads, reading one the user
// picks, and putting its photos back. The file's own rules are in lib/backup.ts.
import { backupName, makeBackup, readBackup, type Restorable } from "../../lib/backup.ts";
import { now, today } from "../../lib/dates.ts";
import { loadPhoto, photoKeys, putPhoto } from "../../lib/photos.ts";
import type { AppState } from "../../lib/store.ts";

/** The day the last backup was saved or restored, shown in Settings. Kept beside the saved data, not in it. */
const LAST_BACKUP_KEY = "lomosapiens.lastBackup";

export function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

function writeLastBackup(day: string) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, day);
  } catch {
    // Settings then just doesn't say when.
  }
}

const asDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Saves everything to a file in the phone's Downloads, photos included. Gives the day it was saved. */
export async function saveBackupFile(state: AppState): Promise<string> {
  const photos: Record<string, string> = {};
  for (const key of photoKeys(state.frames)) {
    const blob = await loadPhoto(key);
    if (blob) photos[key] = await asDataUrl(blob);
  }
  const day = today();
  const file = new Blob([JSON.stringify(makeBackup(state, photos, now()))], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupName(day);
  document.body.append(link);
  link.click();
  link.remove();
  // Long enough for the phone to take the file.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  writeLastBackup(day);
  return day;
}

/** A file the user picked, read as a backup, or null when it isn't one. */
export async function readBackupFile(file: File): Promise<Restorable | null> {
  try {
    return readBackup(await file.text());
  } catch {
    return null;
  }
}

/** Puts a backup's photos back on the phone, under their own keys, before its data replaces what's here. */
export async function restoreBackupPhotos(backup: Restorable): Promise<void> {
  for (const [key, url] of Object.entries(backup.photos)) {
    const blob = await (await fetch(url)).blob();
    await putPhoto(key, blob);
  }
  writeLastBackup(backup.savedAt.slice(0, 10));
}
