// Which screen is showing. Each move is a browser history entry, so the phone's Back button,
// and the app's own back button, return exactly one screen, scrolled where it was left.
// An open sheet has a history entry of its own too, so the phone's Back closes the sheet rather
// than leaving the screen behind it. No router package: the app has one page.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type AppScreen =
  | { name: "home" }
  /** First setup, or adding a camera from the Cameras screen. */
  | { name: "setup"; step: "camera" | "film"; adding?: boolean }
  | { name: "roll" }
  /** The shot's screens. `addTo` is a roll a frame is being added to, from its page, with that roll's camera. */
  | { name: "light"; addTo?: string }
  | { name: "subject"; addTo?: string }
  | { name: "result"; addTo?: string }
  | { name: "cameras" }
  /** One camera's page, and loading a new roll into it. */
  | { name: "camera"; id: string }
  | { name: "film"; id: string }
  /** Rolls: every roll, one roll's page, and its details. `via` "camera" when opened from its camera's page. */
  | { name: "rolls" }
  | { name: "rollPage"; id: string; via?: "camera" }
  | { name: "rollDetails"; id: string }
  /** Recording the shot on the result. */
  | { name: "record"; addTo?: string }
  /** One recorded frame's page, and changing it. */
  | { name: "frame"; id: string }
  | { name: "frameEdit"; id: string }
  | { name: "settings" }
  | { name: "theory" }
  /** About the app, from the menu. */
  | { name: "about" }
  /** One article. `from` is the article it was opened from, if any, which Back returns to. */
  | { name: "article"; id: string; from?: string };

export const HOME: AppScreen = { name: "home" };

const SIMPLE = ["home", "roll", "cameras", "rolls", "settings", "theory", "about"];
const SHOT = ["light", "subject", "result", "record"];

/** History can hold anything, such as a state from an older version of the app, so it's checked. */
export function isAppScreen(value: unknown): value is AppScreen {
  if (typeof value !== "object" || value === null) return false;
  const screen = value as Record<string, unknown>;
  if (typeof screen.name === "string" && SIMPLE.includes(screen.name)) return true;
  if (typeof screen.name === "string" && SHOT.includes(screen.name)) return screen.addTo === undefined || typeof screen.addTo === "string";
  if (screen.name === "setup") return (screen.step === "camera" || screen.step === "film") && (screen.adding === undefined || typeof screen.adding === "boolean");
  if (["camera", "film", "rollDetails", "frame", "frameEdit"].includes(screen.name as string)) return typeof screen.id === "string";
  if (screen.name === "rollPage") return typeof screen.id === "string" && (screen.via === undefined || screen.via === "camera");
  return screen.name === "article" && typeof screen.id === "string" && (screen.from === undefined || typeof screen.from === "string");
}

interface Entry {
  screen: AppScreen;
  /** How many history entries above Home this one is, sheets included. */
  depth: number;
  /** Set on an open sheet's own entry. */
  sheet?: true;
  /**
   * Which visit to a screen this is, new for every screen opened and kept by its sheets' entries: where the
   * screen was scrolled is kept under it. Missing on entries an older version of the app made.
   */
  key?: number;
}

/** An open sheet's history entry. `onTop` is false once Back, or a move to another screen, has used it. */
interface SheetEntry {
  close: () => void;
  onTop: boolean;
}

/**
 * Where history stands. The app has one screen stack, so this lives here, shared by the screens and
 * the sheets, rather than in each component.
 */
const nav = {
  screen: HOME as AppScreen,
  depth: 0,
  sheet: null as SheetEntry | null,
  /** A sheet just closed on screen, whose entry is about to go, unless another sheet takes it over. */
  releasing: null as { timer: number; entry: SheetEntry } | null,
  /** A screen to open once history is back at Home: see restartAt. */
  after: null as AppScreen | null,
  /** A screen whose Back asks first, at this depth: see useLeaveGuard. */
  guard: null as { depth: number; ask: () => void } | null,
  /** Set while history steps forward again onto a guarded screen, to ask once it's there. */
  bouncing: false,
  /** The key of the screen on show, and the next one to give: see Entry. */
  key: 0,
  nextKey: 1,
  /** How far each visit's screen was scrolled, by its key: see useScrollMemory. */
  scrolls: new Map<number, number>(),
  /** The screen Back has just left, for the screen it returned to: see useReturnedFrom. */
  left: null as AppScreen | null,
};

/** A key for a screen being opened, never given before in this run of the app. */
function newKey(): number {
  const key = nav.nextKey;
  nav.nextKey += 1;
  return key;
}

/** Uses up the sheet entry on top of history, if there is one, so a move can replace it. */
function takeSheetEntry(): boolean {
  const pending = nav.releasing;
  if (pending) {
    clearTimeout(pending.timer);
    nav.releasing = null;
  }
  const entry = nav.sheet ?? pending?.entry;
  if (!entry?.onTop) return false;
  entry.onTop = false;
  return true;
}

/**
 * For a sheet: while it is open, the phone's Back closes it. Closed on screen instead, by a tap outside
 * or a choice, its entry is taken away again. A sheet that opens as another closes, such as the distance
 * after "Something else", takes over the entry, and so does the same sheet when React's development
 * check mounts it twice.
 */
export function useBackCloses(onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    let entry: SheetEntry;
    const pending = nav.releasing;
    if (pending) {
      clearTimeout(pending.timer);
      nav.releasing = null;
      entry = pending.entry;
      entry.close = () => close.current();
    } else {
      entry = { close: () => close.current(), onTop: true };
      nav.depth += 1;
      window.history.pushState({ screen: nav.screen, depth: nav.depth, sheet: true, key: nav.key } satisfies Entry, "");
    }
    nav.sheet = entry;
    return () => {
      if (nav.sheet === entry) nav.sheet = null;
      if (!entry.onTop) return;
      const timer = window.setTimeout(() => {
        nav.releasing = null;
        if (!entry.onTop) return;
        entry.onTop = false;
        window.history.back();
      }, 0);
      nav.releasing = { timer, entry };
    };
  }, []);
}

/**
 * For a screen holding something unsaved, such as the record form with a note: while `active`, Back asks first
 * instead of leaving. A browser can't refuse the phone's Back, so the app
 * steps forward again and then asks. The screen's own back button asks directly. Returns `release`, called
 * just before leaving on purpose, such as after Save or Discard.
 */
export function useLeaveGuard(active: boolean, ask: () => void) {
  const latest = useRef(ask);
  latest.current = ask;
  const depth = useRef<number | null>(null);
  useEffect(() => {
    // The screen's own depth, as it opened.
    depth.current = nav.depth;
  }, []);
  useEffect(() => {
    if (!active || depth.current === null) return;
    const guard = { depth: depth.current, ask: () => latest.current() };
    nav.guard = guard;
    return () => {
      if (nav.guard === guard) nav.guard = null;
    };
  }, [active]);
  return useCallback(() => {
    nav.guard = null;
  }, []);
}

/**
 * For a screen's scrolling column: the screen opens scrolled where it was left when Back returns to it, as a
 * browser does between pages. A screen opened anew, or shown in another's place, opens at the top, also when
 * it's drawn in the same column as the screen before it, as the two steps of first setup are.
 */
export function useScrollMemory<T extends HTMLElement>() {
  const column = useRef<T>(null);
  const key = nav.key;
  // Before the screen is first painted, so it never shows at the top first.
  useLayoutEffect(() => {
    const element = column.current;
    if (!element) return;
    element.scrollTop = nav.scrolls.get(key) ?? 0;
    const keep = () => nav.scrolls.set(key, element.scrollTop);
    element.addEventListener("scroll", keep, { passive: true });
    return () => element.removeEventListener("scroll", keep);
  }, [key]);
  return column;
}

/** For a screen as it opens: the screen Back has just left to return to it, or null when it was opened anew. */
export function useReturnedFrom(): AppScreen | null {
  const [from] = useState(() => nav.left);
  return from;
}

/**
 * Marks, on the page itself, that the app has started in it. A live code update while developing runs the start
 * again, even this module, but the page stays the same; a reload is a new page, and starts on Home again.
 */
const STARTED = "__lomosapiensStarted";

export function useScreens() {
  const [screen, setScreen] = useState<AppScreen>(HOME);

  /** Shows a screen; `left` is the screen Back has just left, or null for a screen opened anew. */
  const show = useCallback((next: AppScreen, key: number, left: AppScreen | null = null) => {
    nav.screen = next;
    nav.key = key;
    nav.left = left;
    setScreen(next);
  }, []);

  /**
   * Opens a screen. From an open sheet, such as the menu, the screen takes the sheet's place in history, so Back
   * from a place picked in the menu returns to the screen the menu was opened on, with the menu closed.
   */
  const go = useCallback(
    (next: AppScreen) => {
      const key = newKey();
      if (takeSheetEntry()) {
        window.history.replaceState({ screen: next, depth: nav.depth, key } satisfies Entry, "");
      } else {
        nav.depth += 1;
        window.history.pushState({ screen: next, depth: nav.depth, key } satisfies Entry, "");
      }
      show(next, key);
    },
    [show],
  );

  useEffect(() => {
    const page = window as unknown as Record<string, unknown>;
    const current = window.history.state as Partial<Entry> | null;
    if (page[STARTED] && isAppScreen(current?.screen) && typeof current?.depth === "number") {
      // Started already in this page: React's development check starting things twice, or, while developing,
      // a live code update. History is kept as it is, so Back still returns where it should.
      const key = typeof current.key === "number" ? current.key : newKey();
      nav.nextKey = Math.max(nav.nextKey, key + 1);
      nav.screen = current.screen;
      nav.depth = current.depth;
      show(current.screen, key);
    } else {
      // The app always opens on Home, a reload too. Going back from Home leaves the app, as on any page.
      page[STARTED] = true;
      nav.screen = HOME;
      nav.depth = 0;
      nav.sheet = null;
      nav.after = null;
      nav.guard = null;
      nav.bouncing = false;
      nav.key = 0;
      nav.scrolls.clear();
      nav.left = null;
      window.history.replaceState({ screen: HOME, depth: 0, key: 0 } satisfies Entry, "");
    }
    const onPop = (event: PopStateEvent) => {
      const saved = event.state as Partial<Entry> | null;
      const depth = typeof saved?.depth === "number" ? saved.depth : 0;
      if (nav.bouncing) {
        // Forward again onto a screen whose Back asks first: ask, now that it's back on top.
        nav.bouncing = false;
        nav.depth = depth;
        nav.guard?.ask();
        return;
      }
      if (nav.guard && !nav.sheet && depth < nav.guard.depth) {
        // Back from a screen holding something unsaved: step forward again, then ask.
        nav.bouncing = true;
        window.history.forward();
        return;
      }
      nav.depth = depth;
      const open = nav.sheet;
      if (saved?.sheet && !open) {
        // Forward onto the entry of a sheet closed long ago: step back over it.
        window.history.back();
        return;
      }
      if (open && !saved?.sheet) {
        // Back with a sheet open: close the sheet and stay on the screen.
        open.onTop = false;
        nav.sheet = null;
        open.close();
      }
      const next = nav.after;
      if (nav.depth === 0 && next) {
        nav.after = null;
        go(next);
        return;
      }
      show(isAppScreen(saved?.screen) ? saved.screen : HOME, typeof saved?.key === "number" ? saved.key : newKey(), nav.screen);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go, show]);

  /**
   * Shows another screen in this one's place in history, such as the next frame on a roll: Back then
   * returns past all of them in one press.
   */
  const swap = useCallback(
    (next: AppScreen) => {
      takeSheetEntry();
      const key = newKey();
      window.history.replaceState({ screen: next, depth: nav.depth, key } satisfies Entry, "");
      show(next, key);
    },
    [show],
  );

  /** Back one screen. From an open sheet, its own entry goes too. */
  const back = useCallback(() => window.history.go(takeSheetEntry() ? -2 : -1), []);

  /** Back several screens at once, such as from the end of adding a camera to the Cameras screen. */
  const backBy = useCallback((steps: number) => {
    const extra = takeSheetEntry() ? 1 : 0;
    window.history.go(-Math.min(steps + extra, nav.depth));
  }, []);

  /** Back to Home, past every screen between, as the menu's Home row does from any screen: Home shows alone. */
  const home = useCallback(() => {
    takeSheetEntry();
    if (nav.depth > 0) window.history.go(-nav.depth);
  }, []);

  /**
   * Goes back to Home, dropping every screen in between from history, then opens `next`.
   * Used when a flow is finished, such as setup's Done or a new shot from the result:
   * Back from the light step then goes Home, as the design says.
   */
  const restartAt = useCallback(
    (next: AppScreen) => {
      takeSheetEntry();
      if (nav.depth === 0) return go(next);
      nav.after = next;
      window.history.go(-nav.depth);
    },
    [go],
  );

  return { screen, go, back, backBy, home, restartAt, swap };
}
