// The backup on screen.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import type { Restorable } from "../../lib/backup.ts";
import { addCamera, EMPTY_STATE, finishRoll, loadRoll } from "../../lib/store.ts";
import { BackupOffer, RecordsSection, type RecordsStatus } from "./Backup.tsx";
import { SettingsHome } from "./Settings.tsx";

const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const inOrder = (text: string, parts: string[]) => {
  let position = 0;
  for (const part of parts) {
    const found = text.indexOf(part, position);
    expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
    position = found + part.length;
  }
};

const noop = () => undefined;
const nothing = async () => null;
const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const records = (lastBackup: string | null = null, more: { restoreAt?: Restorable; statusAt?: RecordsStatus } = {}) => (
  <RecordsSection lastBackup={lastBackup} onSave={nothing} onRead={nothing} onRestore={nothing} {...more} />
);

describe("Your records, in Settings", () => {
  it("comes after Shooting and before the theme: save a backup, or restore one", () => {
    const html = renderToStaticMarkup(<SettingsHome state={EMPTY_STATE} onBack={noop} onHold={noop} records={records()} />);
    inOrder(readable(html), [
      "Shooting", "How you hold the camera",
      "Your records",
      "Save a backup", "One file with your cameras, rolls, frames and photos.",
      "Restore from a backup", "Replaces what's on this phone.",
      "Theme",
    ]);
    expect(html).toMatch(/<input type="file" hidden=""/);
  });

  it("says when the last backup was saved", () => {
    expect(readable(renderToStaticMarkup(records("2026-11-14")))).toContain("Save a backup Last saved 14 Nov 2026");
  });

  it("says where a backup went, or why nothing changed", () => {
    const say = (status: RecordsStatus) => readable(renderToStaticMarkup(records(null, { statusAt: status })));
    expect(say("saved")).toContain("Backup saved to Downloads. Keep it somewhere safe, such as Google Drive.");
    expect(say("notBackup")).toContain("This file isn't a LomoSapiens backup, so nothing changed.");
    expect(say("restored")).toContain("Backup restored.");
    expect(renderToStaticMarkup(records(null, { statusAt: "notBackup" }))).toContain('role="alert"');
  });

  it("asks before restoring, with the backup's day and what it holds", () => {
    let state = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-01").state;
    state = addCamera(state, { name: "Spare", answers: compact, film: null }, "2026-11-01").state;
    state = finishRoll(loadRoll(state, "c1", { iso: 100, type: "bw_negative" }, "2026-11-02"), "c1", "2026-11-03");
    const backup: Restorable = { state, photos: {}, savedAt: "2026-11-14T15:42" };
    inOrder(readable(renderToStaticMarkup(records(null, { restoreAt: backup }))), [
      "Restore this backup?",
      "From 14 Nov 2026: 2 cameras, 2 rolls, 0 frames. Everything on this phone now is replaced.",
      "Restore",
      "Keep it",
    ]);
  });
});

describe("the offer when a roll is finished", () => {
  it("asks to save a backup, or not now", () => {
    inOrder(readable(renderToStaticMarkup(<BackupOffer onSave={nothing} onClose={noop} />)), [
      "Roll finished",
      "Save a backup? Your records live only on this phone, and a backup file keeps a copy.",
      "Save a backup",
      "Not now",
    ]);
  });

  it("says where the backup went", () => {
    inOrder(readable(renderToStaticMarkup(<BackupOffer onSave={nothing} onClose={noop} stateAt="saved" />)), [
      "Backup saved",
      "Backup saved to Downloads. Keep it somewhere safe, such as Google Drive.",
      "Done",
    ]);
  });
});
