import { useCallback, useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (updater: (current: T | null) => T | null) => void;
}

/**
 * Runs `load` whenever `key` changes, aborting stale requests so fast typing
 * never renders out-of-order results.
 */
export function useAsync<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(key !== null);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadRef
      .current(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDataState(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [key, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const setData = useCallback((updater: (current: T | null) => T | null) => setDataState(updater), []);
  return { data, error, loading, reload, setData };
}

/** Matches Tailwind's `xl` breakpoint: wide enough for the three-column split view. */
export function useIsDesktop(): boolean {
  const query = "(min-width: 1280px)";
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setMatches(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return Boolean(matches);
}
