// First setup: your camera, then its film. Nothing is saved until Done.
// Adding a camera runs the same two steps with its own words. The camera page and the film screen in
// Settings reuse the name field, the questions and the film step.
import { useState, type ReactNode } from "react";
import { NOT_SURE, type CameraAnswers } from "../../lib/cameraAnswers.ts";
import {
  CAMERA_QUESTIONS,
  FILM_SPEEDS,
  FRAME_COUNTS,
  draftFrames,
  draftIso,
  draftRoll,
  optionsFor,
  parseFrames,
  parseIso,
  shownValue,
  type QuestionKey,
  type SetupDraft,
} from "../../lib/setup.ts";
import type { AppFilmType } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { Icon } from "./icons.tsx";
import { CameraValue, MainButton, RoundButton, Screen, Sheet, Tiles } from "./parts.tsx";

const text = strings.app.setup;
const questions = strings.app.questions;

export type SetupStep = "camera" | "film";

function Progress({ step }: { step: SetupStep }) {
  const label = step === "camera" ? text.stepCamera : text.stepFilm;
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <div role="img" aria-label={label} className="grid grid-cols-2 gap-1">
        <span className="h-1 rounded-sm bg-ink" />
        <span className={`h-1 rounded-sm ${step === "film" ? "bg-ink" : "bg-line"}`} />
      </div>
    </div>
  );
}

function Title({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex flex-col gap-1 px-0.5 pt-3.5 pb-1.5">
      <h1 className="m-0 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="m-0 text-sm leading-[1.35] text-muted">{line}</p>
    </div>
  );
}

/** One question about the camera: its name, a hint, and the answer so far. Tapping opens its sheet. */
function QuestionRow({
  question,
  answer,
  first,
  hint: withHint,
  onOpen,
}: {
  question: QuestionKey;
  answer: string;
  first: boolean;
  hint: boolean;
  onOpen: () => void;
}) {
  const { label, hint } = questions[question];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[54px] w-full cursor-pointer items-center gap-2.5 py-[5px] text-left ${first ? "" : "border-t border-line"}`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        {withHint && <span className="text-[13px] leading-[1.3] text-muted">{hint}</span>}
      </span>
      <CameraValue {...shownValue(question, answer)} size={answer === NOT_SURE ? 16 : 22} />
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

/** The sheet that answers one question: the camera's values as tiles, then "Not sure" (but not for B). */
function QuestionSheet({ question, answer, onPick, onClose }: { question: QuestionKey; answer: string; onPick: (value: string) => void; onClose: () => void }) {
  const { title, explain, notSure } = questions[question];
  const values = optionsFor(question)
    .map((option) => option.value)
    .filter((value) => value !== NOT_SURE);
  return (
    <Sheet title={title} description={explain} closeLabel={text.close} onClose={onClose}>
      <Tiles
        label={title}
        options={values}
        value={answer}
        onPick={onPick}
        columns={question === "hasBulb" ? 2 : 4}
        render={(value) => <CameraValue {...shownValue(question, value)} />}
      />
      {question !== "hasBulb" && (
        <button
          type="button"
          role="radio"
          aria-checked={answer === NOT_SURE}
          onClick={() => onPick(NOT_SURE)}
          className={`flex min-h-14 cursor-pointer items-center justify-between gap-2.5 rounded-[14px] px-4 text-left ${answer === NOT_SURE ? "bg-ink text-bg" : "bg-chip"}`}
        >
          <span className="font-medium whitespace-nowrap">{text.notSure}</span>
          <span className={`text-right text-sm ${answer === NOT_SURE ? "opacity-70" : "text-muted"}`}>{notSure}</span>
        </button>
      )}
    </Sheet>
  );
}

/** The camera's name, any text. */
export function NameField({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2 pr-2 pl-3.5">
      <label htmlFor="camera-name" className="flex-none font-medium">
        {text.name}
      </label>
      <input
        id="camera-name"
        type="text"
        value={value}
        placeholder={text.namePlaceholder}
        maxLength={40}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-chip px-3 text-[17px] font-medium text-ink"
      />
    </div>
  );
}

/** The six questions in two cards, lens and shutter speed dial, each answered in its own sheet. */
export function CameraQuestions({
  answers,
  onAnswer,
  hints,
  openAt,
}: {
  answers: CameraAnswers;
  onAnswer: (key: QuestionKey, value: string) => void;
  /** First setup says where to read each answer; the camera page in Settings doesn't. */
  hints: boolean;
  /** For the tests: one question's sheet open at once. */
  openAt?: QuestionKey;
}) {
  const [open, setOpen] = useState<QuestionKey | null>(openAt ?? null);
  const answer = (key: QuestionKey) => answers[key] as string;
  return (
    <>
      {(["lens", "dial"] as const).map((group) => (
        <section key={group} className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-2 pb-1">
          <h2 className="type-label m-0 pb-0.5 text-[13px] font-normal text-muted">{group === "lens" ? text.lens : text.dial}</h2>
          {CAMERA_QUESTIONS.filter((question) => question.group === group).map(({ key }, index) => (
            <QuestionRow key={key} question={key} answer={answer(key)} first={index === 0} hint={hints} onOpen={() => setOpen(key)} />
          ))}
        </section>
      ))}
      {open && (
        <QuestionSheet
          question={open}
          answer={answer(open)}
          onPick={(value) => {
            onAnswer(open, value);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function CameraStep({ draft, onChange, adding, openAt }: { draft: SetupDraft; onChange: (draft: SetupDraft) => void; adding: boolean; openAt?: QuestionKey }) {
  return (
    <>
      <Title title={adding ? strings.app.add.cameraTitle : text.cameraTitle} line={text.cameraLine} />
      <NameField value={draft.name} onChange={(name) => onChange({ ...draft, name })} />
      <CameraQuestions
        answers={draft.answers}
        onAnswer={(key, value) => onChange({ ...draft, answers: { ...draft.answers, [key]: value } as CameraAnswers })}
        hints
        openAt={openAt}
      />
    </>
  );
}

export function ColourDot({ type }: { type: AppFilmType }) {
  const background =
    type === "color_negative"
      ? "conic-gradient(#ff6a3d, #f2b84b, #4caf7a, #2051e8, #ff6a3d)"
      : "linear-gradient(90deg, #111113 50%, #ffffff 50%)";
  return <span aria-hidden="true" className="size-3.5 flex-none rounded-full" style={{ background }} />;
}

export function FilmStep({
  draft,
  onChange,
  title = text.filmTitle,
  line,
  unnamed = text.thisCamera,
  note = true,
  openAt = null,
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  title?: string;
  /** The line under the title. By default it asks which roll is in the camera. */
  line?: string;
  /** What a camera with no name yet is called: "your camera", or "the new camera" when adding one. */
  unnamed?: string;
  /** Whether to end with the note that the film stays with the camera. */
  note?: boolean;
  /** For the tests: the speed's or the length's sheet open at once. */
  openAt?: "speed" | "frames" | null;
}) {
  const camera = draft.name.trim() || unnamed;
  const [open, setOpen] = useState(openAt);
  return (
    <>
      <Title title={title} line={line ?? text.filmLine(camera)} />
      {/* The speed and the roll's length show big, picked from the usual ones or typed, in a sheet. */}
      <NumberRow label={text.filmSpeed} hint={text.speedHint} before={text.iso} value={draftIso(draft)} onOpen={() => setOpen("speed")} />
      <section className="flex flex-col gap-2.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-2.5 pb-3.5">
        <h2 className="type-label m-0 text-[13px] font-normal text-muted">{text.colourOrBlackAndWhite}</h2>
        <Tiles
          label={text.colourOrBlackAndWhite}
          options={["color_negative", "bw_negative"] as const}
          value={draft.type}
          onPick={(type) => onChange({ ...draft, type })}
          columns={2}
          render={(type) => (
            <span className="flex items-center gap-2 font-semibold">
              <ColourDot type={type} />
              {type === "color_negative" ? text.colour : text.blackAndWhite}
            </span>
          )}
        />
      </section>
      {/* The roll's length and name. */}
      <NumberRow label={text.framesOnRoll} hint={text.framesHint} value={draftFrames(draft)} onOpen={() => setOpen("frames")} />
      <section className="flex flex-col gap-2 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-2.5 pb-3.5">
        <label htmlFor="roll-name" className="text-[13px] text-muted">
          {text.rollName}
        </label>
        <input
          id="roll-name"
          type="text"
          maxLength={40}
          value={draft.rollName}
          placeholder={text.rollNamePlaceholder}
          onChange={(event) => onChange({ ...draft, rollName: event.target.value })}
          className="min-h-12 w-full rounded-xl border border-line bg-chip px-3 text-base text-ink"
        />
      </section>
      {note && <p className="m-0 px-1 py-0.5 text-[13px] leading-[1.4] text-muted">{text.filmNote(camera)}</p>}
      {open === "speed" && (
        <NumberSheet
          id="other-speed"
          title={text.filmSpeed}
          description={text.speedLine}
          options={FILM_SPEEDS}
          picked={draft.speed === "other" ? null : draft.speed}
          typedBefore={draft.speed === "other" ? draft.otherSpeed : ""}
          parse={parseIso}
          otherLabel={text.otherSpeed}
          placeholder={text.otherSpeedPlaceholder}
          invalid={text.otherSpeedInvalid}
          maxLength={5}
          renderTile={(speed) => (
            <span className="flex flex-col items-center gap-px py-1.5">
              <span className="text-[10px] font-semibold tracking-[0.12em] opacity-60">{text.iso}</span>
              <span className="font-display text-2xl leading-none font-semibold tracking-[-0.02em]">{speed}</span>
            </span>
          )}
          onPick={(iso) => {
            const tile = FILM_SPEEDS.find((option) => Number(option) === iso);
            onChange(tile ? { ...draft, speed: tile, otherSpeed: "" } : { ...draft, speed: "other", otherSpeed: String(iso) });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "frames" && (
        <NumberSheet
          id="other-frames"
          title={text.framesOnRoll}
          description={text.framesLine}
          options={FRAME_COUNTS}
          picked={draft.frames === "other" ? null : draft.frames}
          typedBefore={draft.frames === "other" ? draft.otherFrames : ""}
          parse={parseFrames}
          otherLabel={text.otherFrames}
          placeholder={text.otherFramesPlaceholder}
          invalid={text.otherFramesInvalid}
          maxLength={2}
          renderTile={(count) => <span className="font-display text-[26px] leading-none font-semibold tracking-[-0.02em]">{count}</span>}
          onPick={(frames) => {
            const tile = FRAME_COUNTS.find((option) => Number(option) === frames);
            onChange(tile ? { ...draft, frames: tile, otherFrames: "" } : { ...draft, frames: "other", otherFrames: String(frames) });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** A number picked or typed in its own sheet, shown big in its row: the film speed, or the roll's length. */
function NumberRow({ label, hint, before, value, onOpen }: { label: string; hint: string; before?: string; value: number | null; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="flex min-h-[76px] w-full cursor-pointer items-center gap-3 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2 pr-3.5 pl-4 text-left"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-[13px] leading-[1.3] text-muted">{hint}</span>
      </span>
      <span className="type-number flex items-baseline gap-1 font-display">
        {before && <span className="text-sm font-medium opacity-60">{before}</span>}
        <span className="text-[34px] leading-none font-semibold tracking-[-0.02em]">{value ?? "–"}</span>
      </span>
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

/** The usual values as tiles, picked with one tap; or another typed and kept with Done. */
function NumberSheet<T extends string>({
  id,
  title,
  description,
  options,
  picked,
  typedBefore,
  parse,
  otherLabel,
  placeholder,
  invalid,
  maxLength,
  renderTile,
  onPick,
  onClose,
}: {
  /** The typed field's id. */
  id: string;
  title: string;
  description: string;
  options: readonly T[];
  /** The tile holding the value now, or null when it was typed. */
  picked: T | null;
  /** The value typed before, if it was typed. */
  typedBefore: string;
  parse: (typed: string) => number | null;
  otherLabel: string;
  placeholder: string;
  invalid: string;
  maxLength: number;
  renderTile: (option: T) => ReactNode;
  onPick: (value: number) => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState(typedBefore);
  const value = parse(typed);
  const wrong = typed.trim() !== "" && value === null;
  return (
    <Sheet title={title} description={description} closeLabel={text.close} onClose={onClose}>
      <Tiles label={title} options={options} value={picked} onPick={(option) => onPick(Number(option))} render={renderTile} />
      <label htmlFor={id} className="px-1 pt-1 text-[13px] text-muted">
        {otherLabel}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        value={typed}
        placeholder={placeholder}
        aria-invalid={wrong || undefined}
        aria-describedby={wrong ? `${id}-error` : undefined}
        onChange={(event) => setTyped(event.target.value)}
        className="mx-1 min-h-14 rounded-[18px] border-2 border-ink bg-transparent px-[18px] font-display text-[28px] font-semibold tracking-[-0.02em] text-ink caret-[var(--accent)] outline-none placeholder:text-lg placeholder:font-normal placeholder:text-muted placeholder:opacity-60"
      />
      {wrong && (
        <p id={`${id}-error`} role="alert" className="m-0 px-1 text-sm text-warn-ink">
          {invalid}
        </p>
      )}
      <div className="flex flex-col px-1">
        <MainButton onClick={() => value !== null && onPick(value)} disabled={value === null}>
          {text.done}
        </MainButton>
      </div>
    </Sheet>
  );
}

export function Setup({
  step,
  draft,
  onChange,
  onBack,
  onNext,
  onWithoutFilm,
  adding = false,
  openAt,
}: {
  step: SetupStep;
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  onBack: () => void;
  /** Camera step: on to the film. Film step: Done, or Add camera. */
  onNext: () => void;
  /** Film step: the camera saved with no film yet, for loading a roll later. */
  onWithoutFilm?: () => void;
  /** Adding a camera from Settings or the menu, rather than the first setup. */
  adding?: boolean;
  /** For the tests: open one question's sheet at once. */
  openAt?: QuestionKey;
}) {
  const filmReady = draftRoll(draft) !== null;
  const add = strings.app.add;
  return (
    <Screen
      top={
        <>
          <RoundButton icon="back" label={strings.app.back} onClick={onBack} />
          <Progress step={step} />
        </>
      }
      action={
        <>
          {step === "film" && onWithoutFilm && (
            <button
              type="button"
              onClick={onWithoutFilm}
              className="mb-2.5 min-h-[52px] cursor-pointer rounded-[18px] bg-[var(--page-button)] text-[17px] font-semibold text-ink shadow-[var(--page-button-shadow)]"
            >
              {adding ? add.withoutFilm : text.withoutFilm}
            </button>
          )}
          <MainButton onClick={onNext} disabled={step === "film" && !filmReady}>
            {step === "camera" ? (adding ? add.next : text.next) : adding ? add.done : text.done}
          </MainButton>
        </>
      }
    >
      {step === "camera" ? (
        <CameraStep draft={draft} onChange={onChange} adding={adding} openAt={openAt} />
      ) : adding ? (
        <FilmStep draft={draft} onChange={onChange} title={add.filmTitle} unnamed={add.thisCamera} />
      ) : (
        <FilmStep draft={draft} onChange={onChange} />
      )}
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}
