// The menu button on every screen but the forms, and which place its menu marks as the one you're on.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CameraAnswers } from "../../lib/cameraAnswers.ts";
import { ARTICLES } from "../../lib/kb.ts";
import { recordDraftOfFrame } from "../../lib/record.ts";
import { newDraft, rollDraft } from "../../lib/setup.ts";
import { newShotDraft } from "../../lib/shot.ts";
import { addCamera, EMPTY_STATE, recordFrame, type AppState, type FrameDraft } from "../../lib/store.ts";
import { AboutScreen } from "./About.tsx";
import { FramePage } from "./Frames.tsx";
import { LightStep } from "./LightStep.tsx";
import { MenuButton } from "./MenuSheet.tsx";
import { RecordShot } from "./RecordShot.tsx";
import { RollDetails, RollPage, RollsHome } from "./Rolls.tsx";
import { CameraPage, CamerasHome, SettingsHome } from "./Settings.tsx";
import { Setup } from "./Setup.tsx";
import { LoadRoll } from "./ShotScreens.tsx";
import { SubjectStep } from "./SubjectStep.tsx";
import { ArticleScreen, TheoryList } from "./Theory.tsx";

const noop = () => undefined;
const compact: CameraAnswers = { widestAperture: "2.8", smallestAperture: "22", focalLengthMm: "40", fastestShutter: "1/250", slowestShutter: "1/15", hasBulb: "yes" };
const frame: FrameDraft = {
  rollId: "r1",
  number: 1,
  set: { aperture: "8", shutter: "1/125", bulbSeconds: null, focusM: 3 },
  advice: { aperture: "8", shutter: "1/125", bulbSeconds: null, focus: { meters: 3, source: "given" } },
  answers: { light: { group: "day", sky: "sun", place: "open" }, lowSun: false, stormOutside: false, subject: "other", distanceM: 3, goal: "sharp", sunBehind: false },
  hold: "hand",
  note: "",
  photo: null,
};
// Mine, with roll r1 and its frame f1.
const one = addCamera(EMPTY_STATE, { name: "Mine", answers: compact, film: { iso: 400, type: "color_negative" } }, "2026-11-03").state;
const state: AppState = recordFrame(one, frame, "2026-11-03T10:00").state;
const camera = state.cameras[0];
const saved = state.frames[0];
const roll = camera.film!;

/** The menu buttons on a screen, and whether the one there is sits in the top row, before the scrolling column. */
const menu = (html: string) => {
  const buttons = html.match(/aria-label="Menu"/g)?.length ?? 0;
  return { buttons, onTop: buttons === 1 && html.indexOf('aria-label="Menu"') < html.indexOf("<main") };
};

describe("the menu button", () => {
  const screens: Record<string, React.JSX.Element> = {
    Rolls: <RollsHome state={state} onBack={noop} onRoll={noop} onLoad={noop} />,
    "a roll's page": <RollPage state={state} rollId={roll.id} via="rolls" onBack={noop} onDetails={noop} onFrame={noop} onAddFrame={noop} />,
    "a recorded frame": (
      <FramePage state={state} frameId={saved.id} onBack={noop} onEdit={noop} onDelete={noop} onNeighbour={noop} onLabels={noop} onDevelopedNote={noop} />
    ),
    Cameras: <CamerasHome state={state} onBack={noop} onCamera={noop} onAdd={noop} />,
    "a camera's page": (
      <CameraPage state={state} camera={camera} onBack={noop} onRename={noop} onAnswer={noop} onRoll={noop} onLoadNew={noop} onDelete={noop} onUse={noop} />
    ),
    Settings: <SettingsHome state={state} onBack={noop} onHold={noop} theme="light" phoneTheme="light" onTheme={noop} records={null} />,
    Theory: <TheoryList query="" onQuery={noop} onOpen={noop} onBack={noop} />,
    "an article": <ArticleScreen article={ARTICLES[0]} from={null} onOpen={noop} onBack={noop} />,
    "About the app": <AboutScreen onBack={noop} />,
    "the light step": <LightStep draft={newShotDraft(null)} onPick={noop} onToggle={noop} onBack={noop} onNext={noop} />,
    "the subject step": <SubjectStep draft={newShotDraft(state.lastShot)} camera={camera} onChange={noop} onBack={noop} onNext={noop} />,
  };

  for (const [name, screen] of Object.entries(screens)) {
    it(`is in the top row of ${name}`, () => {
      expect(menu(renderToStaticMarkup(screen))).toEqual({ buttons: 1, onTop: true });
    });
  }

  it("follows the back button and the crumb, at the right end of the row, where the menu's × opens", () => {
    const html = renderToStaticMarkup(screens["a recorded frame"]);
    const top = html.slice(0, html.indexOf("<main"));
    expect(top.indexOf('aria-label="Back"')).toBeLessThan(top.indexOf("ISO 400 colour"));
    expect(top.indexOf("ISO 400 colour")).toBeLessThan(top.indexOf('aria-label="Menu"'));
    // The crumb takes the room between them, and wraps a long roll name rather than pushing the button off.
    expect(top).toMatch(/class="type-label min-w-0 flex-1 [^"]*\[overflow-wrap:anywhere\]"/);
  });

  // Their way out is Save or Back, so a jump elsewhere never loses what's typed.
  const forms: Record<string, React.JSX.Element> = {
    "first setup": <Setup step="camera" draft={newDraft()} onChange={noop} onBack={noop} onNext={noop} onWithoutFilm={noop} />,
    "adding a camera": <Setup step="film" adding draft={newDraft()} onChange={noop} onBack={noop} onNext={noop} onWithoutFilm={noop} />,
    "loading a roll": <LoadRoll cameraName="Mine" draft={rollDraft("Mine", null)} onChange={noop} onBack={noop} onLoad={noop} />,
    "a roll's details": (
      <RollDetails
        state={state}
        rollId={roll.id}
        draft={rollDraft("Mine", roll)}
        onChange={noop}
        dates={{ loadedOn: roll.loadedOn, finishedOn: null }}
        onDates={noop}
        onBack={noop}
        onDone={noop}
        onFinish={noop}
        onDelete={noop}
      />
    ),
    "recording a frame": (
      <RecordShot camera={camera} advice={frame.advice} taken={[]} draft={recordDraftOfFrame(saved)} onChange={noop} onBack={noop} unsaved={false} onPhoto={noop} onSave={noop} />
    ),
    "changing a frame": (
      <RecordShot
        camera={camera}
        advice={frame.advice}
        taken={[]}
        draft={recordDraftOfFrame(saved)}
        onChange={noop}
        onBack={noop}
        editing={{ number: 1 }}
        unsaved={false}
        onPhoto={noop}
        onSave={noop}
      />
    ),
  };

  for (const [name, form] of Object.entries(forms)) {
    it(`is not on ${name}, a form`, () => {
      expect(menu(renderToStaticMarkup(form)).buttons).toBe(0);
    });
  }
});

describe("the menu's place you're on", () => {
  const rows = (html: string) => ({
    marked: [...html.matchAll(/aria-current="page"[^>]*>[\s\S]*?<span class="text-\[17px\] font-medium">([^<]+)</g)].map((found) => found[1]),
    arrows: html.slice(html.indexOf("<nav")).match(/d="M9 6l6 6-6 6"/g)?.length ?? 0,
  });

  it("is marked on a place's own screen, which its row closes the menu on", () => {
    expect(rows(renderToStaticMarkup(<MenuButton current="rolls" startOpen />))).toEqual({ marked: ["Rolls"], arrows: 5 });
    expect(rows(renderToStaticMarkup(<MenuButton current="theory" startOpen />))).toEqual({ marked: ["Theory"], arrows: 5 });
  });

  it("isn't marked inside a place, such as on a frame, so the place's row opens its own screen", () => {
    expect(rows(renderToStaticMarkup(<MenuButton current={null} startOpen />))).toEqual({ marked: [], arrows: 6 });
  });
});
