import { describe, expect, it } from "vitest";
import { DEFAULT_PROVIDER, forgetKey, loadSettings, missingSettings, saveKey, saveProvider } from "./settings.ts";
import type { Store } from "./settings.ts";

function fakeStore(initial: Record<string, string> = {}): Store & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("the provider", () => {
  it("starts at the default provider and model", () => {
    expect(DEFAULT_PROVIDER).toEqual({
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-3.5-flash-lite",
    });
    expect(loadSettings(fakeStore(), fakeStore()).provider).toEqual(DEFAULT_PROVIDER);
  });

  it("remembers another provider across visits", () => {
    const local = fakeStore();
    saveProvider(local, { baseUrl: "https://other.example/v1", model: "m" });
    expect(loadSettings(fakeStore(), local).provider).toEqual({ baseUrl: "https://other.example/v1", model: "m" });
  });

  it("falls back to the default if what was saved is damaged", () => {
    const local = fakeStore();
    saveProvider(local, DEFAULT_PROVIDER);
    local.data.set([...local.data.keys()][0], "{not json");
    expect(loadSettings(fakeStore(), local).provider).toEqual(DEFAULT_PROVIDER);
  });
});

describe("the key", () => {
  it("stays in the tab's session storage and never reaches local storage", () => {
    const session = fakeStore();
    const local = fakeStore();
    saveKey(session, "secret");
    saveProvider(local, DEFAULT_PROVIDER);
    expect([...session.data.values()]).toContain("secret");
    expect(JSON.stringify([...local.data.values()])).not.toContain("secret");
    expect(loadSettings(session, local).apiKey).toBe("secret");
  });

  it("a new tab, with empty session storage, has no key", () => {
    const local = fakeStore();
    saveProvider(local, DEFAULT_PROVIDER);
    expect(loadSettings(fakeStore(), local).apiKey).toBe("");
  });

  it("forgetting clears it at once and keeps the provider", () => {
    const session = fakeStore();
    const local = fakeStore();
    saveKey(session, "secret");
    saveProvider(local, { baseUrl: "https://other.example/v1", model: "m" });
    forgetKey(session);
    expect(session.data.size).toBe(0);
    expect(loadSettings(session, local)).toEqual({
      apiKey: "",
      provider: { baseUrl: "https://other.example/v1", model: "m" },
    });
  });

  it("saving an empty key removes it", () => {
    const session = fakeStore();
    saveKey(session, "secret");
    saveKey(session, "");
    expect(session.data.size).toBe(0);
  });
});

describe("a browser with no storage", () => {
  it("still works, and just doesn't remember", () => {
    expect(loadSettings(null, null)).toEqual({ apiKey: "", provider: DEFAULT_PROVIDER });
    expect(() => {
      saveKey(null, "secret");
      saveProvider(null, DEFAULT_PROVIDER);
      forgetKey(null);
    }).not.toThrow();
  });
});

describe("missingSettings", () => {
  const provider = DEFAULT_PROVIDER;

  it("names what is missing", () => {
    expect(missingSettings({ apiKey: "", provider })).toEqual(["key"]);
    expect(missingSettings({ apiKey: "k", provider: { baseUrl: " ", model: "" } })).toEqual(["baseUrl", "model"]);
    expect(missingSettings({ apiKey: "k", provider })).toEqual([]);
  });
});
