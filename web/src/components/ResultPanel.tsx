import type { ReactNode } from "react";
import { isRefusal } from "../lib/engine/index.ts";
import type { Conditions, EngineResult } from "../lib/engine/index.ts";
import { warningLine } from "../lib/result.ts";
import { strings, testPageStrings } from "../lib/strings.ts";

const engineText = strings.engine;
const text = testPageStrings.result;

function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="font-semibold">
        {title}
        {badge && <span className="ml-2 rounded border border-neutral-900 px-1 text-sm font-normal">{badge}</span>}
      </h3>
      {children}
    </section>
  );
}

function Setting({ name, value }: { name: string; value: string }) {
  return (
    <>
      <dt className="text-neutral-600">{name}</dt>
      <dd className="font-semibold">{value}</dd>
    </>
  );
}

export function ResultPanel({ conditions, result }: { conditions: Conditions; result: EngineResult }) {
  if (isRefusal(result)) return <p role="alert">{engineText.refusal[result.refused]}</p>;

  const { estimate, final, steps, warnings } = result;
  const handling = engineText.handling(final);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-600">{text.forCamera(engineText.cameraSummary(conditions.camera))}</p>

      <Section title={text.steps}>
        <ol className="list-decimal pl-6">
          {steps.map((step, position) => (
            <li key={position}>{engineText.stepLine(step)}</li>
          ))}
        </ol>
      </Section>

      <Section title={text.final} badge={estimate ? text.estimate : undefined}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <Setting name={text.aperture} value={`f/${final.aperture}`} />
          <Setting name={text.shutter} value={engineText.shutter(final.shutter, final.bulbSeconds)} />
          <Setting name={text.focus} value={engineText.focusText(final.focus)} />
          <Setting name={text.sharpZone} value={text.sharpZoneValue(final.sharpZone.nearM, final.sharpZone.farM)} />
          <Setting name={text.support} value={engineText.support[final.support]} />
        </dl>
      </Section>

      {handling && (
        <Section title={text.handling}>
          <p>{handling}</p>
        </Section>
      )}

      <Section title={text.warnings}>
        {warnings.length === 0 ? (
          <p>{text.noWarnings}</p>
        ) : (
          <ul className="list-disc pl-6">
            {warnings.map((warning) => (
              <li key={warning.code}>{warningLine(conditions, warning)}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
