import { describe, expect, it, vi } from "vitest";
import parseSchema from "../../../schema/parse.schema.json" with { type: "json" };
import { parseDescription, systemPrompt } from "./parser.ts";

const provider = { baseUrl: "https://ai.example/v1/", model: "test-model", apiKey: "secret-key-123" };
const shot = { kind: "new_shot", conditions: { subject: "group" }, assumptions: [] };

const replyWith = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
const good = () => replyWith(JSON.stringify(shot));
const refused = (status: number, body = "{}") => new Response(body, { status });

type FakeFetch = (url: string, init: RequestInit) => Promise<Response>;

function deps(...answers: Array<() => Response | Promise<Response>>) {
  const fetchImpl = vi.fn<FakeFetch>(async () => {
    const next = answers.shift();
    if (!next) throw new Error("called too many times");
    return next();
  });
  const pause = vi.fn(async () => undefined);
  return { fetchImpl: fetchImpl as unknown as typeof fetch, pause, calls: fetchImpl.mock.calls };
}

const bodyOf = (init: RequestInit) => JSON.parse(init.body as string);

describe("the request", () => {
  it("goes to the provider's chat completions, with the key only in the header", async () => {
    const d = deps(good);
    await parseDescription("a group in the sun", provider, d);

    const [url, init] = d.calls[0];
    expect(url).toBe("https://ai.example/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret-key-123", "Content-Type": "application/json" });
    expect(init.body).not.toContain("secret-key-123");
  });

  it("asks for JSON at temperature 0, sending only the prompt and the person's words", async () => {
    const d = deps(good);
    await parseDescription("a group in the sun", provider, d);

    const body = bodyOf(d.calls[0][1]);
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: systemPrompt() },
      { role: "user", content: "a group in the sun" },
    ]);
  });
});

describe("a good reply", () => {
  it("comes back as the parse result", async () => {
    expect(await parseDescription("x", provider, deps(good))).toEqual({ ok: true, parse: shot });
  });

  it("is accepted even wrapped in a Markdown code block", async () => {
    const d = deps(() => replyWith("```json\n" + JSON.stringify(shot) + "\n```"));
    expect(await parseDescription("x", provider, d)).toEqual({ ok: true, parse: shot });
  });
});

describe("a reply that can't be used gets one retry", () => {
  it("not JSON, then good", async () => {
    const d = deps(() => replyWith("Sure! Here you go."), good);
    expect(await parseDescription("x", provider, d)).toEqual({ ok: true, parse: shot });
    expect(d.calls).toHaveLength(2);
    expect(bodyOf(d.calls[1][1]).messages[0].content).toContain("could not be used");
    expect(d.pause).not.toHaveBeenCalled();
  });

  it("not JSON twice is a failure, and it stops there", async () => {
    const d = deps(() => replyWith("nope"), () => replyWith("nope"));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure: "reply" });
    expect(d.calls).toHaveLength(2);
  });

  it("a value outside the lists", async () => {
    const bad = JSON.stringify({ kind: "new_shot", conditions: { light: { sky: "fog" } } });
    const d = deps(() => replyWith(bad), () => replyWith(bad));
    const result = await parseDescription("x", provider, d);
    expect(result).toMatchObject({ ok: false, failure: "reply" });
    expect(!result.ok && result.details).toContain("sky");
  });

  it("no message in the reply", async () => {
    const d = deps(() => replyWith(null), () => new Response("{}", { status: 200 }));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure: "reply" });
  });

  it("a body that isn't JSON at all", async () => {
    const d = deps(() => new Response("<html>", { status: 200 }), () => new Response("<html>", { status: 200 }));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure: "reply" });
  });
});

describe("hard rules: the AI can't smuggle in settings or a location", () => {
  it.each([
    ["an aperture", { kind: "new_shot", conditions: { aperture: "8" } }],
    ["a shutter", { kind: "new_shot", conditions: { shutter: "1/250" } }],
    ["a final answer", { kind: "new_shot", final: { aperture: "8" } }],
    ["a location", { kind: "new_shot", conditions: { location: "Sweden" } }],
    ["a what-if aperture no camera has", { kind: "what_if", whatIf: { aperture: "1.2" } }],
  ])("rejects %s", async (_name, reply) => {
    const text = JSON.stringify(reply);
    const d = deps(() => replyWith(text), () => replyWith(text));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure: "reply" });
  });
});

describe("the provider refusing", () => {
  it.each([
    [401, "key"],
    [403, "key"],
    [400, "other"],
    [404, "other"],
  ])("%i is %s, with no retry", async (status, failure) => {
    const d = deps(() => refused(status));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure });
    expect(d.calls).toHaveLength(1);
  });

  it.each([
    [429, "limit"],
    [500, "busy"],
    [503, "busy"],
  ])("%i is %s, after one retry and a pause", async (status, failure) => {
    const d = deps(() => refused(status), () => refused(status));
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure });
    expect(d.calls).toHaveLength(2);
    expect(d.pause).toHaveBeenCalledTimes(1);
  });

  it("a busy provider that recovers on the retry is fine", async () => {
    const d = deps(() => refused(503), good);
    expect(await parseDescription("x", provider, d)).toEqual({ ok: true, parse: shot });
  });

  it("gives the provider's own sentence as a detail", async () => {
    const d = deps(() => refused(404, JSON.stringify({ error: { message: "No such model." } })));
    const result = await parseDescription("x", provider, d);
    expect(!result.ok && result.details).toContain("No such model.");
  });

  it("never shows the key, even if the provider repeats it", async () => {
    const d = deps(() => refused(401, JSON.stringify({ error: { message: "Bad key secret-key-123 given" } })));
    const result = await parseDescription("x", provider, d);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-key-123");
  });
});

describe("no answer at all", () => {
  it("a network failure is reported at once", async () => {
    const d = deps(() => {
      throw new TypeError("Failed to fetch");
    });
    expect(await parseDescription("x", provider, d)).toMatchObject({ ok: false, failure: "network" });
    expect(d.calls).toHaveLength(1);
  });

  it("no answer in time gets one retry, then a timeout", async () => {
    const hang: FakeFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const fetchImpl = vi.fn(hang);
    const result = await parseDescription("x", provider, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 10,
    });
    expect(result).toMatchObject({ ok: false, failure: "timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("before calling", () => {
  it.each([
    ["key", { ...provider, apiKey: "" }],
    ["address", { ...provider, baseUrl: "" }],
    ["model", { ...provider, model: "  " }],
  ])("with no %s, nothing is sent", async (_name, incomplete) => {
    const d = deps(good);
    expect(await parseDescription("x", incomplete, d)).toMatchObject({ ok: false, failure: "settings" });
    expect(d.calls).toHaveLength(0);
  });
});

describe("the prompt", () => {
  const prompt = systemPrompt();
  const conditions = parseSchema.properties.conditions.properties;

  it("works for any manual camera, and has no placeholders left", () => {
    expect(prompt).toContain("Camera: a manual 35 mm film camera.");
    expect(prompt).not.toContain("LOMO");
    expect(prompt).not.toContain("{{");
  });

  it("asks for no month or hour, which the engine no longer takes", () => {
    expect(prompt).not.toContain('"month"');
    expect(prompt).not.toContain('"hour"');
  });

  it("says never to recommend settings", () => {
    expect(prompt).toContain("Never recommend settings.");
  });

  it("has no film list, and says not to work out a speed from a film's name", () => {
    expect(prompt).toContain("There is no list of film names.");
    expect(prompt).toContain("Never work out a speed from what you know about a film.");
  });

  it("uses the same example places as the Scene options on the page", () => {
    expect(prompt).toContain("- snow_sand: on snow or sand: ski slope, snowy field, snowy mountains, beach, seashore, dunes");
    expect(prompt).not.toMatch(/^- (snow|beach):/m);
    expect(prompt).toContain("- open: outdoors in the open, street, square, park, field, garden");
    expect(prompt).toContain("- under_trees: under trees, in a forest, in the shade, in a building's shadow, on a porch");
  });

  it("makes indoors a scene, and says what an apartment with no other detail means", () => {
    expect(prompt).toContain("- indoor_window: indoors by day, near a window");
    expect(prompt).toContain("- indoor_room: indoors by day, away from a window");
    expect(prompt).toContain("- indoor_lamps: indoors by day with only lamps, no daylight");
    expect(prompt).toContain("- indoor_office: an office, shop or school, lit by ceiling lights");
    expect(prompt).toContain("An apartment, house or room with no mention of a window or lamps is indoor_room by day and home_lamps in the evening.");
    expect(prompt).not.toContain("unsupportedLight");
  });

  it("says never to output a location", () => {
    expect(prompt).toContain("Never output a location.");
  });

  it("covers every value the schema allows", () => {
    const values = [
      ...parseSchema.properties.kind.enum,
      ...conditions.light.properties.sky.enum,
      ...conditions.light.properties.scene.enum,
      ...conditions.light.properties.lowlight.enum,
      ...conditions.subject.enum,
      ...conditions.goal.enum,
      ...conditions.support.enum,
      ...conditions.film.properties.type.enum,
    ].filter((value): value is string => value !== null);
    for (const value of values) expect(prompt, value).toContain(value);
    for (const field of Object.keys(conditions)) expect(prompt, field).toContain(field);
  });
});
