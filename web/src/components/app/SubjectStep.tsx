// New shot, step 2: what are you shooting?.
import { useState } from "react";
import { answersToCamera } from "../../lib/cameraAnswers.ts";
import { effectiveGoal, usualDistanceM } from "../../lib/engine/index.ts";
import type { Goal, Subject } from "../../lib/engine/types.ts";
import {
  distanceText,
  isComplete,
  parseDistance,
  pickSubject,
  setDistance,
  setGoal,
  sunBehindApplies,
  toggle,
  usualDistanceText,
  type ShotDraft,
} from "../../lib/shot.ts";
import type { SavedCamera } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { PathIcon } from "./icons.tsx";
import { ChoiceCard, Crumb, HelpSheet, MainButton, OptionRow, Screen, ScreenTitle, SectionLabel, Sheet, SwitchRow } from "./parts.tsx";
import { GOAL_ICON, SUBJECT_ICON, SWITCH_ICON } from "./shotIcons.ts";

const text = strings.app.shot;
const SUBJECTS: Subject[] = ["portrait", "two_people", "group", "landscape", "other"];
const GOALS: Goal[] = ["blur", "sharp", "moving"];

/** A subject's line: what it is, and its usual distance with this lens. */
function subjectLine(camera: SavedCamera, subject: Subject) {
  const { desc } = text.subjects[subject];
  return subject === "other" ? desc : `${desc} · ${usualDistanceText(camera, subject)}`;
}

/** The distance sheet: typed in metres, with a comma or a point. Something else only counts once it has one. */
function DistanceSheet({
  camera,
  draft,
  forOther,
  onDone,
  onUsual,
  onClose,
}: {
  camera: SavedCamera;
  draft: ShotDraft;
  /** Picking Something else: the distance comes first. */
  forOther: boolean;
  onDone: (metres: number) => void;
  onUsual: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState(draft.distanceM !== null && !forOther ? String(draft.distanceM) : "");
  const metres = parseDistance(typed);
  const subject = forOther ? "other" : draft.subject;
  const usual = subject && subject !== "other" && subject !== "landscape" ? String(usualDistanceM(answersToCamera(camera.answers), subject)) : null;
  const canUseUsual = !forOther && draft.subject !== "other" && draft.distanceM !== null;
  return (
    <Sheet
      title={text.distanceTitle}
      description={text.distanceLine}
      closeLabel={strings.app.setup.close}
      onClose={onClose}
      above={
        forOther && (
          <span className="mx-1 flex min-h-[30px] items-center gap-1.5 self-start rounded-[15px] bg-chip pr-3 pl-2 text-[13px] font-medium">
            <PathIcon d={SUBJECT_ICON.other} size={16} />
            {text.subjects.other.label}
          </span>
        )
      }
    >
      <label className="mx-1 flex min-h-16 items-baseline gap-2 rounded-[18px] border-2 border-ink px-[18px] py-2">
        <span className="sr-only">{text.distanceTitle}</span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          maxLength={6}
          value={typed}
          placeholder={usual ?? ""}
          onChange={(event) => setTyped(event.target.value)}
          className="min-h-11 w-full min-w-0 flex-1 bg-transparent font-display text-4xl font-semibold tracking-[-0.02em] text-ink caret-[var(--accent)] outline-none placeholder:text-muted placeholder:opacity-50"
        />
        <span className="text-xl font-medium text-muted">{text.metres}</span>
      </label>
      {canUseUsual && (
        <button type="button" onClick={onUsual} className="mx-1 min-h-11 cursor-pointer self-start px-1 text-sm font-medium underline underline-offset-[3px]">
          {usual ? text.useUsual(usual) : text.useUsualInfinity}
        </button>
      )}
      <div className="flex flex-col px-1">
        <MainButton onClick={() => metres !== null && onDone(metres)} disabled={metres === null}>
          {text.distanceDone}
        </MainButton>
      </div>
    </Sheet>
  );
}

type Open = "subjects" | "distance" | "other" | "help" | null;

export function SubjectStep({
  draft,
  camera,
  onChange,
  onBack,
  onNext,
  openAt = null,
}: {
  draft: ShotDraft;
  camera: SavedCamera;
  onChange: (draft: ShotDraft) => void;
  onBack: () => void;
  onNext: () => void;
  /** For the tests: a sheet open at once. */
  openAt?: Open;
}) {
  const [open, setOpen] = useState<Open>(openAt);
  const lens = answersToCamera(camera.answers).focalLengthMm;
  const { subject } = draft;

  const pick = (next: Subject) => {
    if (next === "other") return setOpen("other");
    onChange(pickSubject(draft, next));
    setOpen(null);
  };

  const subjectRows = (asCards: boolean) =>
    SUBJECTS.map((value) =>
      asCards ? (
        <ChoiceCard
          key={value}
          icon={SUBJECT_ICON[value]}
          title={text.subjects[value].label}
          sub={subjectLine(camera, value)}
          pickedLabel={text.picked}
          minHeight={78}
          onClick={() => pick(value)}
        />
      ) : (
        <OptionRow
          key={value}
          icon={SUBJECT_ICON[value]}
          label={text.subjects[value].label}
          sub={subjectLine(camera, value)}
          on={value === subject}
          onPick={() => pick(value)}
        />
      ),
    );

  const distanceShown =
    draft.distanceM !== null ? distanceText(draft.distanceM) : subject === "landscape" ? text.farInfinity : subject ? usualDistanceText(camera, subject) : "";
  const usualGoal = subject ? effectiveGoal({ subject }) : null;

  return (
    <Screen
      top={<Crumb backLabel={text.backToLight} onBack={onBack}>{text.stepSubject}</Crumb>}
      action={
        <MainButton onClick={onNext} disabled={!isComplete(draft)}>
          {text.showSettings}
        </MainButton>
      }
    >
      <ScreenTitle title={text.subjectTitle} line={text.subjectLine(lens)} />

      {!subject && subjectRows(true)}

      {subject && (
        <>
          <ChoiceCard
            icon={SUBJECT_ICON[subject]}
            title={text.youreShooting}
            sub=""
            picked={{ value: text.subjects[subject].label, sub: text.subjects[subject].desc }}
            pickedLabel={text.picked}
            minHeight={80}
            onClick={() => setOpen("subjects")}
          />

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen("distance")}
            className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-[18px] bg-card py-1.5 pr-3 pl-[18px] text-left"
          >
            <span className="flex-1 text-[15px] text-muted">{text.focusDistance}</span>
            <span className="flex flex-col items-end">
              <span className="text-[17px] font-semibold">{distanceShown}</span>
              {draft.distanceM !== null && <span className="text-xs text-muted">{text.setByYou}</span>}
            </span>
            <span className="flex-none pl-1 text-sm font-medium text-muted">{text.change}</span>
          </button>

          <SectionLabel>{text.goalQuestion}</SectionLabel>
          <div role="radiogroup" aria-label={text.goalQuestion} className="flex flex-col gap-0.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card p-1">
            {GOALS.map((goal) => (
              <OptionRow
                key={goal}
                compact
                icon={GOAL_ICON[goal]}
                label={text.goals[goal].label}
                sub={text.goals[goal].sub}
                note={goal === usualGoal ? (subject === "portrait" ? text.usualForPortrait : text.usualForSubject) : undefined}
                on={goal === draft.goal}
                onPick={() => onChange(setGoal(draft, goal))}
              />
            ))}
          </div>

          {sunBehindApplies(draft.light, subject) && (
            <>
              <SectionLabel>{text.ifItApplies}</SectionLabel>
              <SwitchRow
                label={text.switches.sunBehind.label}
                sub={text.switches.sunBehind.sub}
                on={draft.sunBehind}
                fromLast={draft.sunBehind && draft.fromLast.sunBehind}
                fromLastText={text.fromLastShot}
                helpLabel={text.whatCounts(text.switches.sunBehind.label)}
                onFlip={() => onChange(toggle(draft, "sunBehind"))}
                onHelp={() => setOpen("help")}
              />
            </>
          )}
        </>
      )}
      <span className="flex-[1_0_8px]" />

      {open === "subjects" && (
        <Sheet title={text.subjectTitle} description={text.changeSubjectLine} closeLabel={strings.app.setup.close} onClose={() => setOpen(null)}>
          <div role="radiogroup" aria-labelledby="sheet-title" className="flex flex-col gap-1">
            {subjectRows(false)}
          </div>
        </Sheet>
      )}
      {(open === "distance" || open === "other") && (
        <DistanceSheet
          camera={camera}
          draft={draft}
          forOther={open === "other"}
          onDone={(metres) => {
            onChange(open === "other" && subject !== "other" ? pickSubject(draft, "other", metres) : setDistance(draft, metres));
            setOpen(null);
          }}
          onUsual={() => {
            onChange(setDistance(draft, null));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "help" && (
        <HelpSheet
          icon={SWITCH_ICON.sunBehind}
          title={text.switches.sunBehind.label}
          text={text.switches.sunBehind.helper}
          doneLabel={text.helpDone}
          closeLabel={strings.app.setup.close}
          onClose={() => setOpen(null)}
        />
      )}
    </Screen>
  );
}
