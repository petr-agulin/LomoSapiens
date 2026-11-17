// The backup on screen:
// "Your records" in Settings, saving a backup or restoring one, asked first; and the offer to save one when a
// roll is finished.
import { useRef, useState } from "react";
import { backupCounts, type Restorable } from "../../lib/backup.ts";
import { dayText } from "../../lib/rollText.ts";
import { strings } from "../../lib/strings.ts";
import { Icon, PathIcon } from "./icons.tsx";
import { ConfirmSheet, MainButton, SectionLabel, Sheet } from "./parts.tsx";

const text = strings.app.backup;
const ICON = {
  save: "M12 4v11M7 10l5 5 5-5M5 19.5h14",
  restore: "M12 15V4M7 9l5-5 5 5M5 19.5h14",
} as const;

export type RecordsStatus = "saving" | "saved" | "saveFailed" | "notBackup" | "restored" | "restoreFailed" | null;

const MESSAGE: Record<Exclude<RecordsStatus, null>, string> = {
  saving: text.saving,
  saved: text.saved,
  saveFailed: text.saveFailed,
  notBackup: text.notBackup,
  restored: text.restored,
  restoreFailed: text.restoreFailed,
};
const FAILED: RecordsStatus[] = ["saveFailed", "notBackup", "restoreFailed"];

function Row({ icon, title, line, onClick, busy, first }: { icon: string; title: string; line: string; onClick: () => void; busy?: boolean; first?: boolean }) {
  return (
    <button
      type="button"
      onClick={busy ? undefined : onClick}
      aria-disabled={busy || undefined}
      className={`flex min-h-[68px] w-full cursor-pointer items-center gap-3.5 py-2 text-left ${first ? "" : "border-t border-line"}`}
    >
      <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-xl bg-chip">
        <PathIcon d={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[17px] font-medium">{title}</span>
        <span className="text-sm leading-[1.35] text-muted">{line}</span>
      </span>
      <Icon name="chevron" size={18} className="flex-none text-muted" />
    </button>
  );
}

/** "Your records" in Settings: save a backup to the phone's Downloads, or restore one, asked first. */
export function RecordsSection({
  lastBackup,
  onSave,
  onRead,
  onRestore,
  restoreAt = null,
  statusAt = null,
}: {
  /** The day the last backup was saved or restored. */
  lastBackup: string | null;
  onSave: () => Promise<unknown>;
  /** A file the user picked, read as a backup, or null when it isn't one. */
  onRead: (file: File) => Promise<Restorable | null>;
  onRestore: (backup: Restorable) => Promise<unknown>;
  /** For the tests: the restore question, or a message, at once. */
  restoreAt?: Restorable | null;
  statusAt?: RecordsStatus;
}) {
  const [status, setStatus] = useState<RecordsStatus>(statusAt);
  const [asking, setAsking] = useState<Restorable | null>(restoreAt);
  const input = useRef<HTMLInputElement>(null);
  const counts = asking && backupCounts(asking.state);

  const save = async () => {
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
    } catch {
      setStatus("saveFailed");
    }
  };

  return (
    <>
      <SectionLabel>{text.heading}</SectionLabel>
      <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5">
        <Row icon={ICON.save} title={text.save} line={lastBackup ? text.lastSaved(dayText(lastBackup)) : text.saveLine} onClick={save} busy={status === "saving"} first />
        <Row
          icon={ICON.restore}
          title={text.restore}
          line={text.restoreLine}
          onClick={() => {
            setStatus(null);
            input.current?.click();
          }}
        />
      </div>
      {status && (
        <p role={FAILED.includes(status) ? "alert" : "status"} className={`m-0 px-1 text-sm leading-[1.4] ${FAILED.includes(status) ? "text-warn-ink" : "font-medium"}`}>
          {MESSAGE[status]}
        </p>
      )}
      {/* Any file: Android doesn't always know a backup's type, and the app reads the file itself. */}
      <input
        ref={input}
        type="file"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const backup = await onRead(file);
          if (backup) setAsking(backup);
          else setStatus("notBackup");
        }}
      />
      {asking && counts && (
        <ConfirmSheet
          title={text.restoreTitle}
          body={text.restoreBody(dayText(asking.savedAt.slice(0, 10)), counts.cameras, counts.rolls, counts.frames)}
          yes={text.restoreYes}
          no={text.keep}
          closeLabel={strings.app.setup.close}
          onYes={async () => {
            const backup = asking;
            setAsking(null);
            try {
              await onRestore(backup);
              setStatus("restored");
            } catch {
              setStatus("restoreFailed");
            }
          }}
          onClose={() => setAsking(null)}
        />
      )}
    </>
  );
}

/** After a roll is finished: "Save a backup?", then where it went. */
export function BackupOffer({ onSave, onClose, stateAt = "asking" }: { onSave: () => Promise<unknown>; onClose: () => void; stateAt?: "asking" | "saved" | "failed" }) {
  const [state, setState] = useState<"asking" | "saving" | "saved" | "failed">(stateAt);
  const save = async () => {
    setState("saving");
    try {
      await onSave();
      setState("saved");
    } catch {
      setState("failed");
    }
  };
  return (
    <Sheet
      title={state === "saved" ? text.offerSavedTitle : text.offerTitle}
      description={state === "saved" ? text.saved : state === "failed" ? text.saveFailed : text.offerBody}
      closeLabel={strings.app.setup.close}
      onClose={onClose}
    >
      {state === "saved" ? (
        <MainButton onClick={onClose}>{text.done}</MainButton>
      ) : (
        <>
          <MainButton onClick={save} disabled={state === "saving"}>
            {state === "saving" ? text.saving : text.offerYes}
          </MainButton>
          <button type="button" onClick={onClose} className="min-h-[52px] cursor-pointer rounded-[18px] bg-chip text-[17px] font-semibold">
            {text.offerNo}
          </button>
        </>
      )}
    </Sheet>
  );
}
