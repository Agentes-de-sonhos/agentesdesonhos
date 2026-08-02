import { titleForPath } from "./routeTitle";

export interface PathLike {
  pathname?: string;
  search?: string;
  hash?: string;
}

export type HomeNavDecision =
  /** Navigation stays inside the pinned home tab (same route). */
  | { type: "stay"; path: string }
  /** Navigation must be handed over to a separate internal window. */
  | { type: "open"; path: string; title: string };

function toPathLike(to: string | PathLike): PathLike {
  if (typeof to !== "string") return to;
  const hashIdx = to.indexOf("#");
  const hash = hashIdx >= 0 ? to.slice(hashIdx) : "";
  const withoutHash = hashIdx >= 0 ? to.slice(0, hashIdx) : to;
  const qIdx = withoutHash.indexOf("?");
  const search = qIdx >= 0 ? withoutHash.slice(qIdx) : "";
  const pathname = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
  return { pathname, search, hash };
}

export function buildPath(p: PathLike, fallbackPathname: string): string {
  const pathname = p.pathname || fallbackPathname;
  return `${pathname}${p.search || ""}${p.hash || ""}`;
}

function samePath(a: string, b: string) {
  const norm = (v: string) => (v.replace(/\/+$/, "") || "/");
  return norm(a) === norm(b);
}

/**
 * Routes that legitimately take over the whole surface (auth/onboarding flows,
 * e.g. after logout). They are redirects out of the authenticated workspace, not
 * module navigation, so they must not spawn an internal window.
 */
const EXIT_ROUTES = [
  "/auth",
  "/login",
  "/onboarding",
  "/cadastro",
  "/registro",
  "/reset-password",
  "/atualizar-senha",
];

export function isExitRoute(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return EXIT_ROUTES.some((r) => clean === r || clean.startsWith(`${r}/`));
}

/**
 * Central navigation boundary for the pinned "Inicial" tab: the home tab is a
 * permanent showcase, so any internal route other than the home route must be
 * opened/activated as a separate workspace window.
 */
export function resolveHomeNavigation(
  to: string | PathLike,
  homePath: string,
  currentPathname: string,
  options: { replace?: boolean } = {},
): HomeNavDecision {
  const p = toPathLike(to);
  const pathname = p.pathname || currentPathname;
  const homePathname = homePath.split("?")[0];
  const full = buildPath(p, currentPathname);

  // Same route (including hash-only / query-only navigation) stays in place.
  if (samePath(pathname, homePathname)) return { type: "stay", path: full };

  // Auth/onboarding exits and guard redirects (replace) are not module
  // navigation and must not open internal windows.
  if (isExitRoute(pathname) || options.replace) return { type: "stay", path: full };

  return { type: "open", path: full, title: titleForPath(pathname) };
}

/**
 * Anchors that the workspace may turn into internal windows. Everything
 * external, protocol-based (mailto/tel), download or `target=_blank` stays
 * untouched — notably the individual Radar do Turismo news links.
 */
export function shouldInterceptAnchor(anchor: {
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  target?: string;
}): boolean {
  const href = anchor.getAttribute("href") || "";
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (anchor.target === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.hasAttribute("data-workspace-ignore")) return false;
  return true;
}