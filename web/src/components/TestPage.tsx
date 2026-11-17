import { useEffect, useId, useRef, useState } from "react";
import {
  FASTEST_SHUTTERS,
  SLOWEST_SHUTTERS,
  SMALLEST_APERTURES,
  WIDEST_APERTURES,
  recommend,
  slowestShutter,
  usualDistanceM,
} from "../lib/engine/index.ts";
import type { ParseResult } from "../lib/parser.ts";
import { strings, testPageStrings } from "../lib/strings.ts";
import type { HelpText } from "../lib/strings.ts";
import DescribeBox from "./DescribeBox";
import { HelpButton, HelpPanel } from "./FieldHelp";
import { ResultPanel } from "./ResultPanel";
import {
  DEFAULT_FORM,
  FOCAL_LENGTHS,
  FILM_TYPES,
  GOALS,
  LOW_LIGHTS,
  NOT_SURE,
  NOT_SURE_CAMERA,
  SCENES,
  SKIES,
  SUBJECTS,
  SUPPORTS,
  answersToCamera,
  applyParse,
  filmSpeedChoices,
  formToConditions,
  marksAsUsual,
  sceneUsesSky,
  showsSunOptions,
  withSubject,
} from "./testPageForm.ts";
import type { Camera } from "../lib/engine/index.ts";
import type { CameraAnswers, ParseReport, TestForm } from "./testPageForm.ts";

const text = testPageStrings;
const { labels, options } = text;

type Option<T extends string> = { value: T; label: string };

function named<T extends string>(values: readonly T[], names: Record<T, string>): Option<T>[] {
  return values.map((value) => ({ value, label: names[value] }));
}

function Select<T extends string>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  hint?: string;
  /** Adds a "?" beside the name that opens this explanation under the field. */
  help?: HelpText;
  onChange: (value: T) => void;
}) {
  // The label points at the dropdown by id, so the "?" can sit beside the name without becoming part of it.
  const id = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <div className="flex items-center gap-1">
        <label htmlFor={`${id}-field`}>{props.label}</label>
        {props.help && (
          <HelpButton
            field={props.label}
            open={helpOpen}
            panelId={`${id}-help`}
            onToggle={() => setHelpOpen((open) => !open)}
          />
        )}
      </div>
      <select
        id={`${id}-field`}
        className="rounded border border-neutral-400 bg-white p-2 text-base font-normal"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as T)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {props.help && <HelpPanel id={`${id}-help`} open={helpOpen} help={props.help} />}
      {props.hint && <span className="font-normal text-neutral-600">{props.hint}</span>}
    </div>
  );
}

function Checkbox(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        className="size-5"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.label}
    </label>
  );
}

const cameraText = text.cameraOptions;
const notSure = (counted: string) => ({ value: NOT_SURE, label: cameraText.notSure(counted) });
const cameraQuestionOptions = {
  widestAperture: [
    ...named(WIDEST_APERTURES, cameraText.widestAperture),
    notSure(cameraText.widestAperture[NOT_SURE_CAMERA.widestAperture]),
  ],
  smallestAperture: [
    ...named(SMALLEST_APERTURES, cameraText.smallestAperture),
    notSure(cameraText.smallestAperture[NOT_SURE_CAMERA.smallestAperture]),
  ],
  focalLengthMm: [
    ...FOCAL_LENGTHS.map((mm) => ({ value: String(mm), label: cameraText.focalLengthMm(mm) })),
    notSure(cameraText.focalLengthMm(NOT_SURE_CAMERA.focalLengthMm)),
  ],
  fastestShutter: [
    ...named(FASTEST_SHUTTERS, cameraText.fastestShutter),
    notSure(cameraText.fastestShutter[NOT_SURE_CAMERA.fastestShutter]),
  ],
  slowestShutter: [
    ...named(SLOWEST_SHUTTERS, cameraText.slowestShutter),
    notSure(cameraText.slowestShutter[NOT_SURE_CAMERA.slowestShutter]),
  ],
  hasBulb: named(["yes", "no"] as const, cameraText.hasBulb),
} as { [K in keyof CameraAnswers]: Option<CameraAnswers[K]>[] };
const CAMERA_QUESTIONS = Object.keys(cameraQuestionOptions) as Array<keyof CameraAnswers>;

const lightKindOptions = (["daylight", "lowlight"] as const).map((kind) => ({
  value: kind,
  label: text.lightKindOption(options.lightKind[kind], options.lightKindMeaning[kind]),
}));
const skyOptions = SKIES.map((sky) => ({ value: sky, label: text.skyOption(options.sky[sky], options.skyLooks[sky]) }));
const sceneOptions = SCENES.map((scene) => ({
  value: scene,
  label: text.sceneOption(options.scene[scene], options.scenePlaces[scene]),
}));
/** The usual distances follow the user's own lens. */
const subjectOptions = (camera: Camera) =>
  SUBJECTS.map((subject) => {
    const focus =
      subject === "landscape"
        ? options.landscapeFocus
        : subject === "other"
          ? options.otherFocus
          : options.subjectFocus(usualDistanceM(camera, subject));
    return {
      value: subject,
      label: text.subjectOption(options.subject[subject], options.subjectMeaning[subject], focus),
    };
  });
const distanceHint = text.distanceHint(
  options.subject.other,
  SUBJECTS.filter((subject) => subject !== "other").map((subject) => options.subject[subject]),
);

/** initialForm lets tests open the page on another camera or shot. */
export default function TestPage({ initialForm = DEFAULT_FORM }: { initialForm?: TestForm }) {
  const [form, setForm] = useState<TestForm>(initialForm);
  const [report, setReport] = useState<ParseReport | null>(null);
  const [aiReply, setAiReply] = useState<ParseResult | null>(null);
  const change = (changes: Partial<TestForm>) => setForm((current) => ({ ...current, ...changes }));
  const changeCamera = (changes: Partial<CameraAnswers>) =>
    setForm((current) => ({ ...current, camera: { ...current.camera, ...changes } }));

  // The AI answers a moment later, by when the user may have changed a control.
  const latestForm = useRef(form);
  useEffect(() => {
    latestForm.current = form;
  });

  function handleParsed(parse: ParseResult | null, words: string) {
    setAiReply(parse);
    const nextReport = parse ? applyParse(latestForm.current, parse, words) : null;
    setReport(nextReport);
    if (nextReport) setForm(nextReport.form);
  }

  const conditions = formToConditions(form);
  const result = recommend(conditions);
  const filmSpeedOptions = filmSpeedChoices(form.iso).map((iso) => ({ value: String(iso), label: String(iso) }));
  const goalOptions = GOALS.map((goal) => ({
    value: goal,
    label: marksAsUsual(goal, form.subject) ? options.goalUsual(options.goal[goal]) : options.goal[goal],
  }));
  // The support limits follow the user's own camera.
  const camera = answersToCamera(form.camera);
  const supportOptions = SUPPORTS.map((support) => ({
    value: support,
    label: text.supportOption(
      strings.engine.support[support],
      text.supportLimit[support](strings.engine.shutter(slowestShutter(support, camera)), camera.hasBulb),
    ),
  }));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 bg-white p-6 text-neutral-900">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{strings.appName}</h1>
        <p>{strings.tagline}</p>
        <p className="text-sm text-neutral-600">{text.note}</p>
      </header>

      <DescribeBox report={report} onParsed={handleParsed} />

      {/* minmax(0, …) lets a column be narrower than its longest dropdown option, so a phone never scrolls sideways. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form className="flex flex-col gap-4 self-start" onSubmit={(event) => event.preventDefault()}>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{text.cameraHeading}</h2>
            <p className="text-sm text-neutral-600">{text.cameraNote}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CAMERA_QUESTIONS.map((question) => (
                <Select
                  key={question}
                  label={text.cameraLabels[question]}
                  value={form.camera[question]}
                  options={cameraQuestionOptions[question] as Option<string>[]}
                  hint={question in text.cameraHints ? text.cameraHints[question as keyof typeof text.cameraHints] : undefined}
                  onChange={(answer) => changeCamera({ [question]: answer })}
                />
              ))}
            </div>
          </section>

          <h2 className="text-xl font-semibold">{text.shotHeading}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                label={labels.lightKind}
                value={form.lightKind}
                options={lightKindOptions}
                help={text.lightKindHelp}
                onChange={(lightKind) => change({ lightKind })}
              />
            </div>

            {form.lightKind === "daylight" ? (
              <>
                {sceneUsesSky(form.scene) && (
                  <div className="sm:col-span-2">
                    <Select
                      label={labels.sky}
                      value={form.sky}
                      options={skyOptions}
                      onChange={(sky) => change({ sky })}
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Select label={labels.scene} value={form.scene} options={sceneOptions} hint={text.fieldsNote} onChange={(scene) => change({ scene })} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Select
                  label={labels.lowlight}
                  value={form.lowlight}
                  options={named(LOW_LIGHTS, options.lowlight)}
                  onChange={(lowlight) => change({ lowlight })}
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <Select label={labels.subject} value={form.subject} options={subjectOptions(camera)} onChange={(subject) => setForm((current) => withSubject(current, subject))} />
            </div>

            <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
              {labels.distance}
              <input
                type="number"
                min="0.1"
                step="0.1"
                className="rounded border border-neutral-400 bg-white p-2 text-base font-normal"
                value={form.distance}
                onChange={(event) => change({ distance: event.target.value })}
              />
              <span className="font-normal text-neutral-600">{distanceHint}</span>
            </label>

            <div className="sm:col-span-2">
              <Select
                label={labels.goal}
                value={form.goal}
                options={goalOptions}
                onChange={(goal) => change({ goal })}
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label={labels.support}
                value={form.support}
                options={supportOptions}
                onChange={(support) => change({ support })}
              />
            </div>

            <Select label={labels.iso} value={form.iso} options={filmSpeedOptions} onChange={(iso) => change({ iso })} />
            <Select label={labels.filmType} value={form.filmType} options={named(FILM_TYPES, options.filmType)} onChange={(filmType) => change({ filmType })} />

          </div>

          <div className="flex flex-col gap-2">
            {form.lightKind === "daylight" && sceneUsesSky(form.scene) && (
              <Checkbox label={labels.lowSun} checked={form.lowSun} onChange={(lowSun) => change({ lowSun })} />
            )}
            {showsSunOptions(form) && (
              <>
                <Checkbox label={labels.sunBehindSubject} checked={form.sunBehindSubject} onChange={(sunBehindSubject) => change({ sunBehindSubject })} />
                <Checkbox label={labels.sunAhead} checked={form.sunAhead} onChange={(sunAhead) => change({ sunAhead })} />
              </>
            )}
          </div>
        </form>

        <section className="flex flex-col gap-4" aria-live="polite">
          <h2 className="text-xl font-semibold">{text.adviceHeading}</h2>
          <ResultPanel conditions={conditions} result={result} />
        </section>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer">{text.technicalDetails}</summary>
        <pre className="mt-2 overflow-auto rounded bg-neutral-100 p-3">{JSON.stringify({ conditions, result, aiReply }, null, 2)}</pre>
      </details>

      <footer className="text-sm text-neutral-600">{strings.independence}</footer>
    </main>
  );
}
