// Rolls: every roll, in the cameras and finished; a roll's own page; and
// Roll details, where a roll is corrected, finished or deleted. Its frames join the roll's page in step 4.
import { useLayoutEffect, useState } from "react";
import { isDay, today } from "../../lib/dates.ts";
import { cameraRollLine, dayText, rangeText, recordedText, rollTitle } from "../../lib/rollText.ts";
import { draftRoll, filmLine, type SetupDraft } from "../../lib/setup.ts";
import { findRoll, finishedRolls, framesOn, recordedCount, rollsInCameras, type AppState, type Roll, type SavedCamera } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { FrameRow, frameRowId } from "./Frames.tsx";
import { CARD_ICON, Icon, PathIcon } from "./icons.tsx";
import { useReturnedFrom } from "./navigation.ts";
import { AddCard, ConfirmSheet, Crumb, MainButton, OptionRow, Screen, ScreenTitle, SectionLabel, Sheet, Unbroken } from "./parts.tsx";
import { ColourDot, FilmStep } from "./Setup.tsx";

const text = strings.app.rolls;
const close = strings.app.setup.close;

/** One roll in a list: its name or film, where it is or was, and how many frames are recorded on it. */
function RollCard({ roll, cameraName, finishedOn, count, onOpen }: { roll: Roll; cameraName: string; finishedOn: string | null; count: number; onOpen: () => void }) {
  const place = [...(roll.name ? [filmLine(roll)] : []), { named: cameraName }, ...(finishedOn ? [rangeText(roll.loadedOn, finishedOn)] : [])];
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[84px] w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-3 pr-3.5 pl-4 text-left">
      <span aria-hidden="true" className="grid size-12 flex-none place-items-center rounded-[14px] bg-chip">
        <PathIcon d={CARD_ICON.film} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="flex items-center gap-2 font-display text-[19px] leading-[1.2] font-semibold tracking-[-0.01em]">
          <ColourDot type={roll.type} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{rollTitle(roll)}</span>
        </span>
        <span className="text-sm leading-[1.35] text-muted">
          <Unbroken parts={place} />
        </span>
        <span className="text-sm leading-[1.35] text-muted">{finishedOn ? text.recordedFinished(count) : recordedText(count, roll.frames)}</span>
      </span>
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

/** Before loading a new roll into a camera that has one: its roll is finished first, so the app asks. */
export function FinishFirstSheet({ camera, roll, count, onYes, onClose }: { camera: SavedCamera; roll: Roll; count: number; onYes: () => void; onClose: () => void }) {
  return (
    <ConfirmSheet
      title={text.finishFirstTitle(camera.name)}
      body={text.finishFirstBody(rollTitle(roll), recordedText(count, roll.frames))}
      yes={text.finishFirstYes}
      no={text.keep}
      closeLabel={close}
      onYes={onYes}
      onClose={onClose}
    />
  );
}

type Asking = { which: true } | { finish: string } | null;

/** Every roll: the ones in cameras, the camera in use first, then loading a new one, then the finished ones. */
export function RollsHome({
  state,
  onBack,
  onRoll,
  onLoad,
  openAt = null,
}: {
  state: AppState;
  onBack: () => void;
  onRoll: (id: string) => void;
  /** Opens New roll for a camera. Any roll in it is finished when the new one is loaded. */
  onLoad: (cameraId: string) => void;
  /** For the tests: a sheet open at once. */
  openAt?: Asking;
}) {
  const [asking, setAsking] = useState<Asking>(openAt);
  const loaded = rollsInCameras(state);
  const finished = finishedRolls(state);
  const inUseFirst = [...state.cameras].sort((a, b) => Number(b.id === state.inUse) - Number(a.id === state.inUse));
  const finishing = asking && "finish" in asking ? state.cameras.find((camera) => camera.id === asking.finish) : undefined;

  const start = (camera: SavedCamera) => (camera.film ? setAsking({ finish: camera.id }) : onLoad(camera.id));

  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack} menu="rolls">{strings.app.back}</Crumb>}>
      <ScreenTitle title={text.title} line={text.line} />
      {state.cameras.length > 0 && <SectionLabel>{text.inCameras}</SectionLabel>}
      {loaded.map(({ roll, camera }) => (
        <RollCard key={roll.id} roll={roll} cameraName={camera.name} finishedOn={null} count={recordedCount(state, roll.id)} onOpen={() => onRoll(roll.id)} />
      ))}
      {state.cameras.length > 0 && (
        <AddCard title={text.loadNew} line={text.loadNewLine} onClick={() => (state.cameras.length === 1 ? start(state.cameras[0]) : setAsking({ which: true }))} />
      )}
      {finished.length > 0 && <SectionLabel>{text.finished}</SectionLabel>}
      {finished.map((roll) => (
        <RollCard
          key={roll.id}
          roll={roll}
          cameraName={findRoll(state, roll.id)?.cameraName ?? roll.cameraName}
          finishedOn={roll.finishedOn}
          count={recordedCount(state, roll.id)}
          onOpen={() => onRoll(roll.id)}
        />
      ))}
      {loaded.length === 0 && finished.length === 0 && <p className="m-0 px-1 pt-1 text-[15px] leading-[1.45] text-muted">{text.none}</p>}
      <span className="flex-[1_0_8px]" />

      {asking && "which" in asking && (
        <Sheet title={text.whichCamera} description={text.whichCameraLine} closeLabel={close} onClose={() => setAsking(null)}>
          <div role="radiogroup" aria-labelledby="sheet-title" className="flex flex-col gap-1">
            {inUseFirst.map((camera) => (
              <OptionRow
                key={camera.id}
                icon={CARD_ICON.camera}
                label={camera.name}
                sub={cameraRollLine(camera.film, camera.film ? recordedCount(state, camera.film.id) : 0)}
                on={false}
                onPick={() => start(camera)}
              />
            ))}
          </div>
        </Sheet>
      )}
      {finishing?.film && (
        <FinishFirstSheet
          camera={finishing}
          roll={finishing.film}
          count={recordedCount(state, finishing.film.id)}
          onYes={() => {
            setAsking(null);
            onLoad(finishing.id);
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </Screen>
  );
}

/** The room kept between a frame's row brought into view and the edge of the screen. */
const ROW_MARGIN = 12;

/**
 * Back from a frame: the screen opens scrolled where it was left. If the frames' own buttons went on to a
 * frame whose row is out of sight, as when marking a developed roll, that row is scrolled just into view.
 * A row partly in sight, such as one tapped at the screen's edge, leaves the list exactly where it was.
 */
function useFrameInView(frameId: string | null) {
  // After the screen's own scroll is put back: a parent's layout effect runs after its children's.
  useLayoutEffect(() => {
    const row = frameId && document.getElementById(frameRowId(frameId));
    const column = row && row.closest("main");
    if (!row || !column) return;
    const shown = column.getBoundingClientRect();
    const place = row.getBoundingClientRect();
    if (place.bottom <= shown.top) column.scrollTop -= shown.top + ROW_MARGIN - place.top;
    else if (place.top >= shown.bottom) column.scrollTop += place.bottom - (shown.bottom - ROW_MARGIN);
  }, [frameId]);
}

/** One roll's page: where it is or was, how many frames are recorded, its details, then its frames. */
export function RollPage({
  state,
  rollId,
  via,
  onBack,
  onDetails,
  onFrame,
  onAddFrame,
}: {
  state: AppState;
  rollId: string;
  via: "camera" | "rolls";
  onBack: () => void;
  onDetails: () => void;
  onFrame: (id: string) => void;
  /** Adding a frame not recorded on the result: only on a roll in a camera. */
  onAddFrame: () => void;
}) {
  const from = useReturnedFrom();
  useFrameInView(from?.name === "frame" ? from.id : null);
  const found = findRoll(state, rollId);
  if (!found) return null;
  const { roll, cameraName, finishedOn } = found;
  const count = recordedCount(state, rollId);
  const place = finishedOn ? `${cameraName} · ${rangeText(roll.loadedOn, finishedOn)}` : `${cameraName} · ${text.loaded(dayText(roll.loadedOn))}`;
  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack} menu>{via === "camera" ? cameraName : text.title}</Crumb>}>
      <ScreenTitle title={rollTitle(roll)} line={place} more={recordedText(count, roll.frames)} />
      <button type="button" onClick={onDetails} className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2 pr-3.5 pl-4 text-left">
        <span className="flex-1 text-[17px] font-medium">{text.details}</span>
        <span className="flex items-center gap-2 text-right text-sm text-muted">
          <ColourDot type={roll.type} />
          {filmLine(roll)}
        </span>
        <Icon name="chevron" size={18} className="flex-none text-muted" />
      </button>
      <SectionLabel>{text.frames}</SectionLabel>
      {count === 0 ? (
        <p className="m-0 px-1 text-[15px] leading-[1.45] text-muted">{finishedOn ? text.noFramesFinished : text.noFrames}</p>
      ) : (
        <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 py-0.5">
          {framesOn(state, rollId).map((frame) => (
            <FrameRow key={frame.id} frame={frame} onOpen={() => onFrame(frame.id)} />
          ))}
        </div>
      )}
      {!finishedOn && <AddCard title={text.addFrame} line={text.addFrameLine} onClick={onAddFrame} />}
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}

export interface RollDates {
  loadedOn: string;
  /** Null for a roll still in its camera. */
  finishedOn: string | null;
}

function DateRow({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (day: string) => void }) {
  return (
    <div className="flex min-h-14 items-center gap-3">
      <label htmlFor={id} className="flex-1 font-medium">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        max={today()}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-line bg-chip px-3 text-base text-ink"
      />
    </div>
  );
}

function ActionRow({ icon, title, line, onClick }: { icon: string; title: string; line: string; onClick: () => void }) {
  return (
    <button type="button" aria-haspopup="dialog" onClick={onClick} className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 py-1.5 text-left">
      <PathIcon d={icon} size={22} className="flex-none" />
      <span className="flex flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-[13px] text-muted">{line}</span>
      </span>
    </button>
  );
}

/** A roll's details: its film, length, name and dates, then Done; and finishing or deleting it, asked first. */
export function RollDetails({
  state,
  rollId,
  draft,
  onChange,
  dates,
  onDates,
  onBack,
  onDone,
  onFinish,
  onDelete,
  openAt = null,
}: {
  state: AppState;
  rollId: string;
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  dates: RollDates;
  onDates: (dates: RollDates) => void;
  onBack: () => void;
  onDone: () => void;
  onFinish: () => void;
  onDelete: () => void;
  /** For the tests: a question open at once. */
  openAt?: "finish" | "delete" | null;
}) {
  const [asking, setAsking] = useState(openAt);
  const found = findRoll(state, rollId);
  if (!found) return null;
  const { roll, cameraName, finishedOn } = found;
  const inCamera = finishedOn === null;
  const count = recordedCount(state, rollId);
  const recorded = recordedText(count, roll.frames);
  const ready = draftRoll(draft) !== null && isDay(dates.loadedOn) && (inCamera || isDay(dates.finishedOn));
  return (
    <Screen
      top={<Crumb backLabel={strings.app.back} onBack={onBack}>{rollTitle(roll)}</Crumb>}
      action={
        <MainButton onClick={onDone} disabled={!ready}>
          {text.done}
        </MainButton>
      }
    >
      <FilmStep draft={draft} onChange={onChange} title={text.details} line={inCamera ? text.detailsLineIn(cameraName, recorded) : text.detailsLineFrom(cameraName, recorded)} note={false} />
      <section className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 py-1">
        <DateRow id="loaded-on" label={text.loadedOn} value={dates.loadedOn} onChange={(loadedOn) => onDates({ ...dates, loadedOn })} />
        {!inCamera && <DateRow id="finished-on" label={text.finishedOn} value={dates.finishedOn ?? ""} onChange={(day) => onDates({ ...dates, finishedOn: day })} />}
      </section>
      <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 py-1">
        {inCamera && <ActionRow icon={CARD_ICON.finish} title={text.finish} line={text.finishLine} onClick={() => setAsking("finish")} />}
        <ActionRow icon={CARD_ICON.bin} title={text.delete} line={text.deleteLine} onClick={() => setAsking("delete")} />
      </div>
      <span className="flex-[1_0_8px]" />

      {asking === "finish" && inCamera && (
        <ConfirmSheet
          title={text.finishTitle}
          body={text.finishBody(cameraName)}
          yes={text.finishYes}
          no={text.keep}
          closeLabel={close}
          onYes={() => {
            setAsking(null);
            onFinish();
          }}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === "delete" && (
        <ConfirmSheet
          title={text.deleteTitle}
          body={[text.deleteBody(count), inCamera ? text.deleteEmpties(cameraName) : "", text.cantUndo].filter(Boolean).join(" ")}
          yes={text.deleteYes}
          no={text.keep}
          closeLabel={close}
          onYes={() => {
            setAsking(null);
            onDelete();
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </Screen>
  );
}
