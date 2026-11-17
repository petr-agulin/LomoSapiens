// The saved data as React state: read once when the app opens, saved after every change.
import { useCallback, useState } from "react";
import { browserStore } from "../../lib/settings.ts";
import { loadState, saveState, savedVersion, type AppState } from "../../lib/store.ts";

export function useAppState() {
  // Rendering outside a browser, as in the tests, has no storage and starts empty.
  const [store] = useState(() => (typeof window === "undefined" ? null : browserStore("local")));
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState(store);
    // Version 1 data is upgraded on loading (each film becomes a roll, loaded today). Saving it at once
    // upgrades it only once, so the roll keeps the day of the update.
    if (savedVersion(store) === 1) saveState(store, loaded);
    return loaded;
  });

  const update = useCallback(
    (change: (current: AppState) => AppState) =>
      setState((current) => {
        const next = change(current);
        saveState(store, next);
        return next;
      }),
    [store],
  );

  return [state, update] as const;
}
