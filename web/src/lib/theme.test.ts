// The theme picked in Settings: the phone's own, or Light, Dark or Archive paper,
// and the three places that must agree on it: this module, the script that runs before the page first draws, and
// the stylesheet.
import { describe, expect, it } from "vitest";
import html from "../../index.html?raw";
import script from "../../public/theme.js?raw";
import css from "../index.css?raw";
import type { Store } from "./settings.ts";
import { PAGE_COLOR, THEMES, THEME_KEY, applyTheme, readTheme, saveTheme, type ThemedPage } from "./theme.ts";

const memory = (initial: Record<string, string> = {}): Store & { saved: Record<string, string> } => {
  const saved = { ...initial };
  return {
    saved,
    getItem: (key) => saved[key] ?? null,
    setItem: (key, value) => {
      saved[key] = value;
    },
    removeItem: (key) => {
      delete saved[key];
    },
  };
};
const broken: Store = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => undefined,
  removeItem: () => undefined,
};

describe("the theme picked", () => {
  it("is the phone's own until one is picked, and after anything it can't read", () => {
    expect(readTheme(memory())).toBe("phone");
    expect(readTheme(null)).toBe("phone");
    expect(readTheme(memory({ [THEME_KEY]: "purple" }))).toBe("phone");
    expect(readTheme(broken)).toBe("phone");
  });

  it("is Light, Dark or Archive paper, kept on the phone; going back to the phone's own forgets it", () => {
    expect(THEMES).toEqual(["light", "dark", "archive"]);
    const store = memory();
    for (const theme of THEMES) {
      saveTheme(store, theme);
      expect(store.saved).toEqual({ [THEME_KEY]: theme });
      expect(readTheme(store)).toBe(theme);
    }
    saveTheme(store, "phone");
    expect(store.saved).toEqual({});
  });
});

describe("showing it", () => {
  const page = () => {
    const metas = [
      { media: "(prefers-color-scheme: light)", content: PAGE_COLOR.light },
      { media: "(prefers-color-scheme: dark)", content: PAGE_COLOR.dark },
    ];
    const scheme = { content: "light dark" };
    const shown: ThemedPage & { metas: typeof metas; scheme: typeof scheme } = {
      documentElement: { dataset: {} },
      querySelector: (selector) => (selector === 'meta[name="color-scheme"]' ? scheme : null),
      querySelectorAll: () => metas,
      metas,
      scheme,
    };
    return shown;
  };
  const bars = (shown: ReturnType<typeof page>) => shown.metas.map((meta) => meta.content);

  it("marks the page for the stylesheet, sets its colour scheme, and gives the status bar the theme's colour", () => {
    const shown = page();
    applyTheme(shown, "dark");
    expect(shown.documentElement.dataset).toEqual({ theme: "dark" });
    expect(shown.scheme.content).toBe("dark");
    expect(bars(shown)).toEqual([PAGE_COLOR.dark, PAGE_COLOR.dark]);
    applyTheme(shown, "light");
    expect(shown.documentElement.dataset).toEqual({ theme: "light" });
    expect(shown.scheme.content).toBe("light");
    expect(bars(shown)).toEqual([PAGE_COLOR.light, PAGE_COLOR.light]);
  });

  it("shows Archive paper always light, with its paper colour in the status bar", () => {
    const shown = page();
    applyTheme(shown, "archive");
    expect(shown.documentElement.dataset).toEqual({ theme: "archive" });
    expect(shown.scheme.content).toBe("light");
    expect(bars(shown)).toEqual([PAGE_COLOR.archive, PAGE_COLOR.archive]);
  });

  it("follows the phone again with no mark, each status bar colour for its own setting", () => {
    const shown = page();
    applyTheme(shown, "archive");
    applyTheme(shown, "phone");
    expect(shown.documentElement.dataset).toEqual({});
    expect(shown.scheme.content).toBe("light dark");
    expect(bars(shown)).toEqual([PAGE_COLOR.light, PAGE_COLOR.dark]);
  });
});

/** A rule's custom properties in the stylesheet, from its selector up to the closing brace. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
  return Object.fromEntries(
    body
      .split("\n")
      .map((line: string) => /^\s*(--[\w-]+):\s*([^;]+);/.exec(line))
      .filter((found): found is RegExpExecArray => found !== null)
      .map((found) => [found[1], found[2].trim()]),
  );
}

describe("the script before the page draws, the page and the stylesheet agree", () => {
  it("reads the same key, and gives each theme the same colour", () => {
    expect(script).toContain(`"${THEME_KEY}"`);
    for (const theme of THEMES) expect(script).toContain(`${theme}: "${PAGE_COLOR[theme]}"`);
  });

  it("runs in the page's head, after the colour scheme and status bar colours it changes, and before the app", () => {
    const at = (text: string) => html.indexOf(text);
    expect(at('<script src="./theme.js" vite-ignore></script>')).toBeGreaterThan(at('name="theme-color"'));
    expect(at('<script src="./theme.js" vite-ignore></script>')).toBeGreaterThan(at('name="color-scheme" content="light dark"'));
    expect(at("./theme.js")).toBeLessThan(at("</head>"));
    expect(html).toContain(`content="${PAGE_COLOR.light}" media="(prefers-color-scheme: light)"`);
    expect(html).toContain(`content="${PAGE_COLOR.dark}" media="(prefers-color-scheme: dark)"`);
  });

  it("has one set of dark colours, for a dark phone and for Dark picked, and each theme's page colour", () => {
    const picked = tokens(':root[data-theme="dark"]');
    expect(Object.keys(picked).length).toBeGreaterThan(10);
    expect(tokens(":root:not([data-theme])")).toEqual(picked);
    expect(picked["--bg"]).toBe(PAGE_COLOR.dark);
    expect(tokens(":root")["--bg"]).toBe(PAGE_COLOR.light);
    expect(tokens(':root[data-theme="archive"]')["--bg"]).toBe(PAGE_COLOR.archive);
  });

  it("gives Archive paper a value for every colour the dark theme sets, so nothing of another theme shows through", () => {
    const archive = tokens(':root[data-theme="archive"]');
    for (const token of Object.keys(tokens(':root[data-theme="dark"]'))) expect(archive, token).toHaveProperty(token);
  });
});

describe("Archive paper is readable", () => {
  // WCAG 2 contrast: text needs 4.5:1, the sharp zone and the focus scale, which aren't text, 3:1.
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
      .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };
  const PAIRS: [string, string, number][] = [
    ["--ink", "--bg", 4.5], ["--ink", "--card", 4.5], ["--ink", "--chip", 4.5],
    ["--muted", "--bg", 4.5], ["--muted", "--card", 4.5], ["--muted", "--chip", 4.5],
    ["--hero-ink", "--hero", 4.5], ["--bg", "--ink", 4.5],
    ["--info", "--bg", 4.5], ["--info", "--card", 4.5], ["--warn-ink", "--warn-soft", 4.5],
    ["--accent", "--card", 3], ["--scale", "--card", 3],
  ];
  const archive = tokens(':root[data-theme="archive"]');

  it("meets AA for every text pair", () => {
    for (const [text, ground, needs] of PAIRS) {
      expect(contrast(archive[text], archive[ground]), `${text} on ${ground}`).toBeGreaterThanOrEqual(needs);
    }
  });

  it("keeps the design's values, at the contrasts its README gives", () => {
    expect(contrast(archive["--ink"], archive["--bg"])).toBeCloseTo(10.3, 1);
    expect(contrast(archive["--muted"], archive["--chip"])).toBeCloseTo(4.8, 1);
    expect(contrast(archive["--hero-ink"], archive["--hero"])).toBeCloseTo(10.9, 1);
  });
});
