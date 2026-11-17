// The repository's public files explain the app in plain words: they cite no working plan, decision, review or
// document that isn't published, and nobody's own camera or other projects. Reasons go in the comment itself.
import { describe, expect, it } from "vitest";

const read = (files: Record<string, string>) => files;
const PUBLIC = {
  ...read(import.meta.glob(["../**/*.{ts,tsx,css}", "!./publicFiles.test.ts"], { query: "?raw", import: "default", eager: true })),
  ...read(import.meta.glob("../../tools/*.ts", { query: "?raw", import: "default", eager: true })),
  ...read(import.meta.glob(["../../public/theme.js", "../../public/_headers", "../../public/manifest.webmanifest", "../../index.html"], { query: "?raw", import: "default", eager: true })),
  ...read(import.meta.glob(["../../*.ts", "../../package.json", "../../tsconfig*.json"], { query: "?raw", import: "default", eager: true })),
  ...read(import.meta.glob(["../../../kb/*.md", "../../../prompts/*.md", "../../../README.md", "../../../docs/ENGINE_SPEC.md"], { query: "?raw", import: "default", eager: true })),
  ...read(import.meta.glob(["../../../testset/**/*.json", "../../../schema/*.json"], { query: "?raw", import: "default", eager: true })),
} as Record<string, string>;

/** What would point a reader at the working history, kept on the owner's computer only. */
const PRIVATE_TRAIL: [string, RegExp][] = [
  ["a decision's number", /\banswers? \d+|\bdecisions? \d+|\(plan[,)]/i],
  ["a phase", /\bphase \d|PHASE_\d/i],
  ["a review", /\bdesign review\b|\bdose \d/i],
  ["the owner", /\bthe owner\b|\bowner's\b/i],
  ["an unpublished document", /\b(SCOPE|CLAUDE|DESIGN)\.md\b|AGENT_SPEC|CAMERA_LOMO|\bdesign\/|\bdocs\/(?!ENGINE_SPEC\.md|screenshots\b|`)/],
  ["another project", /ParkRead/],
];

describe("the public files", () => {
  it("are found: the app, its tools, the Theory articles, the test data, the README and the engine's description", () => {
    const paths = Object.keys(PUBLIC);
    for (const path of ["../App.tsx", "../../tools/serve-built.ts", "../../public/_headers", "../../../kb/theory.md", "../../../testset/engine/golden.json", "../../../README.md", "../../../docs/ENGINE_SPEC.md"]) {
      expect(paths, path).toContain(path);
    }
    expect(paths.length).toBeGreaterThan(100);
  });

  it("cite no working plan, decision, review, unpublished document or other project", () => {
    const found: string[] = [];
    for (const [path, text] of Object.entries(PUBLIC)) {
      text.split(/\r?\n/).forEach((line, index) => {
        for (const [what, pattern] of PRIVATE_TRAIL) if (pattern.test(line)) found.push(`${path}:${index + 1} ${what}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(found).toEqual([]);
  });
});
