// Home: first launch, then the last recorded frame, or the roll waiting for one.
import { strings } from "../../lib/strings.ts";
import { cameraInUse, isSetUp, lastRecordedFrame, type AppState } from "../../lib/store.ts";
import { LastFrameCard, NoFrameCard } from "./LastShot.tsx";
import { MenuButton } from "./MenuSheet.tsx";
import { MainButton, Screen } from "./parts.tsx";
import { Pill } from "./Pill.tsx";

const text = strings.app;

function SetupStep({ number, title, detail, first }: { number: number; title: string; detail: string; first?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${first ? "" : "border-t border-line"}`}>
      <span
        aria-hidden="true"
        className="grid size-8 flex-none place-items-center rounded-full bg-hero font-display text-base font-semibold text-hero-ink"
      >
        {number}
      </span>
      <span className="flex flex-col">
        <span className="text-[17px] font-medium">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
    </div>
  );
}

export function Home({
  state,
  onStart,
  onFrame = () => undefined,
  menuOpen = false,
}: {
  state: AppState;
  /** "Set up camera and film" on first launch, "Analyse a new shot" afterwards. Theory is in the menu. */
  onStart: () => void;
  /** Opens a frame's page, from the last recorded frame's card. */
  onFrame?: (frameId: string) => void;
  /** For the tests: the menu open at once. */
  menuOpen?: boolean;
}) {
  const firstLaunch = !isSetUp(state);
  const camera = cameraInUse(state);
  const last = lastRecordedFrame(state);
  return (
    <Screen
      top={
        <>
          {camera ? <Pill camera={camera} hold={state.hold} /> : <span className="flex-1" />}
          <MenuButton current="home" startOpen={menuOpen} />
        </>
      }
      action={<MainButton onClick={onStart}>{firstLaunch ? text.home.setUp : text.home.newShot}</MainButton>}
    >
      {/* The figures are drawn in black: the look tones them, inverted on dark, sepia on Archive paper. */}
      <img
        src="./images/hero-march.png"
        alt={text.heroAlt}
        className="mt-3.5 block h-[132px] w-full object-contain [filter:var(--hero-filter)]"
      />
      <div className="flex flex-col items-center gap-[3px] px-0.5 pt-1.5 text-center">
        <h1 className="m-0 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em]">{strings.appName}</h1>
        <span className="type-label text-[13px] leading-[1.35] text-balance text-muted">{text.tagline}</span>
      </div>

      {/* The card sits in the middle of the room between the tagline and the main button, as even space above
          and below. On a short screen both shrink to 8 px and the column scrolls. */}
      <span className="flex-[1_0_8px]" />
      {firstLaunch && (
        <section className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-4 pt-3.5 pb-1.5">
          <h2 className="type-label m-0 text-[13px] font-normal text-muted">{text.home.beforeFirstShot}</h2>
          <SetupStep number={1} title={text.home.stepCamera} detail={text.home.stepCameraText} first />
          <SetupStep number={2} title={text.home.stepFilm} detail={text.home.stepFilmText} />
        </section>
      )}

      {/* The last recorded frame, on the roll last recorded on, in whichever camera; before
          any, the roll in the camera in use; with no film in it, nothing, as the main button asks for a roll. */}
      {!firstLaunch &&
        (last ? (
          <LastFrameCard frame={last.frame} roll={last.roll} camera={last.camera} inUse={last.camera.id === camera?.id} onOpen={() => onFrame(last.frame.id)} />
        ) : (
          camera?.film && <NoFrameCard roll={camera.film} />
        ))}

      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}
