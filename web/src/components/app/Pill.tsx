// The pill on Home and the result: the camera in use, its film and how it's held. A summary, not buttons.
// A long camera name shortens with an ellipsis; the other two parts never do.
import { filmLabel } from "../../lib/setup.ts";
import type { SavedCamera } from "../../lib/store.ts";
import type { Support } from "../../lib/engine/types.ts";
import { strings } from "../../lib/strings.ts";

export function Pill({ camera, hold }: { camera: SavedCamera; hold: Support }) {
  const divider = <span aria-hidden="true" className="h-5 w-px flex-none bg-line" />;
  return (
    <p className="m-0 flex min-h-12 min-w-0 flex-auto items-center rounded-full bg-card shadow-[var(--card-shadow)] text-[13px] min-[380px]:text-sm min-[400px]:text-[15px]">
      <span className="min-w-0 flex-auto truncate pr-2 pl-3 text-center font-semibold">{camera.name}</span>
      {divider}
      <span className="flex-none px-2 font-medium whitespace-nowrap text-muted">{filmLabel(camera.film)}</span>
      {divider}
      <span className="flex-none pr-3 pl-2 font-medium whitespace-nowrap text-muted">{strings.app.pill.hold[hold]}</span>
    </p>
  );
}
