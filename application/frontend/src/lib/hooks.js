import { useCallback, useEffect, useState } from "react";
import { REFRESH_INTERVAL_MS } from "./constants";

/**
 * Loads data with `loader` and keeps it fresh by polling while the tab is visible.
 * `deps` re-trigger the load (e.g. filters); `reload()` forces a refresh after a change.
 */
export function usePolling(loader, deps = [], interval = REFRESH_INTERVAL_MS) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await loader();
        if (!cancelled) setState({ data, error: null, loading: false, updatedAt: Date.now() });
      } catch (error) {
        if (!cancelled) setState((prev) => ({ ...prev, error, loading: false }));
      }
    };
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, interval);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `loader` is recreated every render; `deps` describe when it actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, version, ...deps]);

  return { ...state, reload };
}

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : JSON.parse(stored);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode); the value still works for this session.
    }
  }, [key, value]);
  return [value, setValue];
}

/** Re-renders every `ms` so relative times ("5m ago") stay current. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}
