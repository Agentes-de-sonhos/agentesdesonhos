import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Drift-safe clock for office-hours decisions.
 *
 * The server timestamp is captured once (at page load) and converted into an
 * offset against the visitor's device clock. From then on we derive the current
 * instant as `Date.now() + offset`, so:
 *  - a wrong device clock never flips the decision (server wins);
 *  - a page left open (or served from cache) keeps advancing instead of being
 *    frozen at load time, and re-evaluates every `tickMs`.
 */
export function useServerClock(serverNowIso: string | null | undefined, tickMs = 30_000) {
  const offsetRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  // Recompute the offset whenever a new server timestamp arrives.
  useEffect(() => {
    if (!serverNowIso) {
      offsetRef.current = 0;
      setTick((t) => t + 1);
      return;
    }
    const parsed = new Date(serverNowIso).getTime();
    offsetRef.current = Number.isFinite(parsed) ? parsed - Date.now() : 0;
    setTick((t) => t + 1);
  }, [serverNowIso]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), tickMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tickMs]);

  // `tick` is the intentional dependency: it is what advances the clock.
  return useMemo(() => new Date(Date.now() + offsetRef.current), [tick]);
}
