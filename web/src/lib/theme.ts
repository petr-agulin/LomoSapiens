// The app's theme: light or dark as the phone is set, by
// default, or one picked in Settings: Light, Dark or Archive paper, the last always light. Kept on this phone only,
// beside the saved data rather than in it, so a backup restored on another phone doesn't change that phone's look.
// `public/theme.js` reads the same key before the page first draws, so the app never opens in another theme for a
// moment; the tests check the two agree.
import type { Store } from "./settings.ts";

/** A theme that can be picked. */
export type Theme = "light" | "dark" | "archive";
/** The phone's own theme, or one picked. */
export type ThemeChoice = "phone" | Theme;

export const THEMES: readonly Theme[] = ["light", "dark", "archive"];

export const THEME_KEY = "lomosapiens.theme";

/** Each theme's page colour, its `--bg` in index.css, which the phone's status bar takes too. */
export const PAGE_COLOR: Record<Theme, string> = { light: "#f2f2ef", dark: "#0c0c0d", archive: "#e8dcc2" };

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

export function readTheme(store: Store | null): ThemeChoice {
  try {
    const saved = store?.getItem(THEME_KEY);
    return isTheme(saved) ? saved : "phone";
  } catch {
    return "phone";
  }
}

/** Keeps the choice. The phone's own theme is the default, so it is kept as nothing. */
export function saveTheme(store: Store | null, choice: ThemeChoice): void {
  try {
    if (choice === "phone") store?.removeItem(THEME_KEY);
    else store?.setItem(THEME_KEY, choice);
  } catch {
    // The choice then lasts until the app is closed.
  }
}

/** What `applyTheme` needs of the page. */
export interface ThemedPage {
  documentElement: { dataset: DOMStringMap };
  querySelector(selector: string): { content: string } | null;
  querySelectorAll(selector: string): ArrayLike<{ media: string; content: string }>;
}

/**
 * Shows the page in the choice: the stylesheet follows `data-theme`, absent for the phone's own; the page's
 * colour scheme, which fills any moment before the stylesheet, follows too, light for Archive paper; and the
 * status bar takes the theme's page colour. Each theme-color tag is for the phone in light or in dark.
 */
export function applyTheme(page: ThemedPage, choice: ThemeChoice): void {
  const { dataset } = page.documentElement;
  if (choice === "phone") delete dataset.theme;
  else dataset.theme = choice;
  const scheme = page.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.content = choice === "phone" ? "light dark" : choice === "dark" ? "dark" : "light";
  for (const meta of Array.from(page.querySelectorAll('meta[name="theme-color"]'))) {
    const phone: Theme = meta.media.includes("dark") ? "dark" : "light";
    meta.content = PAGE_COLOR[choice === "phone" ? phone : choice];
  }
}

/** The theme the phone is set to now, light or dark. */
export function phoneTheme(): "light" | "dark" {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
