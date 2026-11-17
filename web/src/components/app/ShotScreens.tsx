// Loading a new roll: before a new shot with an empty camera, or from a camera's page or Rolls.
import { draftRoll, type SetupDraft } from "../../lib/setup.ts";
import { strings } from "../../lib/strings.ts";
import { Crumb, MainButton, Screen } from "./parts.tsx";
import { FilmStep } from "./Setup.tsx";

const text = strings.app.shot;

/** A new roll: before a shot with an empty camera, or "Load a new roll". */
export function LoadRoll({ cameraName, draft, onChange, onBack, onLoad }: { cameraName: string; draft: SetupDraft; onChange: (draft: SetupDraft) => void; onBack: () => void; onLoad: () => void }) {
  return (
    <Screen
      top={<Crumb backLabel={strings.app.back} onBack={onBack}>{cameraName}</Crumb>}
      action={
        <MainButton onClick={onLoad} disabled={draftRoll(draft) === null}>
          {text.loadRoll}
        </MainButton>
      }
    >
      <FilmStep draft={draft} onChange={onChange} title={text.rollTitle} line={strings.app.rolls.newRollLine(cameraName)} note={false} />
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}
