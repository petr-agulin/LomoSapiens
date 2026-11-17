// Checks data against the JSON Schemas in schema/.
import { Ajv } from "ajv";
import type { ValidateFunction } from "ajv";
import conditionsSchema from "../../../schema/conditions.schema.json" with { type: "json" };
import parseSchema from "../../../schema/parse.schema.json" with { type: "json" };
import recommendationSchema from "../../../schema/recommendation.schema.json" with { type: "json" };

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

// "number or null" fields need allowUnionTypes in Ajv's strict mode.
// Ajv builds its checks with new Function, which the hosting's Content-Security-Policy blocks (web/public/_headers).
// Only the test page uses this file, and the published app leaves it out; a published page
// using it would need Ajv's standalone mode instead.
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const conditions = ajv.compile(conditionsSchema);
const recommendation = ajv.compile(recommendationSchema);
const parse = ajv.compile(parseSchema);

function check(validate: ValidateFunction, data: unknown): ValidationResult {
  if (validate(data)) return { ok: true };
  const errors = (validate.errors ?? []).map(({ instancePath, message }) => `${instancePath || "/"} ${message}`);
  return { ok: false, errors };
}

export const validateConditions = (data: unknown) => check(conditions, data);
export const validateRecommendation = (data: unknown) => check(recommendation, data);
export const validateParse = (data: unknown) => check(parse, data);
