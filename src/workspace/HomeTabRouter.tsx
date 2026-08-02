import { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { NavigationType, Router, createPath, parsePath, type Location, type To } from "react-router-dom";
import { resolveHomeNavigation, buildPath } from "./homeNavigation";

interface Entry {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
}

function makeEntry(path: string, state: unknown = null): Entry {
  const p = parsePath(path);
  return {
    pathname: p.pathname || "/",
    search: p.search || "",
    hash: p.hash || "",
    state: state ?? null,
    key: Math.random().toString(36).slice(2, 8),
  };
}

interface Props {
  homePath: string;
  /** Called when an internal navigation must become its own workspace window. */
  onNavigateAway: (path: string, title: string, state: unknown) => void;
  children: ReactNode;
}

/**
 * Router used exclusively by the pinned "Inicial" tab. It behaves like a memory
 * router for the home route itself, but every navigation to a different internal
 * route is handed over to the workspace (new/activated window) instead of
 * replacing the dashboard. Because `<Link>` and `useNavigate()` both go through
 * the router's navigator, this covers declarative *and* programmatic navigation.
 */
export function HomeTabRouter({ homePath, onNavigateAway, children }: Props) {
  const [entries, setEntries] = useState<Entry[]>(() => [makeEntry(homePath)]);
  const [index, setIndex] = useState(0);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const indexRef = useRef(index);
  indexRef.current = index;
  const awayRef = useRef(onNavigateAway);
  awayRef.current = onNavigateAway;

  const current = entries[index] ?? entries[0];

  const handle = useCallback(
    (to: To, state: unknown, replace: boolean) => {
      const decision = resolveHomeNavigation(
        typeof to === "string" ? to : { pathname: to.pathname, search: to.search, hash: to.hash },
        homePath,
        entriesRef.current[indexRef.current]?.pathname ?? homePath,
      );

      if (decision.type === "open") {
        awayRef.current(decision.path, decision.title, state ?? null);
        return;
      }

      const entry = makeEntry(decision.path, state);
      setEntries((prev) => {
        const base = prev.slice(0, indexRef.current + (replace ? 0 : 1));
        return [...base, entry];
      });
      setIndex((prev) => (replace ? prev : prev + 1));
    },
    [homePath],
  );

  const navigator = useMemo(
    () => ({
      createHref: (to: To) => (typeof to === "string" ? to : createPath(to)),
      encodeLocation: (to: To) => {
        const p = typeof to === "string" ? parsePath(to) : to;
        return { pathname: p.pathname || "/", search: p.search || "", hash: p.hash || "" };
      },
      go: (delta: number) => {
        setIndex((prev) => Math.min(Math.max(prev + delta, 0), entriesRef.current.length - 1));
      },
      push: (to: To, state?: unknown) => handle(to, state, false),
      replace: (to: To, state?: unknown) => handle(to, state, true),
    }),
    [handle],
  );

  const location: Location = {
    pathname: current.pathname,
    search: current.search,
    hash: current.hash,
    state: current.state,
    key: current.key,
  };

  return (
    <Router location={location} navigator={navigator as never} navigationType={NavigationType.Push} static={false}>
      {children}
    </Router>
  );
}

export { buildPath };