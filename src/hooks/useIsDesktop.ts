import { useEffect, useState } from "react";

/**
 * True when the viewport is at desktop width (Tailwind `lg` = 1024px).
 * Deterministic in SSR/tests: starts as `false` and only flips after mount.
 */
export function useIsDesktop(query = "(min-width: 1024px)") {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return isDesktop;
}