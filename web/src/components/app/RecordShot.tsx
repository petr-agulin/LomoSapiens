// Recording a shot: the frame number, typed or stepped,
// then what was set on the camera, starting from the advice, how far that is from the advice in steps of light,
// and a note. The photo joins in step 5.
import { useState, type ReactNode } from "react";
import { answersToCamera } from "../../lib/cameraAnswers.ts";
import { cameraApertures, cameraShutters } from "../../lib/engine/index.ts";
import type { Aperture, Shutter } from "../../lib/engine/types.ts";
import { differenceText, focusLine, lightDifference, parseFrameNumber, setOf, shutterLine, type RecordDraft } from "../../lib/record.ts";
import { parseDistance } from "../../lib/shot.ts";
import type { SavedCamera, ShotSummary } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { CARD_ICON, Icon, PathIcon } from "./icons.tsx";
import { useLeaveGuard } from "./navigation.ts";
import { CameraValue, ConfirmSheet, Crumb, MainButton, Screen, ScreenTitle, Sheet, Tiles } from "./parts.tsx";
import { PhotoView, usePhotoPicker } from "./Photo.tsx";

const text = strings.app.record;
const framesText = strings.app.frames;
const photoText = strings.app.photo;
const close = strings.app.setup.close;

type Shown = { before: string; big: string; after: string };
const apertureShown = (aperture: Aperture): Shown => ({ before: "f/", big: aperture, after: "" });
const shutterShown = (shutter: Shutter, bulbSeconds: number | null): Shown =>
  shutter === "B" ? { before: "", big: "B", after: text.seconds(bulbSeconds ?? 1) } : shutter === "1" ? { before: "", big: "1", after: "s" } : { before: "1/", big: shutter.slice(2), after: "" };
const focusShown = (focusM: number | null): Shown => (focusM === null ? { before: "", big: text.infinity, after: "" } : { before: "", big: String(focusM), after: "m" });

/** One setting on the form: its name, whether it is as advised, and the value as the camera marks it. */
function ValueRow({ label, shown, advised, onOpen }: { label: string; shown: Shown; advised: string | null; onOpen: () => void }) {
  return (
    <button type="button" aria-haspopup="dialog" onClick={onOpen} className="flex min-h-[58px] w-full cursor-pointer items-center gap-2.5 border-t border-line py-[5px] text-left">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className={`text-[13px] leading-[1.3] ${advised ? "font-medium text-ink" : "text-muted"}`}>{advised ? text.advisedValue(advised) : text.advised}</span>
      </span>
      <CameraValue {...shown} />
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

/** A tile's value, with "Advised" under the one the advice gave. */
function TileValue({ shown, advised }: { shown: Shown; advised: boolean }) {
  return (
    <span className="flex flex-col items-center gap-0.5 py-1">
      <CameraValue {...shown} />
      {advised && <span className="text-[10px] font-semibold tracking-[0.06em] uppercase opacity-70">{text.advised}</span>}
    </span>
  );
}

/** A number typed in a sheet, kept with Done: B's seconds, or a distance. */
function TypedNumber({ id, label, value, placeholder, invalid, after, onChange }: { id: string; label: string; value: string; placeholder: string; invalid: boolean; after?: string; onChange: (typed: string) => void }) {
  return (
    <>
      <label htmlFor={id} className="px-1 pt-1 text-[13px] text-muted">
        {label}
      </label>
      <span className="mx-1 flex min-h-14 items-baseline gap-2 rounded-[18px] border-2 border-ink px-[18px]">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          maxLength={6}
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 w-full min-w-0 flex-1 bg-transparent font-display text-[28px] font-semibold tracking-[-0.02em] text-ink caret-[var(--accent)] outline-none placeholder:text-lg placeholder:font-normal placeholder:text-muted placeholder:opacity-60"
        />
        {after && <span className="text-lg font-medium text-muted">{after}</span>}
      </span>
    </>
  );
}

function SheetDone({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <div className="flex flex-col px-1">
      <MainButton onClick={onClick} disabled={disabled}>
        {text.done}
      </MainButton>
    </div>
  );
}

function ErrorLine({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="m-0 px-1 text-sm text-warn-ink">
      {children}
    </p>
  );
}

/** The shutter speeds of the camera, then B if it has one. B asks how long it was held, kept with Done. */
function ShutterSheet({ camera, draft, advice, onPick, onClose }: { camera: SavedCamera; draft: RecordDraft; advice: ShotSummary; onPick: (shutter: Shutter, bulbSeconds: number | null) => void; onClose: () => void }) {
  const lens = answersToCamera(camera.answers);
  const options: Shutter[] = [...cameraShutters(lens), ...(lens.hasBulb ? (["B"] as const) : [])];
  const [bulb, setBulb] = useState(draft.shutter === "B");
  const [typed, setTyped] = useState(String(draft.bulbSeconds ?? advice.bulbSeconds ?? 1));
  const seconds = parseDistance(typed);
  return (
    <Sheet title={text.shutter} description={text.shutterLine} closeLabel={close} onClose={onClose}>
      <Tiles
        label={text.shutter}
        options={options}
        value={bulb ? "B" : draft.shutter}
        onPick={(shutter) => (shutter === "B" ? setBulb(true) : onPick(shutter, null))}
        render={(shutter) => (
          // B on its tile is just B: its seconds are asked once it's picked.
          <TileValue shown={shutter === "B" ? { before: "", big: "B", after: "" } : shutterShown(shutter, null)} advised={shutter === advice.shutter} />
        )}
      />
      {bulb && (
        <>
          <TypedNumber id="bulb-seconds" label={text.bulbSeconds} value={typed} placeholder={text.bulbPlaceholder} invalid={typed.trim() !== "" && seconds === null} after="s" onChange={setTyped} />
          {typed.trim() !== "" && seconds === null && <ErrorLine id="bulb-seconds-error">{text.bulbInvalid}</ErrorLine>}
          <SheetDone disabled={seconds === null} onClick={() => seconds !== null && onPick("B", seconds)} />
        </>
      )}
    </Sheet>
  );
}

/** ∞, or a distance typed and kept with Done. */
function FocusSheet({ draft, onPick, onClose }: { draft: RecordDraft; onPick: (focusM: number | null) => void; onClose: () => void }) {
  const [typed, setTyped] = useState(draft.focusM === null ? "" : String(draft.focusM));
  const metres = parseDistance(typed);
  const wrong = typed.trim() !== "" && metres === null;
  return (
    <Sheet title={text.focus} description={text.focusLine} closeLabel={close} onClose={onClose}>
      <Tiles
        label={text.focus}
        options={["infinity"] as const}
        value={draft.focusM === null ? "infinity" : null}
        onPick={() => onPick(null)}
        columns={1}
        render={() => <CameraValue {...focusShown(null)} size={26} />}
      />
      <TypedNumber id="focus-metres" label={text.otherDistance} value={typed} placeholder={text.distancePlaceholder} invalid={wrong} after="m" onChange={setTyped} />
      {wrong && <ErrorLine id="focus-metres-error">{text.distanceInvalid}</ErrorLine>}
      <SheetDone disabled={metres === null} onClick={() => metres !== null && onPick(metres)} />
    </Sheet>
  );
}

export type RecordOpen = "aperture" | "shutter" | "focus" | "discard" | null;

export function RecordShot({
  camera,
  advice,
  taken,
  draft,
  onChange,
  onBack,
  onSave,
  onPhoto = () => undefined,
  samePhotoAs = null,
  onCameraOpen,
  editing = null,
  earlier = false,
  unsaved,
  openAt = null,
}: {
  camera: SavedCamera;
  /** The advice on the result, as it was given. */
  advice: ShotSummary;
  /** The frame numbers already recorded on this roll. */
  taken: number[];
  draft: RecordDraft;
  onChange: (draft: RecordDraft) => void;
  onBack: () => void;
  onSave: () => void;
  /** A photo of the scene taken, as its key, or removed. */
  onPhoto?: (key: string | null) => void;
  /** The frame whose photo this attempt starts with, if it does. */
  samePhotoAs?: number | null;
  /** Just before the phone's camera opens, so the form can be kept if the phone closes the page meanwhile. */
  onCameraOpen?: () => void;
  /** Changing a recorded frame: its number as saved, for the title. */
  editing?: { number: number } | null;
  /** A frame taken earlier, added from its roll's page: its photo, like a changed frame's, from the camera or the phone's photos. */
  earlier?: boolean;
  /** Whether Back would lose something. By default, a note added. */
  unsaved?: boolean;
  /** For the tests: a sheet open at once. */
  openAt?: RecordOpen;
}) {
  const [open, setOpen] = useState<RecordOpen>(openAt);
  const number = parseFrameNumber(draft.number);
  const set = setOf(draft);
  const ready = number !== null && (set.shutter !== "B" || (set.bulbSeconds ?? 0) > 0);
  // Something Back would lose: a note added (the photo joins in step 5), or, changing a frame, any change.
  const added = unsaved ?? draft.note.trim() !== "";
  const release = useLeaveGuard(added, () => setOpen("discard"));
  const step = (by: number) => onChange({ ...draft, number: String(Math.min(99, Math.max(1, (number ?? 1) + by))) });
  const advisedShutter = shutterLine(advice.shutter, advice.bulbSeconds);
  const [photoFailed, setPhotoFailed] = useState(false);
  // Recording: straight to the camera. Changing a frame, or adding one taken earlier: the camera or the phone's photos.
  const later = editing !== null || earlier;
  const photo = usePhotoPicker({
    camera: !later,
    onOpen: onCameraOpen,
    onPicked: (key) => {
      setPhotoFailed(false);
      onPhoto(key);
    },
    onFailed: () => setPhotoFailed(true),
  });

  return (
    <Screen
      top={<Crumb backLabel={strings.app.back} onBack={added ? () => setOpen("discard") : onBack}>{editing ? framesText.title(editing.number) : text.crumb}</Crumb>}
      action={
        <MainButton
          onClick={() => {
            release();
            onSave();
          }}
          disabled={!ready}
        >
          {editing ? framesText.saveChanges : text.save(number)}
        </MainButton>
      }
    >
      <ScreenTitle title={editing ? framesText.title(editing.number) : text.title} line={editing ? framesText.editLine : text.line} />
      <section className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-1 pb-1">
        <div className="flex min-h-[64px] items-center gap-2.5 py-1.5">
          <label htmlFor="frame-number" className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{text.frame}</span>
            <span className="text-[13px] leading-[1.3] text-muted">{text.frameHint}</span>
          </label>
          <button type="button" aria-label={text.fewer} onClick={() => step(-1)} className="grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-chip text-xl font-semibold">
            −
          </button>
          <input
            id="frame-number"
            type="text"
            inputMode="numeric"
            maxLength={2}
            aria-label={text.frameLabel}
            value={draft.number}
            aria-invalid={number === null || undefined}
            onChange={(event) => onChange({ ...draft, number: event.target.value })}
            className="h-12 w-[60px] flex-none rounded-[14px] border-2 border-ink bg-transparent text-center font-display text-[26px] font-semibold tracking-[-0.02em] text-ink caret-[var(--accent)] outline-none"
          />
          <button type="button" aria-label={text.more} onClick={() => step(1)} className="grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-chip text-xl font-semibold">
            +
          </button>
        </div>
        <ValueRow label={text.aperture} shown={apertureShown(draft.aperture)} advised={draft.aperture === advice.aperture ? null : `f/${advice.aperture}`} onOpen={() => setOpen("aperture")} />
        <ValueRow
          label={text.shutter}
          shown={shutterShown(draft.shutter, draft.bulbSeconds)}
          advised={shutterLine(draft.shutter, draft.shutter === "B" ? draft.bulbSeconds : null) === advisedShutter ? null : advisedShutter}
          onOpen={() => setOpen("shutter")}
        />
        <ValueRow label={text.focus} shown={focusShown(draft.focusM)} advised={draft.focusM === advice.focus.meters ? null : focusLine(advice.focus.meters)} onOpen={() => setOpen("focus")} />
      </section>
      {number === null ? (
        <p role="alert" className="m-0 px-1 text-sm text-warn-ink">
          {text.frameInvalid}
        </p>
      ) : (
        taken.includes(number) && <p className="m-0 px-1 text-sm text-muted">{text.frameTaken(number)}</p>
      )}
      <p className="m-0 px-1 text-[15px] font-semibold">{differenceText(lightDifference(set, advice))}</p>

      {/* The photo of the scene, added, retaken or removed here, also when changing a frame. */}
      {draft.photo ? (
        <section className="flex flex-col gap-2 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card p-2.5">
          <PhotoView photoKey={draft.photo} label={photoText.said} className="max-h-[360px] w-full rounded-[14px] bg-chip object-contain" holder="aspect-[4/3] w-full rounded-[14px]" />
          {samePhotoAs !== null && <p className="m-0 px-1 text-[13px] text-muted">{photoText.same(samePhotoAs)}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={photo.pick} className="min-h-11 flex-1 cursor-pointer rounded-[14px] bg-chip font-semibold">
              {photoText.retake}
            </button>
            <button type="button" onClick={() => onPhoto(null)} className="min-h-11 flex-1 cursor-pointer rounded-[14px] bg-chip font-semibold">
              {photoText.remove}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={photo.pick}
          className="flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] border-[1.5px] border-dashed border-line py-2 pr-3.5 pl-4 text-left"
        >
          <span aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-[14px] bg-card">
            <PathIcon d={CARD_ICON.camera} size={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[17px] font-semibold">{photoText.add}</span>
            <span className="text-sm leading-[1.35] text-muted">{later ? photoText.addLaterLine : photoText.addLine}</span>
          </span>
        </button>
      )}
      {photoFailed && (
        <p role="alert" className="m-0 px-1 text-sm text-warn-ink">
          {later ? photoText.failedLater : photoText.failed}
        </p>
      )}
      {photo.field}

      <section className="flex flex-col gap-2 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-2.5 pb-3.5">
        <label htmlFor="frame-note" className="text-[13px] text-muted">
          {text.note}
        </label>
        <input
          id="frame-note"
          type="text"
          maxLength={200}
          value={draft.note}
          placeholder={text.notePlaceholder}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          className="min-h-12 w-full rounded-xl border border-line bg-chip px-3 text-base text-ink"
        />
      </section>
      <span className="flex-[1_0_8px]" />

      {open === "aperture" && (
        <Sheet title={text.aperture} description={text.apertureLine} closeLabel={close} onClose={() => setOpen(null)}>
          <Tiles
            label={text.aperture}
            options={cameraApertures(answersToCamera(camera.answers))}
            value={draft.aperture}
            onPick={(aperture) => {
              onChange({ ...draft, aperture });
              setOpen(null);
            }}
            render={(aperture) => <TileValue shown={apertureShown(aperture)} advised={aperture === advice.aperture} />}
          />
        </Sheet>
      )}
      {open === "shutter" && (
        <ShutterSheet
          camera={camera}
          draft={draft}
          advice={advice}
          onPick={(shutter, bulbSeconds) => {
            onChange({ ...draft, shutter, bulbSeconds });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "focus" && (
        <FocusSheet
          draft={draft}
          onPick={(focusM) => {
            onChange({ ...draft, focusM });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "discard" && (
        <ConfirmSheet
          title={editing ? framesText.discardTitle : text.discardTitle}
          body={editing ? framesText.discardBody : text.discardBody}
          yes={text.discard}
          no={text.keepEditing}
          closeLabel={close}
          onYes={() => {
            release();
            onBack();
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </Screen>
  );
}
