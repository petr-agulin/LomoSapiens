// The knowledge base (kb/theory.md), read into articles for the Theory screens, and later for the AI's
// answers. The file ships inside the app, so Theory works offline.
// Its format is described in the file itself, under "How this file is read".
import theory from "../../../kb/theory.md?raw";

/** A run of text, or a link: to another article (#id) or, in sources, to a web page. */
export interface Segment {
  text: string;
  link?: string;
}

/** One tile of an article's picture: a small top line, the big value, a small bottom line. */
export interface Tile {
  top: string;
  big: string;
  bottom: string;
  on: boolean;
}

export interface Article {
  id: string;
  title: string;
  topic: string;
  teaser: string;
  picture: Tile[];
  caption: string;
  readNext: string[];
  lead: Segment[];
  body: Segment[][];
  practice: { what: string; value: string }[];
  sources: Segment[][];
}

/**
 * The topics, in the order of the list. Lenses joined later,
 * then Exposure triangle and Depth of field, with Movement in place of Sharpness.
 */
export const TOPICS = ["The basics", "Reading the light", "Exposure triangle", "Depth of field", "Movement", "Lenses"] as const;

/** Comments hold notes for developers and the AI, such as which spec section a rule comes from. */
const withoutComments = (text: string) => text.replace(/\s*<!--[\s\S]*?-->/g, "");

/** Text with Markdown links, as runs of text and links. */
export function segments(text: string): Segment[] {
  const parts: Segment[] = [];
  let at = 0;
  for (const found of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    if (found.index > at) parts.push({ text: text.slice(at, found.index) });
    parts.push({ text: found[1], link: found[2] });
    at = found.index + found[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}

function readTiles(line: string): Tile[] {
  return [...line.matchAll(/(\*?)\[([^\]]*)\]/g)].map(([, star, inside]) => {
    const [top = "", big = "", bottom = ""] = inside.split("|").map((part) => part.trim());
    return { top, big, bottom, on: star === "*" };
  });
}

function readArticle(section: string): Article {
  const [heading, ...rest] = section.split("\n");
  const head = /^(.+?)\s*\{#([a-z0-9-]+)\}\s*$/.exec(heading);
  if (!head) throw new Error(`An article needs a title and an ID: "${heading}"`);
  const [, title, id] = head;

  const blocks = rest.join("\n").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const meta = new Map(
    (blocks.shift() ?? "").split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as const;
    }),
  );
  const need = (key: string) => {
    const value = meta.get(key);
    if (!value) throw new Error(`Article "${id}" has no ${key}`);
    return value;
  };

  const practiceAt = blocks.findIndex((block) => block.startsWith("### In practice"));
  if (practiceAt < 1) throw new Error(`Article "${id}" needs a lead, then "### In practice"`);
  const paragraphs = blocks.slice(0, practiceAt).map((block) => segments(block.replace(/\s*\n\s*/g, " ")));
  const after = blocks.slice(practiceAt + 1);

  const table = after.find((block) => block.startsWith("|")) ?? "";
  const practice = table
    .split("\n")
    .slice(2) // the header and the line under it
    .map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()))
    .map(([what, value]) => ({ what, value }));

  const sourceBlock = after.find((block) => block.startsWith("Sources:")) ?? "";
  const sources = sourceBlock
    .split("\n")
    .slice(1)
    .map((line) => segments(line.replace(/^-\s*/, "")));

  return {
    id,
    title,
    topic: need("Topic"),
    teaser: need("Teaser"),
    picture: readTiles(need("Picture")),
    caption: need("Caption"),
    readNext: need("Read next").split(",").map((next) => next.trim()),
    lead: paragraphs[0],
    body: paragraphs.slice(1),
    practice,
    sources,
  };
}

/** Every article in the file, in its order. The section on the file's own format is not an article. */
export function parseKb(markdown: string): Article[] {
  return withoutComments(markdown.replace(/\r\n/g, "\n"))
    .split(/^## /m)
    .slice(1)
    .filter((section) => !section.includes("{#format}"))
    .map(readArticle);
}

export const ARTICLES: Article[] = parseKb(theory);

export const articleById = (id: string) => ARTICLES.find((article) => article.id === id) ?? null;

/** As the user types, the articles whose title or teaser contains every word typed. */
export function findArticles(query: string, articles: Article[] = ARTICLES): Article[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return articles.filter((article) => {
    const text = `${article.title} ${article.teaser}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
