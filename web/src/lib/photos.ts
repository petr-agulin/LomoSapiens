// The photos of the scene: shrunk on the phone to a
// small preview and kept in the browser's storage for larger data, IndexedDB, never sent anywhere. Redrawing a
// photo drops the location and other details the phone writes into it. The saved data
// only names a photo by its key; a photo no frame points to any more is deleted.
import type { Frame } from "./store.ts";

/** The preview's longer side, in pixels: enough to know the scene again, about 50 KB as a JPEG. */
export const PREVIEW_SIDE = 640;
const PREVIEW_QUALITY = 0.75;

/** The preview's size: the photo's shape, its longer side at most `max`, never enlarged, never 0. */
export function fitWithin(width: number, height: number, max = PREVIEW_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * A new photo's key, from the browser's random numbers. crypto.getRandomValues works at the computer's home
 * Wi-Fi address too, where the browser doesn't offer crypto.randomUUID.
 */
export function newPhotoKey(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)) {
  const bytes = random(new Uint8Array(8));
  return `p-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** The photos the frames point to, once each. Two attempts at a scene may share one. */
export const photoKeys = (frames: Pick<Frame, "photo">[]) => new Set(frames.flatMap((frame) => (frame.photo ? [frame.photo] : [])));

/** The photos kept before and not now. */
export const photosGone = (before: Set<string>, after: Set<string>) => [...before].filter((key) => !after.has(key));

// ---------------------------------------------------------------- in the browser

/** Redraws a photo as a small JPEG: upright, as the phone took it, and without its location or other details. */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No JPEG"))), "image/jpeg", PREVIEW_QUALITY));
}

const DATABASE = "lomosapiens-photos";
const STORE = "photos";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Runs one request on the photos, and closes the database when it's done. */
async function withPhotos<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** Keeps a photo, already shrunk, and gives its key. */
export async function savePhoto(blob: Blob): Promise<string> {
  const key = newPhotoKey();
  await withPhotos("readwrite", (store) => store.put(blob, key));
  return key;
}

/** Keeps a photo under a key it already has, as when restoring a backup. */
export async function putPhoto(key: string, blob: Blob): Promise<void> {
  await withPhotos("readwrite", (store) => store.put(blob, key));
}

/** A photo by its key, or null when there is none. */
export async function loadPhoto(key: string): Promise<Blob | null> {
  const blob = await withPhotos<Blob | undefined>("readonly", (store) => store.get(key) as IDBRequest<Blob | undefined>);
  return blob ?? null;
}

/** Deletes photos by their keys. */
export async function deletePhotos(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await withPhotos("readwrite", (store) => {
    for (const key of keys) store.delete(key);
  });
}

/** Every photo's key kept on the phone. */
export async function allPhotoKeys(): Promise<string[]> {
  const keys = await withPhotos<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  return (keys ?? []).map(String);
}
