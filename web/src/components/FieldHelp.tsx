// A "?" beside a field's name. A tap or click opens a short explanation under the field, and another closes it.
// It never relies on hover, because phones have none. Any field can use it: give it a name and a HelpText.
import { testPageStrings } from "../lib/strings.ts";
import type { HelpText } from "../lib/strings.ts";

export function HelpButton(props: { field: string; open: boolean; panelId: string; onToggle: () => void }) {
  return (
    // The tap area is 48 px, as for every tap target; the negative margin keeps the row as tall as the name.
    <button
      type="button"
      className="-my-3 flex size-12 items-center justify-center"
      aria-label={testPageStrings.explainField(props.field)}
      aria-expanded={props.open}
      aria-controls={props.panelId}
      onClick={props.onToggle}
    >
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full border border-neutral-500 text-sm font-semibold text-neutral-700"
      >
        ?
      </span>
    </button>
  );
}

export function HelpPanel(props: { id: string; open: boolean; help: HelpText }) {
  return (
    <div
      id={props.id}
      hidden={!props.open}
      className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm font-normal text-neutral-800"
    >
      {props.help.map((part) => (
        <p key={part.text} className="mt-2 first:mt-0">
          {part.lead && <strong>{part.lead}</strong>} {part.text}
        </p>
      ))}
    </div>
  );
}
