// The real app: one screen at a time, moved between with browser history.
import { useEffect, useRef, useState } from "react";
import { isRefusal, recommend } from "../../lib/engine/index.ts";
import { recordDraftFrom, recordDraftOfFrame, toFrameDraft, type RecordDraft } from "../../lib/record.ts";
import { draftRoll, newDraft, rollDraft } from "../../lib/setup.ts";
import { newShotDraft, pickLight, toAnswers, toConditions, toggle, type ShotDraft } from "../../lib/shot.ts";
import {
  addCamera,
  cameraInUse,
  deleteCamera,
  deleteFrame,
  deleteRoll,
  editFrame,
  editRoll,
  findRoll,
  finishRoll,
  isSetUp,
  framesOn,
  loadRoll,
  nextFrameNumber,
  recordFrame,
  renameCamera,
  setAnswer,
  setHold,
  setInUse,
  setLastShot,
  type SavedCamera,
} from "../../lib/store.ts";
import { articleById } from "../../lib/kb.ts";
import { browserStore } from "../../lib/settings.ts";
import { applyTheme, phoneTheme, readTheme, saveTheme, type ThemeChoice } from "../../lib/theme.ts";
import { AboutScreen } from "./About.tsx";
import { Home } from "./Home.tsx";
import { LightStep } from "./LightStep.tsx";
import { MenuContext, menuLines, type MenuItem } from "./MenuSheet.tsx";
import { useScreens } from "./navigation.ts";
import { Result } from "./Result.tsx";
import { BackupOffer, RecordsSection } from "./Backup.tsx";
import { readBackupFile, readLastBackup, restoreBackupPhotos, saveBackupFile } from "./backupFile.ts";
import { FramePage } from "./Frames.tsx";
import { RecordShot } from "./RecordShot.tsx";
import {
  clearInterruptedRecording,
  keepInterruptedRecording,
  readInterruptedRecording,
  usePhotoCleanup,
  type LastRecorded,
} from "./recording.ts";
import { RollDetails, RollPage, RollsHome, type RollDates } from "./Rolls.tsx";
import { CameraPage, CamerasHome, SettingsHome } from "./Settings.tsx";
import { Setup } from "./Setup.tsx";
import { LoadRoll } from "./ShotScreens.tsx";
import { SubjectStep } from "./SubjectStep.tsx";
import { ArticleScreen, TheoryList } from "./Theory.tsx";
import { useAppState } from "./useAppState.ts";

/**
 * The values a frame of a deleted camera is changed with: every aperture and speed the app knows, as that
 * camera's own limits went with it. Its frames keep what was set.
 */
const ANY_CAMERA: SavedCamera = {
  id: "",
  name: "",
  answers: { widestAperture: "1.4", smallestAperture: "32", focalLengthMm: "50", fastestShutter: "1/2000", slowestShutter: "1", hasBulb: "yes" },
  film: null,
};

export default function LomoApp() {
  const [state, update] = useAppState();
  const [draft, setDraft] = useState(newDraft);
  // The roll being loaded, or the roll whose details are being changed, with its dates.
  const [roll, setRoll] = useState(newDraft);
  const [rollDates, setRollDates] = useState<RollDates>({ loadedOn: "", finishedOn: null });
  // A recording the phone interrupted by closing the page while its camera was open.
  const [interrupted] = useState(readInterruptedRecording);
  // Opening the app part-way through a shot, such as after a reload, picks up from the last shot.
  const [shot, setShot] = useState<ShotDraft>(() => interrupted?.shot ?? newShotDraft(state.lastShot));
  // The record form as it is and as it opened, and the frame last recorded from the result on screen.
  const [record, setRecord] = useState<RecordDraft | null>(interrupted?.record ?? null);
  const [recordStart, setRecordStart] = useState<RecordDraft | null>(interrupted?.recordStart ?? null);
  const [lastRecorded, setLastRecorded] = useState<LastRecorded | null>(interrupted?.lastRecorded ?? null);
  // The day of the last backup, and the offer to save one after a roll is finished.
  const [lastBackup, setLastBackup] = useState(readLastBackup);
  const [offerNext, setOfferNext] = useState(false);
  const [offering, setOffering] = useState(false);
  // What is typed in Theory's search, kept while reading an article, so Back returns to the same list.
  const [theoryQuery, setTheoryQuery] = useState("");
  // The theme picked in Settings, Light, Dark or Archive paper, or the phone's own.
  // public/theme.js shows it before the page draws.
  const [theme, setTheme] = useState<ThemeChoice>(() => readTheme(browserStore("local")));
  const pickTheme = (choice: ThemeChoice) => {
    saveTheme(browserStore("local"), choice);
    applyTheme(document, choice);
    setTheme(choice);
  };
  const { screen, go, back, backBy, home, restartAt, swap } = useScreens();
  const camera = cameraInUse(state);
  // Adding a frame from a roll's page: the shot's screens use that roll's camera and film, whichever camera is
  // in use, and record on that roll. Each of those screens carries the roll along.
  const addTo = "addTo" in screen ? (screen.addTo ?? null) : null;
  const shotCamera = addTo === null ? camera : (state.cameras.find((saved) => saved.film?.id === addTo) ?? null);
  const along = addTo === null ? {} : { addTo };

  // Back where the phone interrupted a recording: the result, then the form as it was. After the screens'
  // own start, as React's development check starts everything twice.
  useEffect(() => {
    clearInterruptedRecording();
    if (!interrupted || !camera?.film || !toAnswers(interrupted.shot)) return;
    const timer = window.setTimeout(() => {
      go({ name: "result" });
      go({ name: "record" });
    }, 0);
    return () => window.clearTimeout(timer);
    // Once, as the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the form, by any way, ends it: its photo, if not saved with a frame, is then deleted.
  const previousScreen = useRef(screen.name);
  useEffect(() => {
    const was = previousScreen.current;
    previousScreen.current = screen.name;
    const inForm = (name: string) => name === "record" || name === "frameEdit";
    if (inForm(was) && !inForm(screen.name)) {
      setRecord(null);
      setRecordStart(null);
      clearInterruptedRecording();
    }
  }, [screen.name]);
  usePhotoCleanup(state.frames, record?.photo ?? null);

  // The offer opens on the screen a finished roll returns to, once it's there, as the offer is a sheet with
  // its own place in history.
  useEffect(() => {
    if (!offerNext) return;
    setOfferNext(false);
    setOffering(true);
    // Only when the screen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  const saveBackup = async () => setLastBackup(await saveBackupFile(state));
  const withOffer = (page: React.JSX.Element) =>
    offering ? (
      <>
        {page}
        <BackupOffer onSave={saveBackup} onClose={() => setOffering(false)} />
      </>
    ) : (
      page
    );

  /** A new shot starts from the last one; an empty camera asks for a roll first. Back from the light goes Home. */
  const startShot = () => {
    if (!camera) return;
    setShot(newShotDraft(state.lastShot));
    setLastRecorded(null);
    if (camera.film) return restartAt({ name: "light" });
    setRoll({ ...newDraft(), name: camera.name });
    restartAt({ name: "roll" });
  };

  /** Adding a frame taken but not recorded, from its roll's page: the shot's two steps, then the result. Back returns to the roll. */
  const startAddingFrame = (rollId: string) => {
    setShot(newShotDraft(state.lastShot));
    setLastRecorded(null);
    go({ name: "light", addTo: rollId });
  };

  /** Adding a camera: first setup's two steps, ending back in Settings. */
  const startAdding = () => {
    setDraft(newDraft());
    go({ name: "setup", step: "camera", adding: true });
  };

  /** New roll for a camera. A roll already in it is finished when the new one is loaded (asked first, on the screen before). */
  const startLoading = (target: SavedCamera) => {
    setRoll(rollDraft(target.name, null));
    go({ name: "film", id: target.id });
  };

  const openDetails = (id: string) => {
    const found = findRoll(state, id);
    if (!found) return;
    setRoll(rollDraft(found.cameraName, found.roll));
    setRollDates({ loadedOn: found.roll.loadedOn, finishedOn: found.finishedOn });
    go({ name: "rollDetails", id });
  };

  /**
   * The menu's places, from the menu on any screen. Home goes back to Home past every screen between, and shows
   * it alone. Another place opens over the screen the menu was opened on, so Back returns there, as from any
   * screen. Theory opens on its whole list.
   */
  const openMenuItem = (item: MenuItem) => {
    if (item === "home") return home();
    if (item === "theory") setTheoryQuery("");
    go({ name: item });
  };

  /** The screen on show. */
  const screenFor = (): React.JSX.Element => {
    if (screen.name === "setup") {
      const adding = screen.adding === true;
      return (
        <Setup
          step={screen.step}
          adding={adding}
          draft={draft}
          onChange={setDraft}
          onBack={back}
          onNext={() => {
            if (screen.step === "camera") return go({ name: "setup", step: "film", ...(adding ? { adding } : {}) });
            const film = draftRoll(draft);
            if (!film) return;
            update((current) => addCamera(current, { name: draft.name, answers: draft.answers, film }).state);
            if (adding) return backBy(2);
            setShot(newShotDraft(null));
            restartAt({ name: "light" });
          }}
          onWithoutFilm={() => {
            // A camera with no film yet: a roll is loaded later, from its page or the next shot.
            update((current) => addCamera(current, { name: draft.name, answers: draft.answers, film: null }).state);
            // Adding ends back where it began; the first setup ends on Home, as there's nothing to shoot on yet.
            if (adding) backBy(2);
            else home();
          }}
        />
      );
    }

    const list = <TheoryList query={theoryQuery} onQuery={setTheoryQuery} onOpen={(id) => go({ name: "article", id })} onBack={back} />;
    if (screen.name === "theory") return list;

    if (screen.name === "about") return <AboutScreen onBack={back} />;

    if (screen.name === "article") {
      const article = articleById(screen.id);
      // An article the app no longer has, such as after an update, shows the list instead.
      if (!article) return list;
      return (
        <ArticleScreen
          key={article.id}
          article={article}
          from={screen.from ?? null}
          onOpen={(id) => go({ name: "article", id, from: article.id })}
          onBack={back}
        />
      );
    }

    // A camera's page and its film. A camera that is gone, such as after deleting it, shows Settings instead.
    const shown = screen.name === "camera" || screen.name === "film" ? state.cameras.find((saved) => saved.id === screen.id) : undefined;

    if (shown && screen.name === "camera") {
      return withOffer(
        <CameraPage
          key={shown.id}
          state={state}
          camera={shown}
          onBack={back}
          onRename={(name) => update((current) => renameCamera(current, shown.id, name))}
          onAnswer={(key, value) => update((current) => setAnswer(current, shown.id, key, value))}
          onRoll={() => shown.film && go({ name: "rollPage", id: shown.film.id, via: "camera" })}
          onLoadNew={() => startLoading(shown)}
          onDelete={() => {
            const last = state.cameras.length === 1;
            update((current) => deleteCamera(current, shown.id));
            // The last camera gone, the app starts again from first setup, on Home.
            if (last) home();
            else back();
          }}
          onUse={() => update((current) => setInUse(current, shown.id))}
        />,
      );
    }

    if (shown && screen.name === "film") {
      return (
        <LoadRoll
          cameraName={shown.name}
          draft={roll}
          onChange={setRoll}
          onBack={back}
          onLoad={() => {
            const film = draftRoll(roll);
            if (!film) return;
            update((current) => loadRoll(current, shown.id, film));
            // A roll that was in the camera is finished now: offer a backup.
            if (shown.film) setOfferNext(true);
            back();
          }}
        />
      );
    }

    // A recorded frame, and changing it. A frame that is gone shows Rolls instead.
    const frameShown = screen.name === "frame" || screen.name === "frameEdit" ? state.frames.find((saved) => saved.id === screen.id) : undefined;
    const frameCamera = frameShown && state.cameras.find((saved) => saved.id === findRoll(state, frameShown.rollId)?.cameraId);

    if (frameShown && screen.name === "frame") {
      return (
        <FramePage
          key={frameShown.id}
          state={state}
          frameId={frameShown.id}
          onBack={back}
          onEdit={() => {
            setRecord(recordDraftOfFrame(frameShown));
            go({ name: "frameEdit", id: frameShown.id });
          }}
          onDelete={() => {
            update((current) => deleteFrame(current, frameShown.id));
            back();
          }}
          onNeighbour={(id) => swap({ name: "frame", id })}
          onLabels={(labels) => update((current) => editFrame(current, frameShown.id, { labels }))}
          onDevelopedNote={(note) => update((current) => editFrame(current, frameShown.id, { developedNote: note }))}
        />
      );
    }

    if (frameShown && screen.name === "frameEdit" && record) {
      const original = recordDraftOfFrame(frameShown);
      return (
        <RecordShot
          camera={frameCamera ?? ANY_CAMERA}
          advice={frameShown.advice}
          taken={framesOn(state, frameShown.rollId)
            .filter((saved) => saved.id !== frameShown.id)
            .map((saved) => saved.number)}
          draft={record}
          onChange={setRecord}
          onBack={back}
          editing={{ number: frameShown.number }}
          unsaved={JSON.stringify(record) !== JSON.stringify(original)}
          onPhoto={(key) => setRecord((current) => current && { ...current, photo: key })}
          onSave={() => {
            const changed = toFrameDraft(record, frameShown.rollId, frameShown.advice, frameShown.answers, frameShown.hold);
            if (!changed) return;
            update((current) => editFrame(current, frameShown.id, { number: changed.number, set: changed.set, note: changed.note, photo: changed.photo }));
            back();
          }}
        />
      );
    }

    // Rolls. A roll that is gone, such as after deleting it, shows Rolls instead.
    const rollShown = screen.name === "rollPage" || screen.name === "rollDetails" ? findRoll(state, screen.id) : null;

    if (rollShown && screen.name === "rollPage") {
      return withOffer(
        <RollPage
          key={screen.id}
          state={state}
          rollId={screen.id}
          via={screen.via ?? "rolls"}
          onBack={back}
          onDetails={() => openDetails(screen.id)}
          onFrame={(id) => go({ name: "frame", id })}
          onAddFrame={() => startAddingFrame(screen.id)}
        />,
      );
    }

    if (rollShown && screen.name === "rollDetails") {
      const id = screen.id;
      return (
        <RollDetails
          key={id}
          state={state}
          rollId={id}
          draft={roll}
          onChange={setRoll}
          dates={rollDates}
          onDates={setRollDates}
          onBack={back}
          onDone={() => {
            const film = draftRoll(roll);
            if (!film) return;
            const finishedOn = rollShown.finishedOn !== null && rollDates.finishedOn ? { finishedOn: rollDates.finishedOn } : {};
            update((current) => editRoll(current, id, { ...film, loadedOn: rollDates.loadedOn, ...finishedOn }));
            back();
          }}
          onFinish={() => {
            update((current) => finishRoll(current, rollShown.cameraId));
            setOfferNext(true);
            back();
          }}
          onDelete={() => {
            update((current) => deleteRoll(current, id));
            // The roll's page is gone too: back to where it was opened from.
            backBy(2);
          }}
        />
      );
    }

    if (["rolls", "rollPage", "rollDetails", "frame", "frameEdit"].includes(screen.name)) {
      return withOffer(
        <RollsHome
          state={state}
          onBack={back}
          onRoll={(id) => go({ name: "rollPage", id })}
          onLoad={(cameraId) => {
            const target = state.cameras.find((saved) => saved.id === cameraId);
            if (target) startLoading(target);
          }}
        />,
      );
    }

    if (screen.name === "settings") {
      return (
        <SettingsHome
          state={state}
          onBack={back}
          onHold={(hold) => update((current) => setHold(current, hold))}
          theme={theme}
          phoneTheme={phoneTheme()}
          onTheme={pickTheme}
          records={
            <RecordsSection
              lastBackup={lastBackup}
              onSave={saveBackup}
              onRead={readBackupFile}
              onRestore={async (backup) => {
                // The photos first, under their own keys, then the data that points to them.
                await restoreBackupPhotos(backup);
                update(() => backup.state);
                setLastBackup(backup.savedAt.slice(0, 10));
              }}
            />
          }
        />
      );
    }

    if (screen.name === "cameras" || screen.name === "camera" || screen.name === "film") {
      return <CamerasHome state={state} onBack={back} onCamera={(id) => go({ name: "camera", id })} onAdd={startAdding} />;
    }

    // The shot's screens need the camera in use. Without one, such as after going Forward past a reset, show Home.
    if (camera && screen.name === "roll") {
      return (
        <LoadRoll
          cameraName={camera.name}
          draft={roll}
          onChange={setRoll}
          onBack={back}
          onLoad={() => {
            const film = draftRoll(roll);
            if (!film) return;
            update((current) => loadRoll(current, camera.id, film));
            restartAt({ name: "light" });
          }}
        />
      );
    }

    if (shotCamera && screen.name === "light") {
      return (
        <LightStep
          draft={shot}
          onPick={(light) => setShot(pickLight(shot, light))}
          onToggle={(key) => setShot(toggle(shot, key))}
          onBack={back}
          onNext={() => go({ name: "subject", ...along })}
        />
      );
    }

    if (shotCamera && screen.name === "subject") {
      return (
        <SubjectStep
          draft={shot}
          camera={shotCamera}
          onChange={setShot}
          onBack={back}
          onNext={() => {
            const answers = toAnswers(shot);
            const conditions = answers && toConditions(answers, shotCamera, state.hold);
            if (!answers || !conditions) return;
            const result = recommend(conditions);
            // A new result: nothing is recorded from it yet.
            setLastRecorded(null);
            // Home's last shot is the last one asked for now, not a frame added later.
            if (!isRefusal(result) && addTo === null) {
              const { aperture, shutter, bulbSeconds, focus } = result.final;
              update((current) => setLastShot(current, { answers, result: { aperture, shutter, bulbSeconds, focus } }));
            }
            go({ name: "result", ...along });
          }}
        />
      );
    }

    if (shotCamera && (screen.name === "result" || screen.name === "record")) {
      const answers = toAnswers(shot);
      const conditions = answers && toConditions(answers, shotCamera, state.hold);
      const result = conditions && recommend(conditions);
      const roll = shotCamera.film;
      // The advice as given, kept with every frame recorded from it.
      const advice = result && !isRefusal(result) ? { aperture: result.final.aperture, shutter: result.final.shutter, bulbSeconds: result.final.bulbSeconds, focus: result.final.focus } : null;

      if (screen.name === "record" && answers && advice && roll && record) {
        return (
          <RecordShot
            camera={shotCamera}
            advice={advice}
            taken={framesOn(state, roll.id).map((frame) => frame.number)}
            draft={record}
            onChange={setRecord}
            onBack={back}
            earlier={addTo !== null}
            unsaved={record.note.trim() !== "" || record.photo !== (recordStart?.photo ?? null)}
            onPhoto={(key) => {
              clearInterruptedRecording();
              setRecord((current) => current && { ...current, photo: key });
            }}
            // Kept for a shot recorded on the result, which picks up again on the result. A frame added from its
            // roll is kept no more than a changed frame is: the phone mostly offers its photos then, not the camera.
            onCameraOpen={addTo === null ? () => keepInterruptedRecording({ shot, record, recordStart, lastRecorded }) : undefined}
            onSave={() => {
              const frame = toFrameDraft(record, roll.id, advice, answers, state.hold);
              if (!frame) return;
              const recorded = recordFrame(state, frame);
              if (!recorded.id) return;
              update(() => recorded.state);
              // Added from the roll's page: back there, past the result and the two steps.
              if (addTo !== null) return backBy(4);
              setLastRecorded({ id: recorded.id });
              back();
            }}
          />
        );
      }

      if (answers && conditions && result) {
        // The frame recorded from this result, as it is now, so a number changed with "Change" shows changed.
        const recordedNow = lastRecorded ? state.frames.find((frame) => frame.id === lastRecorded.id) : undefined;
        const formStart = advice && roll ? (photo: string | null = null) => recordDraftFrom(advice, nextFrameNumber(state, roll.id), photo) : null;
        return (
          <Result
            camera={shotCamera}
            hold={state.hold}
            answers={answers}
            conditions={conditions}
            result={result}
            // From a frame being added too: a new shot, with the camera in use, adding nothing.
            onNewShot={startShot}
            onRecord={
              formStart
                ? () => {
                    clearInterruptedRecording();
                    const start = formStart();
                    setRecord(start);
                    setRecordStart(start);
                    go({ name: "record", ...along });
                  }
                : undefined
            }
            // A new shot's frame is recorded with a photo, at once and as advised: "Change" fixes anything set
            // otherwise. A frame added from its roll goes through the form, with an older photo from the phone.
            onPhotoRecord={
              formStart && addTo === null && advice && roll && answers
                ? (photoKey) => {
                    clearInterruptedRecording();
                    const frame = toFrameDraft(formStart(photoKey), roll.id, advice, answers, state.hold);
                    if (!frame) return;
                    const recorded = recordFrame(state, frame);
                    if (!recorded.id) return;
                    update(() => recorded.state);
                    setLastRecorded({ id: recorded.id });
                  }
                : undefined
            }
            // If the phone closes the page while its camera is open, the app opens again on the form, as after the
            // form's own camera.
            onCameraOpen={
              formStart && addTo === null
                ? () => {
                    const start = formStart();
                    keepInterruptedRecording({ shot, record: start, recordStart: start, lastRecorded });
                  }
                : undefined
            }
            recordedFrame={recordedNow?.number ?? null}
            onChangeRecorded={
              recordedNow
                ? () => {
                    setRecord(recordDraftOfFrame(recordedNow));
                    go({ name: "frameEdit", id: recordedNow.id });
                  }
                : undefined
            }
          />
        );
      }
    }

    return (
      <Home
        state={state}
        onStart={() => {
          if (isSetUp(state)) return startShot();
          setDraft(newDraft());
          go({ name: "setup", step: "camera" });
        }}
        onFrame={(id) => go({ name: "frame", id })}
      />
    );
  };

  // Every screen but the forms has the menu: it names the camera in use and its roll, and opens the places.
  return <MenuContext.Provider value={{ ...menuLines(state), onPick: openMenuItem }}>{screenFor()}</MenuContext.Provider>;
}
