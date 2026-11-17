import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { articleById } from "../../lib/kb.ts";
import { ArticleScreen, TheoryList } from "./Theory.tsx";

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

const noop = () => undefined;
const list = (query = "") => renderToStaticMarkup(<TheoryList query={query} onQuery={noop} onOpen={noop} onBack={noop} />);
const article = (id: string, from: string | null = null) => renderToStaticMarkup(<ArticleScreen article={articleById(id)!} from={from} onOpen={noop} onBack={noop} />);

describe("Theory's list", () => {
  it("shows the title, the search, and the articles with their teasers, by topic, Lenses last", () => {
    inOrder(readable(list()), [
      "Theory", "Short reads behind the numbers the app gives you.",
      "The basics",
      "A step of light", "Why f/16 to f/11 doubles the light",
      "Aperture", "The opening in the lens",
      "Shutter speed", "How long the film sees light",
      "Film speed", "ISO, and why 400 needs less light",
      "Reading the light",
      "Sunny 16", "The classic rule for daylight, and why the app gives one step more",
      "Same light, different settings",
      "Exposure triangle",
      "The exposure triangle", "How aperture, shutter and film speed share the light",
      "Creatively correct exposure", "Many right settings, and the one for your picture",
      "Film grain", "Why faster film looks grainier",
      "Neutral density filters", "Grey glass for slow shutters and wide apertures in bright light",
      "Depth of field",
      "Sharp zone", "Depth of field: what's sharp in front and behind",
      "Shallow or deep", "A soft background, or everything sharp",
      "Focusing by distance",
      "Movement",
      "Freezing or blurring movement", "Fast for sharp, slow for soft water",
      "Holding the camera still", "Slow shutter speeds and shake",
      "Lenses",
      "How lenses differ", "Focal length, speed and mount",
      "Wide, normal and long", "The common kinds, and how their pictures look",
      "Zoom lenses", "One lens, many focal lengths",
      "Which lens for which picture", "Landscapes, streets, faces and things far off",
      "Before buying a lens", "What to check on a used lens",
    ]);
    expect(list()).toContain('placeholder="Search, such as aperture"');
    expect(list()).toContain('aria-label="Search the articles"');
  });

  it("keeps only the matching articles, and their topics, as you type", () => {
    const text = readable(list("shutter"));
    inOrder(text, ["The basics", "Shutter speed", "Exposure triangle", "The exposure triangle", "Neutral density filters", "Movement", "Holding the camera still"]);
    expect(text).not.toContain("Reading the light");
    expect(text).not.toContain("Depth of field");
    expect(text).not.toContain("Aperture");
  });

  it("says so when nothing matches", () => {
    expect(readable(list("tripod"))).toContain("No article has these words. Try one word, such as light or focus.");
  });
});

describe("an article", () => {
  it("reads top to bottom: topic, title, lead, picture, body, In practice, Read next and sources", () => {
    inOrder(readable(article("sunny-16")), [
      "Theory",
      "Reading the light", "Sunny 16",
      "A rule of thumb for daylight without a light meter",
      "Sun", "f/16", "Haze", "f/11", "Clouds", "f/8", "Overcast", "f/5.6", "Storm", "f/4",
      "The app's aperture for each sky at ISO 400 and 1/250",
      "Each duller sky takes one more", "step of light",
      "In practice",
      "Sun, ISO 400, the classic rule", "f/16 at 1/500",
      "Sun, ISO 400, the app", "f/16 at 1/250",
      "Read next", "Same light, different settings", "Film speed",
      "Sources", "Wikipedia, \"Sunny 16 rule\"", "Kodak, Ultra Max 400 data sheet, E-7023",
    ]);
  });

  it("makes linked words buttons that open their article, and sources links to the web", () => {
    const html = article("sunny-16");
    expect(html).toMatch(/<button type="button" class="inline[^"]*">step of light<\/button>/);
    expect(html).toContain('href="https://en.wikipedia.org/wiki/Sunny_16_rule" target="_blank" rel="noreferrer"');
  });

  it("highlights one tile when the article says so", () => {
    expect(article("sunny-16").match(/bg-hero-ink text-hero/g)).toHaveLength(1);
    expect(article("aperture")).not.toContain("bg-hero-ink text-hero");
  });

  it("says where Back goes: the list, or the article it was opened from", () => {
    expect(article("aperture")).toContain('aria-label="Back to Theory"');
    expect(article("aperture", "step")).toContain('aria-label="Back to A step of light"');
    expect(readable(article("aperture", "step"))).toMatch(/^ ?A step of light/);
  });
});
