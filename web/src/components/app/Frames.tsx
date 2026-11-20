// A roll's frames: each frame's row on the
// roll's page, and the frame's own page, with what was set beside the advice, the shot, the note, changing
// or deleting it, and its neighbours on the roll. The photo joins in step 5, the labels after developing in step 6.
import { useState } from "react";
import { adviceAsSet, differenceText, differsFromAdvice, lightDifference, settingsText } from "../../lib/record.ts";
import { momentText, rollTitle } from "../../lib/rollText.ts";
import { filmLine } from "../../lib/setup.ts";
import { LABELS, MAX_DEVELOPED_NOTE, findRoll, framesOn, type AppState, type Frame, type FrameLabel, type ShotAnswers } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { CARD_ICON, Icon, PathIcon } from "./icons.tsx";
import { SettingsStrip } from "./LastShot.tsx";
import { PhotoView } from "./Photo.tsx";
import { ConfirmSheet, Crumb, Screen, ScreenTitle, Unbroken } from "./parts.tsx";
import { HOLD_ICON, SUBJECT_ICON } from "./shotIcons.ts";
import { Tags, shotTags } from "./ShotTags.tsx";

const text = strings.app.frames;
const photoText = strings.app.photo;
const developedText = strings.app.developed;

/** The light and the subject, as words: "Sun behind clouds · Portrait". */
function sceneWords(answers: ShotAnswers) {
  const tags = shotTags(answers);
  const subject = tags.find((tag) => tag.icon === SUBJECT_ICON[answers.subject]);
  return [tags[0].label, ...(subject ? [subject.label] : [])].join(" · ");
}

/** A frame's row in its roll's list, by its id: the list brings it into view on returning from the frame. */
export const frameRowId = (frameId: string) => `frame-row-${frameId}`;

/**
 * One frame in a roll's list: its number, what was set, the advice when anything differs, the note, and the
 * labels after developing with their note, cut to the rest of the labels' line, or a line of its own.
 */
export function FrameRow({ frame, onOpen }: { frame: Frame; onOpen: () => void }) {
  const differs = differsFromAdvice(frame.set, frame.advice);
  return (
    <button type="button" id={frameRowId(frame.id)} onClick={onOpen} className="flex min-h-[66px] w-full cursor-pointer items-center gap-3 border-t border-line py-2 text-left first:border-t-0">
      <span className="grid h-9 min-w-9 flex-none place-items-center rounded-[10px] bg-hero px-1.5 font-display text-[17px] font-semibold text-hero-ink">
        <span className="sr-only">{text.title(frame.number)}</span>
        <span aria-hidden="true">{frame.number}</span>
      </span>
      {frame.photo ? (
        <PhotoView photoKey={frame.photo} label={photoText.saidFrame(frame.number)} className="size-11 flex-none rounded-xl object-cover" holder="size-11 flex-none rounded-xl" />
      ) : (
        <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-xl bg-chip">
          <PathIcon d={SUBJECT_ICON[frame.answers.subject]} size={22} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">
          <Unbroken parts={settingsText(frame.set).split(" · ")} />
        </span>
        <span className={`text-[13px] leading-[1.35] ${differs ? "font-medium text-ink" : "text-muted"}`}>
          {differs ? text.advised(settingsText(adviceAsSet(frame.advice))) : sceneWords(frame.answers)}
        </span>
        {frame.note && <span className="truncate text-[13px] leading-[1.35] text-muted">{frame.note}</span>}
        {(frame.labels.length > 0 || frame.developedNote) && (
          <span className="flex flex-wrap items-center gap-1 pt-1">
            {frame.labels.map((label) => (
              <span key={label} className="rounded-full bg-chip px-2 py-px text-xs font-medium text-ink">
                {developedText.labels[label]}
              </span>
            ))}
            {/* At least 6rem of the labels' last line, or a whole line under them; its lines join into one. */}
            {frame.developedNote && <span className="min-w-24 flex-1 truncate text-[13px] leading-[1.35] text-muted">{frame.developedNote}</span>}
          </span>
        )}
      </span>
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

function ActionRow({ icon, title, onClick, opensSheet }: { icon: string; title: string; onClick: () => void; opensSheet?: boolean }) {
  return (
    <button type="button" aria-haspopup={opensSheet ? "dialog" : undefined} onClick={onClick} className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-t border-line py-1.5 text-left font-medium first:border-t-0">
      <PathIcon d={icon} size={22} className="flex-none" />
      {title}
    </button>
  );
}

/**
 * After developing: the labels, any number at once, and a note of a few lines. They save as they change.
 * The labels are small tags, as in "Your shot", to keep the card short; each one also answers a tap in
 * the gap around it, so no tap between them is lost.
 */
function AfterDeveloping({
  frame,
  onLabels,
  onNote,
}: {
  frame: Frame;
  onLabels: (labels: FrameLabel[]) => void;
  onNote: (note: string) => void;
}) {
  // The field keeps what is typed, spaces included; what is saved is trimmed.
  const [note, setNote] = useState(frame.developedNote);
  const toggle = (label: FrameLabel) => onLabels(frame.labels.includes(label) ? frame.labels.filter((on) => on !== label) : [...frame.labels, label]);
  return (
    <section aria-labelledby="developed" className="flex flex-col gap-2 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-1 pb-3.5">
      <h2 id="developed" className="type-label m-0 pt-2 pb-0.5 text-[13px] font-normal text-muted">
        {developedText.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {LABELS.map((label) => {
          const on = frame.labels.includes(label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(label)}
              className={`relative inline-flex h-7 cursor-pointer items-center rounded-full px-3 text-sm font-medium whitespace-nowrap before:absolute before:-inset-1 before:content-[''] ${on ? "bg-hero text-hero-ink" : "bg-chip text-ink"}`}
            >
              {developedText.labels[label]}
            </button>
          );
        })}
      </div>
      <label htmlFor="developed-note" className="pt-1.5 text-[13px] text-muted">
        {developedText.note}
      </label>
      {/* Four lines to start with, growing with what is typed. */}
      <textarea
        id="developed-note"
        rows={4}
        maxLength={MAX_DEVELOPED_NOTE}
        value={note}
        placeholder={developedText.notePlaceholder}
        onChange={(event) => {
          setNote(event.target.value);
          onNote(event.target.value);
        }}
        className="min-h-[115px] w-full resize-none rounded-xl border border-line bg-chip px-3 py-2.5 text-base leading-[1.45] text-ink [field-sizing:content]"
      />
    </section>
  );
}

const PENCIL = "M4.5 19.5l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L9 18.5zM13.5 7l3.5 3.5";

/** One frame's page. */
export function FramePage({
  state,
  frameId,
  onBack,
  onEdit,
  onDelete,
  onNeighbour,
  onLabels = () => undefined,
  onDevelopedNote = () => undefined,
  openAt = null,
}: {
  state: AppState;
  frameId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Shows a neighbouring frame in this one's place, so Back returns to the roll in one press. */
  onNeighbour: (id: string) => void;
  /** The labels after developing, changed. */
  onLabels?: (labels: FrameLabel[]) => void;
  /** The note after developing, as typed. */
  onDevelopedNote?: (note: string) => void;
  /** For the tests: the delete question open at once. */
  openAt?: "delete" | null;
}) {
  const [deleting, setDeleting] = useState(openAt === "delete");
  const frame = state.frames.find((saved) => saved.id === frameId);
  const found = frame && findRoll(state, frame.rollId);
  if (!frame || !found) return null;
  const list = framesOn(state, frame.rollId);
  const index = list.findIndex((saved) => saved.id === frameId);
  const previous = index > 0 ? list[index - 1] : null;
  const next = list[index + 1] ?? null;
  const differs = differsFromAdvice(frame.set, frame.advice);
  const hold = { icon: HOLD_ICON[frame.hold], label: strings.app.pill.hold[frame.hold] };
  const neighbours =
    previous || next ? (
      <div className="flex gap-2.5">
        {previous && (
          <button
            type="button"
            aria-label={text.previousSaid(previous.number)}
            onClick={() => onNeighbour(previous.id)}
            className="flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-[18px] bg-[var(--page-button)] text-[17px] font-semibold text-ink shadow-[var(--page-button-shadow)]"
          >
            <Icon name="back" size={18} />
            {text.neighbour(previous.number)}
          </button>
        )}
        {next && (
          <button
            type="button"
            aria-label={text.nextSaid(next.number)}
            onClick={() => onNeighbour(next.id)}
            className="flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-[18px] bg-ink text-[17px] font-semibold text-bg"
          >
            {text.neighbour(next.number)}
            <Icon name="chevron" size={18} />
          </button>
        )}
      </div>
    ) : undefined;

  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack}>{rollTitle(found.roll)}</Crumb>} action={neighbours}>
      <ScreenTitle title={text.title(frame.number)} line={momentText(frame.recordedAt)} />
      {/* The photo, to look at: adding, retaking or removing it is in "Change this frame". */}
      {frame.photo && (
        <section className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card p-2.5">
          <PhotoView photoKey={frame.photo} label={photoText.saidFrame(frame.number)} className="max-h-[360px] w-full rounded-[14px] bg-chip object-contain" holder="aspect-[4/3] w-full rounded-[14px]" />
        </section>
      )}
      <section aria-labelledby="you-set" className="flex flex-col gap-2.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-3 pb-3.5">
        <h2 id="you-set" className="type-label m-0 text-[13px] font-normal text-muted">
          {text.youSet}
        </h2>
        <SettingsStrip
          aperture={frame.set.aperture}
          shutter={frame.set.shutter}
          bulbSeconds={frame.set.bulbSeconds}
          focusM={frame.set.focusM}
          frameLabel={strings.app.home.frameOf(frame.number, found.roll.frames)}
          print={filmLine(found.roll)}
        />
        <p className="m-0 flex flex-col gap-0.5">
          {differs && <span className="text-[15px] text-muted">{text.advised(settingsText(adviceAsSet(frame.advice)))}</span>}
          <span className="text-[15px] font-semibold">{differenceText(lightDifference(frame.set, frame.advice))}</span>
        </p>
      </section>
      <section aria-labelledby="frame-shot" className="flex flex-col gap-1.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-[9px] pb-[11px]">
        <h2 id="frame-shot" className="type-label m-0 text-[13px] font-normal text-muted">
          {text.yourShot}
        </h2>
        <Tags tags={[...shotTags(frame.answers), hold]} />
      </section>
      {frame.note && (
        <section aria-labelledby="frame-note" className="flex flex-col gap-1 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-[9px] pb-3">
          <h2 id="frame-note" className="type-label m-0 text-[13px] font-normal text-muted">
            {text.note}
          </h2>
          <p className="m-0 text-base leading-[1.45] [overflow-wrap:anywhere]">{frame.note}</p>
        </section>
      )}
      <AfterDeveloping frame={frame} onLabels={onLabels} onNote={onDevelopedNote} />
      <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 py-1">
        <ActionRow icon={PENCIL} title={text.change} onClick={onEdit} />
        <ActionRow icon={CARD_ICON.bin} title={text.delete} onClick={() => setDeleting(true)} opensSheet />
      </div>
      <span className="flex-[1_0_8px]" />

      {deleting && (
        <ConfirmSheet
          title={text.deleteTitle(frame.number)}
          body={text.deleteBody}
          yes={text.deleteYes}
          no={text.keep}
          closeLabel={strings.app.setup.close}
          onYes={() => {
            setDeleting(false);
            onDelete();
          }}
          onClose={() => setDeleting(false)}
        />
      )}
    </Screen>
  );
}
