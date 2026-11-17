import { useState } from "react";
import { parseDescription } from "../lib/parser.ts";
import type { ParseResult } from "../lib/parser.ts";
import { browserStore, forgetKey, loadSettings, missingSettings, saveKey, saveProvider } from "../lib/settings.ts";
import type { Provider, Settings } from "../lib/settings.ts";
import { testPageStrings } from "../lib/strings.ts";
import type { ParseReport } from "./testPageForm.ts";

const text = testPageStrings.ai;
const FIELD = "rounded border border-neutral-400 bg-white p-2 text-base font-normal";

function assumptionLine({ field, why }: ParseReport["assumptions"][number]) {
  const label = text.assumedField[field];
  if (!label) return why ?? text.assumedGeneric;
  return why ? `${label}: ${why}` : label;
}

export function ParseReportPanel({ report }: { report: ParseReport }) {
  const { assumptions, notice, notSaid } = report;
  const appliedToControls = notice !== "out_of_scope" && notice !== "follow_up";

  return (
    <div className="flex flex-col gap-3 rounded border border-neutral-300 p-3" role="status">
      {notice && <p className="font-semibold">{text.notice[notice]}</p>}
      {appliedToControls && <p>{text.understood}</p>}

      {assumptions.length > 0 && (
        <div>
          <h3 className="font-semibold">{text.assumedHeading}</h3>
          <ul className="list-disc pl-6">
            {assumptions.map((assumption, position) => (
              <li key={position}>{assumptionLine(assumption)}</li>
            ))}
          </ul>
        </div>
      )}

      {notSaid.length > 0 && (
        <div>
          <h3 className="font-semibold">{text.notSaidHeading}</h3>
          <ul className="list-disc pl-6">
            {notSaid.map((name) => (
              <li key={name}>{text.notSaid[name]}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SettingField(props: {
  label: string;
  value: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {props.label}
      <input
        type={props.type ?? "text"}
        className={FIELD}
        value={props.value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export default function DescribeBox(props: {
  report: ParseReport | null;
  /** Null clears the last result, when a new request starts. */
  onParsed: (parse: ParseResult | null, words: string) => void;
}) {
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<{ message: string; details: string | null } | null>(null);
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(browserStore("session"), browserStore("local")),
  );

  function changeKey(apiKey: string) {
    setSettings((current) => ({ ...current, apiKey }));
    saveKey(browserStore("session"), apiKey);
  }

  function changeProvider(changes: Partial<Provider>) {
    const provider = { ...settings.provider, ...changes };
    setSettings({ ...settings, provider });
    saveProvider(browserStore("local"), provider);
  }

  function forget() {
    forgetKey(browserStore("session"));
    setSettings((current) => ({ ...current, apiKey: "" }));
  }

  async function understand() {
    const said = words.trim();
    props.onParsed(null, said);

    const gaps = missingSettings(settings);
    if (gaps.length > 0) {
      setTrouble({ message: text.needs(gaps.map((gap) => text.settingName[gap])), details: null });
      return;
    }

    setTrouble(null);
    setBusy(true);
    const outcome = await parseDescription(said, { ...settings.provider, apiKey: settings.apiKey });
    setBusy(false);

    if (outcome.ok) props.onParsed(outcome.parse, said);
    else setTrouble({ message: text.failure[outcome.failure], details: outcome.details });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{text.heading}</h2>
      <p className="text-sm text-neutral-600">{text.note}</p>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <SettingField
          label={text.baseUrl}
          value={settings.provider.baseUrl}
          onChange={(baseUrl) => changeProvider({ baseUrl })}
        />
        <SettingField label={text.model} value={settings.provider.model} onChange={(model) => changeProvider({ model })} />
        <SettingField label={text.key} type="password" value={settings.apiKey} onChange={changeKey} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-neutral-600">{text.keyNote}</p>
        {settings.apiKey && (
          <button type="button" className="rounded border border-neutral-400 px-3 py-2 text-sm" onClick={forget}>
            {text.forgetKey}
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {text.description}
        <textarea
          rows={3}
          className={FIELD}
          placeholder={text.placeholder}
          value={words}
          onChange={(event) => setWords(event.target.value)}
        />
      </label>

      <div>
        <button
          type="button"
          className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={busy || !words.trim()}
          onClick={understand}
        >
          {busy ? text.asking : text.understand}
        </button>
      </div>

      {trouble && (
        <div className="flex flex-col gap-1 rounded border border-neutral-900 p-3" role="alert">
          <p className="font-semibold">{trouble.message}</p>
          <p>{text.stillWork}</p>
          {trouble.details && <p className="text-sm break-words text-neutral-600">{trouble.details}</p>}
        </div>
      )}

      {props.report && <ParseReportPanel report={props.report} />}
    </section>
  );
}
