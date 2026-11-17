// LLM call 1: from a person's description to structured conditions.
//
// Hard rule 2: the AI never produces settings. It returns conditions only, parse.schema.json has no
// field that could hold a recommended setting or a location, and every reply is checked against it.
//
// The key goes to one place, the header of the request to the provider. It reaches no message and
// no details: anything shown from the provider's reply has the key removed first.
import promptTemplate from "../../../prompts/parse.system.md?raw";
import type { AnyScene, FilmType, Goal, LowLight, Sky, Subject, Support } from "./engine/index.ts";
import { validateParse } from "./validate.ts";

export type ParseKind = "new_shot" | "what_if" | "question" | "camera_howto" | "out_of_scope";

/** Part of `Conditions`: anything not said is empty. */
export interface ParsedConditions {
  film?: { iso?: number | null; type?: FilmType | null } | null;
  light?: {
    kind?: "daylight" | "lowlight" | null;
    sky?: Sky | null;
    scene?: AnyScene | null;
    lowlight?: LowLight | null;
  } | null;
  subject?: Subject | null;
  subjectDistanceM?: number | null;
  goal?: Goal | null;
  lowSun?: boolean | null;
  sunBehindSubject?: boolean | null;
  sunAhead?: boolean | null;
  support?: Support | null;
}

export interface ParseResult {
  kind: ParseKind;
  conditions?: ParsedConditions | null;
  whatIf?: {
    aperture?: string | null;
    shutter?: string | null;
    focusM?: number | null;
    support?: Support | null;
  } | null;
  question?: string | null;
  missing?: string[];
  assumptions?: Array<{ field: string; value?: unknown; why: string }>;
}

export type Failure = "settings" | "key" | "limit" | "busy" | "timeout" | "network" | "reply" | "other";

export type ParseOutcome =
  | { ok: true; parse: ParseResult }
  | { ok: false; failure: Failure; details: string | null };

export interface ProviderCall {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ParserDeps {
  fetchImpl?: typeof fetch;
  pause?: (ms: number) => Promise<unknown>;
  timeoutMs?: number;
}

const TIMEOUT_MS = 10_000;
const RETRY_PAUSE_MS = 1_500;
const DETAILS_LIMIT = 400;
const RETRY_NOTE = "\n\nYour previous reply could not be used. Return only the JSON object, in exactly the shape above.";

type Attempt = ParseOutcome & { retry?: boolean; pauseFirst?: boolean };

/** The same for every camera: the app, not the AI, knows the camera's settings. */
export function systemPrompt() {
  return promptTemplate;
}

function failureOf(status: number): Failure {
  if (status === 401 || status === 403) return "key";
  if (status === 429) return "limit";
  if (status >= 500) return "busy";
  return "other";
}

/** The provider's own sentence from its error body, if it has one. */
function providerSays(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const message = first?.error?.message ?? first?.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // Not JSON: the start of the body is the best there is.
  }
  return body.slice(0, 200);
}

function readReply(body: string): Attempt {
  const unusable = (details: string): Attempt => ({ ok: false, failure: "reply", details, retry: true });

  let content: unknown;
  try {
    content = JSON.parse(body)?.choices?.[0]?.message?.content;
  } catch {
    return unusable("The provider's reply wasn't JSON.");
  }
  if (typeof content !== "string") return unusable("The provider's reply held no message.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return unusable(`The AI's reply wasn't JSON: ${content.slice(0, 200)}`);
  }

  const validation = validateParse(parsed);
  if (!validation.ok) return unusable(`The AI's reply didn't fit: ${validation.errors.join("; ")}`);
  return { ok: true, parse: parsed as ParseResult };
}

async function attempt(
  provider: ProviderCall,
  system: string,
  text: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Attempt> {
  const stop = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    stop.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(`${provider.baseUrl.trim().replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        // The only place the key leaves the device.
        Authorization: `Bearer ${provider.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model.trim(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: stop.signal,
    });
    const body = await response.text();
    if (response.ok) return readReply(body);

    const failure = failureOf(response.status);
    const retry = failure === "limit" || failure === "busy";
    return {
      ok: false,
      failure,
      details: `HTTP ${response.status}: ${providerSays(body)}`,
      retry,
      pauseFirst: retry,
    };
  } catch (error) {
    if (expired) {
      return { ok: false, failure: "timeout", details: `No answer within ${Math.round(timeoutMs / 1000)} s.`, retry: true };
    }
    return { ok: false, failure: "network", details: `${(error as Error).name}: ${(error as Error).message}` };
  } finally {
    clearTimeout(timer);
  }
}

/** One call, and one retry if a retry can help. It never throws: a failure says what kind it was. */
export async function parseDescription(text: string, provider: ProviderCall, deps: ParserDeps = {}): Promise<ParseOutcome> {
  const { fetchImpl = fetch, pause = (ms) => new Promise((done) => setTimeout(done, ms)), timeoutMs = TIMEOUT_MS } = deps;

  if (!provider.apiKey.trim() || !provider.baseUrl.trim() || !provider.model.trim()) {
    return { ok: false, failure: "settings", details: null };
  }

  const system = systemPrompt();
  let result = await attempt(provider, system, text, fetchImpl, timeoutMs);
  if (!result.ok && result.retry) {
    if (result.pauseFirst) await pause(RETRY_PAUSE_MS);
    const nextSystem = result.failure === "reply" ? system + RETRY_NOTE : system;
    result = await attempt(provider, nextSystem, text, fetchImpl, timeoutMs);
  }

  if (result.ok) return { ok: true, parse: result.parse };
  const apiKey = provider.apiKey.trim();
  const details = result.details?.split(apiKey).join("•••").slice(0, DETAILS_LIMIT) ?? null;
  return { ok: false, failure: result.failure, details };
}
