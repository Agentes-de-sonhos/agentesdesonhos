import { useState, useEffect, useCallback, useRef } from "react";

/**
 * A useState replacement that persists to sessionStorage.
 * Survives tab switches and soft navigations; clears when the browser session ends.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota exceeded */ }
  }, [key, value]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, setValue, clear];
}

/**
 * Persists form draft values to localStorage with debounce.
 * Returns save/load/clear helpers.
 */
export function useFormDraft<T extends Record<string, any>>(
  draftKey: string,
  delay = 1000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(`draft:${draftKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [draftKey]);

  const saveDraft = useCallback(
    (data: Partial<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          const existing = loadDraft() || {};
          localStorage.setItem(
            `draft:${draftKey}`,
            JSON.stringify({ ...existing, ...data, _savedAt: Date.now() })
          );
        } catch { /* ignore */ }
      }, delay);
    },
    [draftKey, delay, loadDraft]
  );

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    localStorage.removeItem(`draft:${draftKey}`);
  }, [draftKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { loadDraft, saveDraft, clearDraft };
}

/**
 * Hook that tracks page visibility changes.
 * Returns whether the page is currently visible.
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return isVisible;
}
