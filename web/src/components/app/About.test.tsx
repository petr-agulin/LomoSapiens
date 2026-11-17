// About the app, the last place in the menu.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutScreen } from "./About.tsx";

const readable = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const inOrder = (text: string, parts: string[]) => {
  let position = 0;
  for (const part of parts) {
    const found = text.indexOf(part, position);
    expect(found, `"${part}" should come next`).toBeGreaterThanOrEqual(0);
    position = found + part.length;
  }
};

const page = renderToStaticMarkup(<AboutScreen onBack={() => undefined} />);
const text = readable(page);

describe("About the app", () => {
  it("has a back button, Home's figures small and toned by the theme, and its title", () => {
    expect(page).toContain('aria-label="Back"');
    expect(page).toMatch(/<img src="\.\/images\/hero-march\.png" alt="" class="[^"]*h-\[76px\][^"]*\[filter:var\(--hero-filter\)\]/);
    expect(page).toMatch(/<h1[^>]*>About LomoSapiens<\/h1>/);
  });

  it("goes from the problem, to the app, how it works, privacy, the independence note and a wish, as approved", () => {
    inOrder(text, [
      "A manual film camera asks you to choose everything yourself",
      "LomoSapiens helps with exactly that moment.", "It's completely free",
      "The advice comes from published light tables", "LomoSapiens is a web app",
      "Everything you enter stays on your phone", "Save a backup from Settings",
      "LomoSapiens isn't professional software.", "It isn't affiliated with LOMO or Lomography.", "doesn't accept complaints about the results.",
      "Have a joyful time shooting!",
    ]);
    expect(page.match(/<p /g)).toHaveLength(6);
  });

  it("welcomes old lenses, and says the app is for film, not digital cameras", () => {
    inOrder(text, [
      "always within the limits of your own camera and lens, which you describe once.",
      "An old lens is as welcome as a new one: the app only asks for the numbers marked on it.",
      "The tables are made for film, and so is the app: its advice doesn't suit a digital camera.",
      "It's approximate on purpose",
    ]);
    // No camera or lens is named on a screen.
    expect(text).not.toMatch(/\b(Nikon|Nikkor|Canon|Pentax|Zenit|Industar)\b/);
  });

  it("says nothing about losing your phone", () => {
    expect(text).not.toMatch(/losing your phone/i);
    expect(text).toContain("The other side of this: clearing your browser's data deletes your records too.");
  });
});
