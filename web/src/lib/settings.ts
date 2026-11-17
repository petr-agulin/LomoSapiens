// The AI provider and the user's key.
//
// The key stays in the browser. On the test page it lives in this tab's session
// storage only, and "Forget key" clears it at once.
// The address and model are no secret, so they are remembered.

const KEY = "lomo-sapiens.key";
const PROVIDER = "lomo-sapiens.provider";

export interface Provider {
  baseUrl: string;
  model: string;
}

export interface Settings {
  apiKey: string;
  provider: Provider;
}

/** The provider and model the test page starts with. */
export const DEFAULT_PROVIDER: Provider = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  model: "gemini-3.5-flash-lite",
};

/** Storage may not exist at all: a private tab, a blocked site. The app then simply doesn't remember. */
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function browserStore(kind: "session" | "local"): Store | null {
  try {
    const store = kind === "session" ? window.sessionStorage : window.localStorage;
    const probe = "lomo-sapiens.probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

function loadProvider(local: Store | null): Provider {
  try {
    const saved = local?.getItem(PROVIDER);
    return saved ? { ...DEFAULT_PROVIDER, ...JSON.parse(saved) } : DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

export function loadSettings(session: Store | null, local: Store | null): Settings {
  return { apiKey: session?.getItem(KEY) ?? "", provider: loadProvider(local) };
}

export function saveKey(session: Store | null, apiKey: string) {
  if (apiKey) session?.setItem(KEY, apiKey);
  else session?.removeItem(KEY);
}

export function saveProvider(local: Store | null, provider: Provider) {
  local?.setItem(PROVIDER, JSON.stringify(provider));
}

export function forgetKey(session: Store | null) {
  session?.removeItem(KEY);
}

export type SettingName = "key" | "baseUrl" | "model";

export function missingSettings({ apiKey, provider }: Settings): SettingName[] {
  const gaps: SettingName[] = [];
  if (!apiKey.trim()) gaps.push("key");
  if (!provider.baseUrl.trim()) gaps.push("baseUrl");
  if (!provider.model.trim()) gaps.push("model");
  return gaps;
}
