// The photos of the scene: their size, their keys, and which ones are no longer used.
// Shrinking and keeping them needs a browser, so it's checked in real Chrome.
import { describe, expect, it } from "vitest";
import { fitWithin, newPhotoKey, photoKeys, photosGone } from "./photos.ts";
import type { Frame } from "./store.ts";

describe("a photo's preview size", () => {
  it("keeps the photo's shape, its longer side at most 640 px", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 480, height: 640 });
    expect(fitWithin(1920, 1080)).toEqual({ width: 640, height: 360 });
  });

  it("never enlarges a small photo, nor makes a side 0", () => {
    expect(fitWithin(500, 300)).toEqual({ width: 500, height: 300 });
    expect(fitWithin(10000, 2)).toEqual({ width: 640, height: 1 });
  });
});

describe("a photo's key", () => {
  it("is random, from the browser's random numbers", () => {
    const fixed = (bytes: Uint8Array) => bytes.map((_, index) => index * 17);
    expect(newPhotoKey(fixed)).toBe("p-0011223344556677");
    expect(newPhotoKey()).toMatch(/^p-[0-9a-f]{16}$/);
    expect(newPhotoKey()).not.toBe(newPhotoKey());
  });
});

describe("which photos are no longer used", () => {
  const frame = (id: string, photo: string | null) => ({ id, photo }) as Frame;

  it("collects the photos the frames point to, once each", () => {
    expect([...photoKeys([frame("f1", "p-a"), frame("f2", null), frame("f3", "p-a"), frame("f4", "p-b")])]).toEqual(["p-a", "p-b"]);
  });

  it("finds the photos kept before and not now, such as a deleted frame's", () => {
    expect(photosGone(new Set(["p-a", "p-b", "p-c"]), new Set(["p-b"]))).toEqual(["p-a", "p-c"]);
  });

  it("keeps a photo two frames share while one of them still points to it", () => {
    const before = photoKeys([frame("f1", "p-a"), frame("f2", "p-a")]);
    expect(photosGone(before, photoKeys([frame("f2", "p-a")]))).toEqual([]);
  });
});
