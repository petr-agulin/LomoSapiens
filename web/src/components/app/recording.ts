// Two things a recording needs from the app. The form is kept while the phone's camera is
// open, as Android may close the page to free memory and open it again afterwards. And a photo no frame
// points to any more, nor the form, is deleted from the phone: a deleted frame's, a retaken one's, or a
// discarded form's.
import { useEffect, useMemo, useRef } from "react";
import { allPhotoKeys, deletePhotos, photoKeys, photosGone } from "../../lib/photos.ts";
import type { RecordDraft } from "../../lib/record.ts";
import type { ShotDraft } from "../../lib/shot.ts";
import type { Frame } from "../../lib/store.ts";

/** The frame recorded from the result on screen, by its ID, which the result shows with "Change". */
export interface LastRecorded {
  id: string;
}

export interface Interrupted {
  shot: ShotDraft;
  record: RecordDraft;
  recordStart: RecordDraft | null;
  lastRecorded: LastRecorded | null;
}

/** Kept in this tab only, as the page is opened again in the same tab. */
const KEY = "lomosapiens.recording";
/** Older than this, a kept form is left: the moment has passed. */
const FRESH_MS = 30 * 60 * 1000;

export function keepInterruptedRecording(recording: Interrupted) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), ...recording }));
  } catch {
    // Without storage, an interrupted form is simply lost, as before.
  }
}

export function clearInterruptedRecording() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
}

/** The form kept when the phone closed the page while its camera was open, if it's recent. */
export function readInterruptedRecording(): Interrupted | null {
  try {
    const text = sessionStorage.getItem(KEY);
    if (!text) return null;
    const saved = JSON.parse(text);
    if (typeof saved?.at !== "number" || Date.now() - saved.at > FRESH_MS || !saved.record || !saved.shot) return null;
    // A frame kept by an older version, by its number rather than its ID, is left out: the result then offers to record.
    const lastRecorded = typeof saved.lastRecorded?.id === "string" ? { id: saved.lastRecorded.id } : null;
    return { shot: saved.shot, record: saved.record, recordStart: saved.recordStart ?? null, lastRecorded };
  } catch {
    return null;
  }
}

/**
 * Deletes the photos no frame points to, nor the form (`pending`). When the app opens, every such photo on the
 * phone goes; afterwards, the ones that stop being used, such as a deleted frame's or a retaken one's.
 */
export function usePhotoCleanup(frames: Frame[], pending: string | null) {
  const kept = useMemo(() => {
    const keys = photoKeys(frames);
    if (pending) keys.add(pending);
    return keys;
  }, [frames, pending]);
  const previous = useRef<Set<string> | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = kept;
    if (before === null) {
      allPhotoKeys()
        .then((keys) => deletePhotos(keys.filter((key) => !previous.current?.has(key))))
        .catch(() => undefined);
      return;
    }
    const gone = photosGone(before, kept);
    if (gone.length > 0) deletePhotos(gone).catch(() => undefined);
  }, [kept]);
}
