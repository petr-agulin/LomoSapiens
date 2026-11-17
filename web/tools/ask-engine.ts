// Prints the engine's recommendation for a conditions file.
//   npm run ask-engine -- ../testset/engine/examples/portrait-example.json
// Runs on Node's built-in TypeScript support, so it needs no extra package.
import { readFileSync } from "node:fs";
import { isRefusal, recommend } from "../src/lib/engine/index.ts";
import type { Conditions, Recommendation } from "../src/lib/engine/index.ts";
import { strings } from "../src/lib/strings.ts";
import { validateConditions } from "../src/lib/validate.ts";

const text = strings.engine;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function print(conditions: Conditions, result: Recommendation) {
  const { final } = result;
  const far = final.sharpZone.farM === null ? "∞" : `${final.sharpZone.farM} m`;
  console.log(`Your camera: ${text.cameraSummary(conditions.camera)}`);
  console.log("\nHow the app got there:");
  result.steps.forEach((step) => console.log(`  ${text.stepLine(step)}`));
  console.log("\nFinal settings:");
  console.log(`  Aperture and shutter: ${text.settings(final.aperture, final.shutter, final.bulbSeconds)}`);
  console.log(`  Focus: ${text.focusText(final.focus)}`);
  console.log(`  Sharp zone: ${final.sharpZone.nearM} m to ${far}`);
  console.log(`  Support: ${text.support[final.support]}`);
  const handling = text.handling(final);
  if (handling) console.log(`  Handling: ${handling}`);
  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    result.warnings.forEach((warning) => console.log(`  ${text.warning(warning)}`));
  }
  console.log("\nFull result:");
  console.log(JSON.stringify(result, null, 2));
}

const path = process.argv[2];
if (!path) fail("Usage: npm run ask-engine -- <conditions.json>");

let conditions: unknown;
try {
  conditions = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  fail(`Could not read ${path}: ${(error as Error).message}`);
}

const validation = validateConditions(conditions);
if (!validation.ok) fail(`${path} isn't valid:\n  ${validation.errors.join("\n  ")}`);

const result = recommend(conditions as Conditions);
if (isRefusal(result)) fail(text.refusal[result.refused]);
print(conditions as Conditions, result);
