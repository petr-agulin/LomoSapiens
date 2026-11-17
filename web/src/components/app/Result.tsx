// The result: what to set on the camera, where to focus, how to hold it, what to
// watch out for, and how the app got there. It only shows the result: to change it, the user goes back
// to the steps.
import { useState, type CSSProperties } from "react";
import { isRefusal } from "../../lib/engine/index.ts";
import type { Conditions, EngineResult, Focus, Recommendation, SharpZone, Support } from "../../lib/engine/types.ts";
import {
  adviceWarnings,
  estimateExplained,
  focusNumber,
  focusScale,
  howSteps,
  SCALE_TICKS,
  shutterForm,
  shutterSaid,
  type ShutterForm,
} from "../../lib/result.ts";
import type { SavedCamera, ShotAnswers } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import { Icon, PathIcon } from "./icons.tsx";
import { MenuSheet, type MenuItem } from "./MenuSheet.tsx";
import { useMenuOnReturn } from "./navigation.ts";
import { Pill } from "./Pill.tsx";
import { MainButton, RoundButton, Screen, Sheet } from "./parts.tsx";
import { Tags, shotTags } from "./ShotTags.tsx";

const text = strings.app.result;

/**
 * The big numbers: as large as two columns of the film strip allow on this screen, 40 to 80 px.
 * A four-digit shutter speed stops at 58 px.
 */
const BIG = "clamp(40px, calc((min(100vw, 480px) - 144px) / 3.42), 80px)";
const BIG_FOUR = "clamp(40px, calc((min(100vw, 480px) - 144px) / 4.56), 58px)";
const bigNumber = "font-display font-semibold leading-[0.92] tracking-[-0.045em] whitespace-nowrap";
const smallPart = "text-[26px] font-medium opacity-60 whitespace-nowrap";

const HAND_ICON =
  "M7 12V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V11M13 10.5V5.5a1.5 1.5 0 0 1 3 0V12M16 11.5V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 5 15l-1.4-3a1.5 1.5 0 0 1 2.6-1.4L7 12";

function Perforations() {
  return (
    <div aria-hidden="true" className="flex justify-between">
      {Array.from({ length: 14 }, (_, hole) => (
        <span key={hole} className="h-2 w-[11px] rounded-[2px] bg-bg" />
      ))}
    </div>
  );
}

/** The shutter as the dial marks it: a small "1/" and a big number, a big number and a small "s", or a big B and its seconds. */
function ShutterValue({ form }: { form: ShutterForm }) {
  const unit: CSSProperties = { marginBottom: `calc(${BIG} * 0.1)` };
  return (
    <div role="img" aria-label={shutterSaid(form)} className="type-number flex items-start gap-[3px] font-display">
      {form.form === "fraction" && (
        <span aria-hidden="true" className={`mt-2 ${smallPart}`}>
          1/
        </span>
      )}
      <span aria-hidden="true" className={bigNumber} style={{ fontSize: form.form === "fraction" && form.big.length >= 4 ? BIG_FOUR : BIG }}>
        {form.form === "bulb" ? "B" : form.big}
      </span>
      {form.form !== "fraction" && (
        <span aria-hidden="true" className={`ml-1 self-end ${smallPart}`} style={unit}>
          {form.form === "bulb" ? `${form.seconds} ${text.seconds}` : text.seconds}
        </span>
      )}
    </div>
  );
}

function FilmStrip({ final }: { final: Recommendation["final"] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-hero px-4 py-2.5 text-hero-ink">
      <Perforations />
      <div className="grid grid-cols-2 px-0.5">
        <div className="flex flex-col gap-1.5 pr-3.5">
          <span className="text-sm font-medium opacity-70">{text.aperture}</span>
          <div className="type-number flex items-start gap-[3px] font-display">
            <span className={`mt-2 ${smallPart}`}>f/</span>
            <span className={bigNumber} style={{ fontSize: BIG }}>
              {final.aperture}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 border-l border-hero-line pl-4">
          <span className="text-sm font-medium opacity-70">{text.shutter}</span>
          <ShutterValue form={shutterForm(final.shutter, final.bulbSeconds)} />
        </div>
      </div>
      <Perforations />
    </div>
  );
}

/** The sharp zone on a scale from 0.5 m to ∞: a coral band with brackets, and a pointer at the set distance. */
function FocusScale({ focus, zone }: { focus: Focus; zone: SharpZone }) {
  const { left, width, mark, boldTick } = focusScale(focus, zone);
  const at = (percent: number): CSSProperties => ({ left: `${percent}%` });
  return (
    <div aria-hidden="true" className="type-number relative h-[34px]">
      <div className="absolute inset-x-0 top-[8.5px] h-0.5 rounded-[1px] bg-scale" />
      <div className="absolute top-px h-4 bg-[var(--accent-zone)]" style={{ ...at(left), width: `${width}%` }} />
      <div className="absolute top-[8.5px] h-0.5 bg-accent" style={{ ...at(left), width: `${width}%` }} />
      <div className="absolute top-px h-4 w-[5px] border-2 border-r-0 border-accent" style={at(left)} />
      <div className="absolute top-px h-4 w-[5px] -translate-x-full border-2 border-l-0 border-accent" style={at(left + width)} />
      <div className="absolute top-0.5 h-[15px] w-0.5 -translate-x-1/2 bg-ink" style={at(mark)} />
      <div className="absolute -top-[7px] size-0 -translate-x-1/2 border-x-[6px] border-t-8 border-x-transparent border-t-ink" style={at(mark)} />
      {SCALE_TICKS.map((tick) => (
        <span
          key={tick.label}
          className={`absolute top-[19px] -translate-x-1/2 text-xs ${tick.label === boldTick ? "font-semibold text-ink" : "text-muted"}`}
          style={at(tick.at)}
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
}

const CORNERS = [
  "top-2.5 left-2.5 border-t-2 border-l-2",
  "top-2.5 right-2.5 border-t-2 border-r-2",
  "bottom-2.5 left-2.5 border-b-2 border-l-2",
  "bottom-2.5 right-2.5 border-b-2 border-r-2",
];

/** The focus card, drawn as a viewfinder: frame-line corners and a split-image circle behind the distance. */
function FocusCard({ final }: { final: Recommendation["final"] }) {
  const { focus, sharpZone } = final;
  const ring = `calc(${BIG} * 1.08)`;
  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-[28px] bg-card px-[34px] pt-4 pb-5">
      {CORNERS.map((corner) => (
        <span key={corner} aria-hidden="true" className={`absolute size-3.5 border-scale ${corner}`} />
      ))}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-muted">{text.focusDistance}</span>
          <div className="type-number flex items-baseline gap-1 font-display">
            <span className={`relative ${bigNumber}`} style={{ fontSize: BIG }}>
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full border-[1.5px] border-scale"
                style={{
                  width: ring,
                  height: ring,
                  background:
                    "linear-gradient(transparent calc(50% - 1px), var(--scale) calc(50% - 1px), var(--scale) calc(50% + 1px), transparent calc(50% + 1px))",
                }}
              />
              <span className="relative">{focusNumber(focus)}</span>
            </span>
            {focus.meters !== null && <span className="text-[26px] font-medium text-muted">{text.metres}</span>}
          </div>
          {focus.source === "landscape" && focus.meters !== null && <span className="-mt-1 text-[13px] leading-[1.3] text-muted">{text.nextMark}</span>}
        </div>
        <div className="ml-auto flex flex-col items-end gap-0.5 pb-1 text-right">
          <span className="type-label text-[13px] text-muted">{text.sharpZone}</span>
          <span className="type-number font-display text-[22px] font-semibold tracking-[-0.01em] whitespace-nowrap">
            {text.sharpRange(sharpZone.nearM, sharpZone.farM)}
          </span>
        </div>
      </div>
      <FocusScale focus={focus} zone={sharpZone} />
    </div>
  );
}

/** Holding advice and warnings, only when there is one. No heading: the hand and the "!" say what each part is. */
function AdviceCard({ handling, warnings }: { handling: string | null; warnings: ReturnType<typeof adviceWarnings> }) {
  if (!handling && warnings.length === 0) return null;
  return (
    <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-4 py-0.5">
      {handling && (
        <div className="flex items-start gap-3 py-2.5">
          <span role="img" aria-label={text.holding} className="grid size-8 flex-none place-items-center rounded-full bg-bg">
            <PathIcon d={HAND_ICON} size={18} />
          </span>
          <span className="min-w-0 flex-1 pt-1.5 text-[15px] leading-[1.35]">{handling}</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className={`flex items-start gap-3 py-2.5 ${handling ? "border-t border-line" : ""}`}>
          <span role="img" aria-label={text.warning} className="grid size-8 flex-none place-items-center rounded-full bg-warn-soft text-warn-ink">
            <span aria-hidden="true" className="font-display text-lg leading-none font-bold">
              !
            </span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1.5">
            {warnings.map((warning, index) => (
              <span key={index} className="text-[15px] leading-[1.35]">
                {warning.text}
                <span className="whitespace-nowrap">{warning.settings}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The reasoning, quiet on purpose: a muted label and a plain numbered list, nothing to tap. */
function HowItGotThere({ result }: { result: Recommendation }) {
  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-1.5 px-3.5 pt-2 pb-1">
      <h2 id="how-title" className="type-label m-0 text-[13px] font-normal text-muted">
        {text.how}
      </h2>
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.45] text-muted">
        {howSteps(result).map((step, index) => (
          <li key={index} className="pl-0.5">
            {step.text}
            <span className="whitespace-nowrap">{step.settings}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Result({
  camera,
  hold,
  answers,
  conditions,
  result,
  onMenu,
  onNewShot,
  onRecord,
  recordedFrame = null,
  rollLine = null,
  inUseName = camera.name,
  openAt = null,
}: {
  camera: SavedCamera;
  hold: Support;
  answers: ShotAnswers;
  conditions: Conditions;
  result: EngineResult;
  onMenu: (item: MenuItem) => void;
  onNewShot: () => void;
  /** "Record this shot": left out when there are no settings or no roll to record on. */
  onRecord?: () => void;
  /** The frame last recorded from this result, if any. */
  recordedFrame?: number | null;
  /** The roll in the camera in use, for the menu's Rolls row. */
  rollLine?: string | null;
  /** The camera in use, for the menu, when the advice is for another camera's roll. By default, `camera`. */
  inUseName?: string;
  /** For the tests: a sheet open at once. */
  openAt?: "estimate" | "menu" | null;
}) {
  // Back from a place picked in the menu finds the menu open again.
  const returning = useMenuOnReturn();
  const [open, setOpen] = useState(returning ? "menu" : openAt);
  const refused = isRefusal(result);
  const estimate = refused ? null : estimateExplained(conditions, result);

  return (
    <Screen
      top={
        <>
          <Pill camera={camera} hold={hold} />
          <RoundButton icon="menu" label={strings.app.menu} onClick={() => setOpen("menu")} />
        </>
      }
      action={
        <>
          {recordedFrame !== null && (
            <p role="status" className="m-0 flex items-center justify-center gap-1.5 pb-2.5 text-[15px] font-medium">
              <Icon name="check" size={16} />
              {strings.app.record.recorded(recordedFrame)}
            </p>
          )}
          {onRecord && !refused && (
            <button type="button" onClick={onRecord} className="mb-2.5 min-h-[52px] cursor-pointer rounded-[18px] bg-[var(--page-button)] text-[17px] font-semibold text-ink shadow-[var(--page-button-shadow)]">
              {recordedFrame === null ? strings.app.record.button : strings.app.record.another}
            </button>
          )}
          <MainButton onClick={onNewShot}>{strings.app.home.newShot}</MainButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 pt-[22px] pb-2 [@media(max-height:699px)]:pt-1.5">
        <h1 className="mx-1 my-0 flex-none font-display text-[28px] font-semibold tracking-[-0.02em] whitespace-nowrap [@media(max-height:699px)]:text-[26px]">
          {text.title}
        </h1>
        {estimate && (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={text.estimatedSaid(estimate.reasons)}
            onClick={() => setOpen("estimate")}
            className="-my-2 inline-flex min-h-12 flex-none cursor-pointer items-center pl-1 text-[15px] font-semibold whitespace-nowrap text-info"
          >
            <span className="underline decoration-info-line decoration-dotted decoration-2 underline-offset-[5px]">{text.estimated}</span>
          </button>
        )}
      </div>

      {refused ? (
        <div role="alert" className="flex flex-col gap-1 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-4 py-3.5">
          <span className="text-[17px] font-medium">{text.cantAdvise}</span>
          <span className="text-[15px] text-muted">{strings.engine.refusal[result.refused]}</span>
        </div>
      ) : (
        <>
          <FilmStrip final={result.final} />
          <FocusCard final={result.final} />
          <AdviceCard handling={strings.engine.handling(result.final)} warnings={adviceWarnings(conditions, result)} />
        </>
      )}

      <section aria-labelledby="shot-title" className="flex flex-col gap-1.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 pt-[9px] pb-[11px]">
        <h2 id="shot-title" className="type-label m-0 text-[13px] font-normal text-muted">
          {text.yourShot}
        </h2>
        <Tags tags={shotTags(answers)} />
      </section>

      {!refused && <HowItGotThere result={result} />}
      <span className="flex-[1_0_8px]" />

      {open === "estimate" && estimate && (
        <Sheet title={text.estimateTitle} description={estimate.reasons} closeLabel={strings.app.setup.close} onClose={() => setOpen(null)}>
          {estimate.groups.map((group) => (
            <div key={group.title} className="mx-2 flex flex-col gap-1 border-t border-line pt-3.5">
              <h3 className="m-0 text-sm font-semibold">{group.title}</h3>
              <p className="m-0 text-base leading-[1.45]">{group.text}</p>
            </div>
          ))}
          <MainButton onClick={() => setOpen(null)}>{text.gotIt}</MainButton>
        </Sheet>
      )}
      {open === "menu" && (
        <MenuSheet
          current={null}
          cameraName={inUseName}
          rollLine={rollLine}
          onClose={() => setOpen(null)}
          onPick={(item) => {
            setOpen(null);
            onMenu(item);
          }}
        />
      )}
    </Screen>
  );
}
