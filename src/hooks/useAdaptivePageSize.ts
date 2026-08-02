import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Approximate height of a single row, in px (including its gap). */
  rowHeight: number;
  /** Minimum items per page. */
  min?: number;
  /** Maximum items per page. */
  max?: number;
  /** Deterministic value used in SSR/tests (no layout available). */
  fallback?: number;
}

/**
 * Measures the available height of a container and derives how many rows fit,
 * so lists can paginate instead of scrolling. Deterministic in SSR/tests:
 * returns `fallback` while no measurable box exists.
 */
export function useAdaptivePageSize<T extends HTMLElement = HTMLDivElement>({
  rowHeight,
  min = 2,
  max = 5,
  fallback,
}: Options) {
  const ref = useRef<T | null>(null);
  const [pageSize, setPageSize] = useState<number>(fallback ?? min);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const height = el.clientHeight;
    if (!height) return;
    const fits = Math.floor(height / rowHeight);
    const next = Math.max(min, Math.min(max, fits));
    setPageSize((prev) => (prev === next ? prev : next));
  }, [rowHeight, min, max]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    // Observe only the container; measurement never writes to it (no RO loops).
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  return { ref, pageSize };
}
