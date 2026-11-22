// Cameras and Settings. Cameras: every camera, each with
// its own page and roll, and adding one. Settings: the app's own settings, for now how the camera is held.
// Changes save as they're made. The roll in a camera opens its own page in Rolls.
import { useState, type ReactNode } from "react";
import type { QuestionKey } from "../../lib/setup.ts";
import { cameraSpec, filmLine } from "../../lib/setup.ts";
import type { Support } from "../../lib/engine/types.ts";
import { cameraRollLine, dayText, recordedText, rollTitle } from "../../lib/rollText.ts";
import { nextInUse, recordedCount, type AppState, type SavedCamera } from "../../lib/store.ts";
import { strings } from "../../lib/strings.ts";
import type { Theme, ThemeChoice } from "../../lib/theme.ts";
import { CARD_ICON, Icon, PathIcon } from "./icons.tsx";
import { AddCard, ConfirmSheet, Crumb, MainButton, OptionRow, Screen, ScreenTitle, SectionLabel, Sheet, SwitchRow, Unbroken } from "./parts.tsx";
import { FinishFirstSheet } from "./Rolls.tsx";
import { CameraQuestions, ColourDot, NameField } from "./Setup.tsx";
import { GROUP_ICON, HOLD_ICON } from "./shotIcons.ts";

const text = strings.app.settings;
const camerasText = strings.app.cameras;
const cameraText = strings.app.camera;
const rollsText = strings.app.rolls;
const close = strings.app.setup.close;

const HOLDS: Support[] = ["hand", "braced", "surface"];

const iconSquare = "grid size-12 flex-none place-items-center rounded-[14px]";

/** One camera in the list. The camera in use is inverted, like every selection. */
function CameraCard({ camera, inUse, recorded, onOpen }: { camera: SavedCamera; inUse: boolean; recorded: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[84px] w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] py-3 pr-3.5 pl-4 text-left ${inUse ? "bg-hero text-hero-ink" : "bg-card text-ink"}`}
    >
      <span aria-hidden="true" className={`${iconSquare} ${inUse ? "bg-[var(--on-hero-icon-bg)]" : "bg-chip"}`}>
        <PathIcon d={CARD_ICON.camera} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        {inUse && <span className="text-[13px] opacity-65">{camerasText.inUse}</span>}
        <span className="font-display text-[19px] leading-[1.2] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{camera.name}</span>
        <span className={`text-sm leading-[1.35] ${inUse ? "opacity-75" : "text-muted"}`}>
          <Unbroken parts={cameraSpec(camera.answers).split(" · ")} />
        </span>
        <span className={`text-sm leading-[1.35] ${inUse ? "opacity-75" : "text-muted"}`}>{cameraRollLine(camera.film, recorded)}</span>
      </span>
      <Icon name="chevron" size={18} className="flex-none opacity-60" />
    </button>
  );
}

function HoldSheet({ hold, onPick, onClose }: { hold: Support; onPick: (hold: Support) => void; onClose: () => void }) {
  return (
    <Sheet title={text.holdTitle} description={text.holdLine} closeLabel={close} onClose={onClose}>
      <div role="radiogroup" aria-labelledby="sheet-title" className="flex flex-col gap-1">
        {HOLDS.map((way) => (
          <OptionRow key={way} icon={HOLD_ICON[way]} label={strings.app.pill.hold[way]} sub={text.holdWays[way]} on={way === hold} onPick={() => onPick(way)} />
        ))}
      </div>
    </Sheet>
  );
}

/** Every camera, the one in use inverted, then adding one. */
export function CamerasHome({ state, onBack, onCamera, onAdd }: { state: AppState; onBack: () => void; onCamera: (id: string) => void; onAdd: () => void }) {
  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack} menu="cameras">{strings.app.back}</Crumb>}>
      <ScreenTitle title={camerasText.title} line={camerasText.line} />
      {state.cameras.map((camera) => (
        <CameraCard
          key={camera.id}
          camera={camera}
          inUse={camera.id === state.inUse}
          recorded={camera.film ? recordedCount(state, camera.film.id) : 0}
          onOpen={() => onCamera(camera.id)}
        />
      ))}
      <AddCard title={camerasText.addCamera} line={camerasText.addCameraLine} onClick={onAdd} />
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}

/** Archive paper's icon: a sheet of paper with a folded corner and two lines, in the strokes of the app's icons. */
const PAPER_ICON = "M6.5 3.5h7.5l4 4v13h-11.5zM14 3.5v4h4M9.5 12.5h5M9.5 16h5";

/** The themes offered, by name and icon only: they explain themselves. */
const THEME_OPTIONS: { theme: Theme; icon: string; label: string }[] = [
  { theme: "light", icon: GROUP_ICON.day, label: text.light },
  { theme: "dark", icon: GROUP_ICON.evening, label: text.dark },
  { theme: "archive", icon: PAPER_ICON, label: text.archive },
];

/**
 * The theme: the phone's own by default. Turned off, the switch offers Light,
 * Dark and Archive paper, starting on the one the phone shows, so nothing changes until another is picked.
 */
function ThemeSetting({ theme, shown, onTheme }: { theme: ThemeChoice; shown: "light" | "dark"; onTheme: (theme: ThemeChoice) => void }) {
  return (
    <>
      <SectionLabel>{text.theme}</SectionLabel>
      <SwitchRow label={text.phoneTheme} sub={text.phoneThemeLine} on={theme === "phone"} onFlip={() => onTheme(theme === "phone" ? shown : "phone")} />
      {theme !== "phone" && (
        <div role="radiogroup" aria-label={text.theme} className="flex flex-col gap-1 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card p-1.5">
          {THEME_OPTIONS.map((option) => (
            <OptionRow key={option.theme} icon={option.icon} label={option.label} on={theme === option.theme} onPick={() => onTheme(option.theme)} />
          ))}
        </div>
      )}
    </>
  );
}

/** The app's own settings: how the camera is held, your records and the theme. */
export function SettingsHome({
  state,
  onBack,
  onHold,
  records = null,
  theme = "phone",
  phoneTheme = "light",
  onTheme = () => undefined,
  holdOpen = false,
}: {
  state: AppState;
  onBack: () => void;
  onHold: (hold: Support) => void;
  /** "Your records": saving and restoring a backup. */
  records?: ReactNode;
  /** The theme picked, or the phone's own. */
  theme?: ThemeChoice;
  /** The theme the phone is set to now, which turning the switch off keeps. */
  phoneTheme?: "light" | "dark";
  onTheme?: (theme: ThemeChoice) => void;
  /** For the tests: the hold sheet open at once. */
  holdOpen?: boolean;
}) {
  const [holding, setHolding] = useState(holdOpen);
  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack} menu="settings">{strings.app.back}</Crumb>}>
      <ScreenTitle title={text.title} line={text.line} />

      <SectionLabel>{text.shooting}</SectionLabel>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setHolding(true)}
        className="flex min-h-[72px] w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2.5 pr-3.5 pl-4 text-left"
      >
        <span aria-hidden="true" className={`${iconSquare} bg-chip`}>
          <PathIcon d={HOLD_ICON[state.hold]} size={26} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-muted">{text.howYouHold}</span>
          <span className="text-[17px] font-semibold">{strings.app.pill.hold[state.hold]}</span>
        </span>
        <Icon name="chevron" size={18} className="flex-none text-muted" />
      </button>

      {records}

      <ThemeSetting theme={theme} shown={phoneTheme} onTheme={onTheme} />

      {/* The independence note moved to About the app. */}
      <span className="flex-[1_0_8px]" />

      {holding && (
        <HoldSheet
          hold={state.hold}
          onPick={(hold) => {
            onHold(hold);
            setHolding(false);
          }}
          onClose={() => setHolding(false)}
        />
      )}
    </Screen>
  );
}

export function CameraPage({
  state,
  camera,
  onBack,
  onRename,
  onAnswer,
  onRoll,
  onLoadNew,
  onDelete,
  onUse,
  openAt,
}: {
  state: AppState;
  camera: SavedCamera;
  onBack: () => void;
  onRename: (name: string) => void;
  onAnswer: (key: QuestionKey, value: string) => void;
  /** Opens the roll's own page, in Rolls. */
  onRoll: () => void;
  /** Opens New roll. A roll already in the camera is finished when the new one is loaded, asked first. */
  onLoadNew: () => void;
  onDelete: () => void;
  onUse: () => void;
  /** For the tests: a question open at once. */
  openAt?: "delete" | "finish";
}) {
  // The field keeps what is typed, even when it's emptied; the saved name is never empty.
  const [name, setName] = useState(camera.name);
  const [deleting, setDeleting] = useState(openAt === "delete");
  const [finishing, setFinishing] = useState(openAt === "finish");
  const roll = camera.film;
  const recorded = roll ? recordedCount(state, roll.id) : 0;
  const inUse = camera.id === state.inUse;
  const next = nextInUse(state, camera.id);
  const deleteBody = [cameraText.deleteBody, state.cameras.length === 1 ? cameraText.deleteLast : next ? cameraText.deleteNext(next.name) : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Screen
      top={<Crumb backLabel={cameraText.backToCameras} onBack={onBack} menu>{cameraText.crumb}</Crumb>}
      action={inUse ? undefined : <MainButton onClick={onUse}>{cameraText.use}</MainButton>}
    >
      <ScreenTitle title={camera.name} line={inUse ? cameraText.inUse : cameraText.notInUse} />
      <NameField
        value={name}
        onChange={(typed) => {
          setName(typed);
          onRename(typed);
        }}
      />
      <CameraQuestions answers={camera.answers} onAnswer={onAnswer} hints={false} />

      <SectionLabel>{cameraText.filmHeading}</SectionLabel>
      {roll ? (
        <>
          <button type="button" onClick={onRoll} className="flex min-h-[76px] w-full cursor-pointer items-center gap-3.5 rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card py-2.5 pr-3.5 pl-4 text-left">
            <span aria-hidden="true" className={`${iconSquare} bg-chip`}>
              <PathIcon d={CARD_ICON.film} size={26} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 text-[17px] font-semibold">
                <ColourDot type={roll.type} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{rollTitle(roll)}</span>
              </span>
              <span className="text-sm text-muted">
                <Unbroken parts={[...(roll.name ? [filmLine(roll)] : []), recordedText(recorded, roll.frames), rollsText.loaded(dayText(roll.loadedOn, false))]} />
              </span>
            </span>
            <Icon name="chevron" size={18} className="flex-none text-muted" />
          </button>
          <button type="button" aria-haspopup="dialog" onClick={() => setFinishing(true)} className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[18px] px-4 text-left font-medium">
            <Icon name="plus" size={20} />
            {cameraText.loadNewRoll}
          </button>
        </>
      ) : (
        <div className="flex min-h-[76px] items-center gap-3.5 rounded-[var(--card-radius)] border-[1.5px] border-dashed border-line py-2.5 pr-2.5 pl-4">
          <span className="flex flex-1 flex-col">
            <span className="text-[17px] font-semibold">{camerasText.noFilm}</span>
            <span className="text-sm text-muted">{cameraText.noFilmLine}</span>
          </span>
          <button type="button" onClick={onLoadNew} className="min-h-11 flex-none cursor-pointer rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-bg">
            {cameraText.loadRoll}
          </button>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setDeleting(true)}
        className="mt-1.5 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[18px] px-4 py-2 text-left font-medium"
      >
        <PathIcon d={CARD_ICON.bin} size={20} />
        {cameraText.delete}
      </button>
      <p className="m-0 px-1 text-[13px] leading-[1.4] text-muted">{cameraText.note}</p>
      <span className="flex-[1_0_8px]" />

      {finishing && roll && (
        <FinishFirstSheet
          camera={camera}
          roll={roll}
          count={recorded}
          onYes={() => {
            setFinishing(false);
            onLoadNew();
          }}
          onClose={() => setFinishing(false)}
        />
      )}
      {deleting && (
        <ConfirmSheet
          title={cameraText.deleteTitle(camera.name)}
          body={deleteBody}
          yes={cameraText.deleteYes}
          no={cameraText.keep}
          closeLabel={close}
          onYes={() => {
            setDeleting(false);
            onDelete();
          }}
          onClose={() => setDeleting(false)}
        />
      )}
    </Screen>
  );
}
