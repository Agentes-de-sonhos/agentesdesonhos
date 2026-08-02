import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { TabBar } from "./TabBar";
import { useWorkspace, MAX_TABS } from "./WorkspaceProvider";
import { HomeTabRouter } from "./HomeTabRouter";
import { shouldInterceptAnchor } from "./homeNavigation";
import { titleForPath } from "./routeTitle";

interface Props {
  /** Same JSX subtree used when Workspace is off (typically the app's <Routes/>). */
  children: ReactNode;
}

/**
 * Resets the vertical scroll of the real scrolling surfaces (window plus any
 * inner overflow container inside the active tab) so the tab bar is visible.
 * Horizontal scroll — notably the tab bar itself — is never touched.
 */
export function scrollWorkspaceToTop(root: HTMLElement | null) {
  try {
    window.scrollTo({ top: 0, left: window.scrollX, behavior: "auto" });
  } catch {
    window.scrollTo(0, 0);
  }
  const doc = document.scrollingElement as HTMLElement | null;
  if (doc) doc.scrollTop = 0;
  root?.querySelectorAll<HTMLElement>("[data-workspace-scroll]").forEach((el) => {
    el.scrollTop = 0;
  });
}

/**
 * Shell that renders the tab bar and mounts every open tab in its own MemoryRouter,
 * keeping non-active tabs alive via display:none so state is preserved.
 *
 * Also installs a capture-phase click interceptor that turns any click on an anchor
 * inside a `<nav>` / `<aside>` (i.e. sidebar or drawer) into an openTab() call.
 * This avoids touching AppSidebar/MobileDrawerMenu source.
 */
export function WorkspaceShell({ children }: Props) {
  const ws = useWorkspace();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Every tab open/switch must show the tab bar: reset the real vertical
  // scroll container(s) to the top. Hash navigation is respected.
  useLayoutEffect(() => {
    if (!ws?.activeId) return;
    if (window.location.hash) return;
    const raf = requestAnimationFrame(() => scrollWorkspaceToTop(rootRef.current));
    return () => cancelAnimationFrame(raf);
  }, [ws?.activeId]);

  const openTabRef = useRef(ws?.openOrActivateTab);
  const tabsRef = useRef(ws?.tabs);
  const canOpenRef = useRef(ws?.canOpenMore);
  openTabRef.current = ws?.openOrActivateTab;
  tabsRef.current = ws?.tabs;
  canOpenRef.current = ws?.canOpenMore;

  // Reflect the active tab's initial path in the browser URL bar (cosmetic only).
  // Since each tab uses its own MemoryRouter, in-tab navigations do not update
  // window.location; we mirror only the tab's starting path on switch.
  useEffect(() => {
    if (!ws) return;
    const active = ws.tabs.find((t) => t.id === ws.activeId);
    if (active && active.path !== window.location.pathname + window.location.search) {
      try {
        window.history.replaceState(null, "", active.path);
      } catch {
        // ignore
      }
    }
  }, [ws?.activeId, ws?.tabs]);

  // Global sidebar/nav link interception (capture phase).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // ignore modifier clicks (user wants a real new browser tab)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      // Intercept links inside navigation surfaces *and* anywhere inside the
      // pinned home tab, which must never be replaced by another route.
      const inNav = anchor.closest(
        'nav, aside, [role="navigation"], [data-workspace-menu], [data-workspace-home]',
      );
      if (!inNav) return;

      // Skips external, mailto:/tel:, downloads and explicit _blank links.
      if (!shouldInterceptAnchor(anchor)) return;
      const href = anchor.getAttribute("href") || "";

      e.preventDefault();
      e.stopPropagation();

      // If a tab for this path already exists, we'll just activate it and
      // never hit the tab-limit ceiling.
      const hasExisting = (tabsRef.current ?? []).some((t) => t.path === href);
      if (!hasExisting && !canOpenRef.current) {
        toast.error(`Limite de ${MAX_TABS} abas atingido. Feche uma aba para abrir outra.`);
        return;
      }

      const label =
        anchor.getAttribute("data-workspace-title") ||
        anchor.getAttribute("aria-label") ||
        anchor.textContent?.trim() ||
        titleForPath(href);
      const title = label.length > 40 ? label.slice(0, 40) + "…" : label;
      openTabRef.current?.(href, title);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  if (!ws) return <>{children}</>;

  return (
    <div ref={rootRef} className="flex flex-col min-h-screen bg-background">
      <TabBar />
      <div className="flex-1 min-h-0 relative">
        {ws.tabs.map((tab) => {
          const active = tab.id === ws.activeId;
          const isHome = Boolean(tab.pinned);
          return (
            <div
              key={tab.id}
              aria-hidden={!active}
              {...(isHome ? { "data-workspace-home": "" } : {})}
              style={{ display: active ? "block" : "none" }}
              className="min-h-full"
            >
              {isHome ? (
                <HomeTabRouter
                  homePath={ws.homePath}
                  onNavigateAway={(path, title, state) => {
                    const hasExisting = (tabsRef.current ?? []).some((t) => t.path === path);
                    if (!hasExisting && !canOpenRef.current) {
                      toast.error(`Limite de ${MAX_TABS} abas atingido. Feche uma aba para abrir outra.`);
                      return;
                    }
                    openTabRef.current?.(path, title, state);
                  }}
                >
                  {children}
                </HomeTabRouter>
              ) : (
                <MemoryRouter
                  initialEntries={[
                    tab.state !== undefined && tab.state !== null
                      ? { pathname: tab.path.split("?")[0].split("#")[0], search: extractSearch(tab.path), hash: extractHash(tab.path), state: tab.state }
                      : tab.path,
                  ]}
                >
                  {children}
                </MemoryRouter>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function extractSearch(path: string): string {
  const withoutHash = path.split("#")[0];
  const idx = withoutHash.indexOf("?");
  return idx >= 0 ? withoutHash.slice(idx) : "";
}

function extractHash(path: string): string {
  const idx = path.indexOf("#");
  return idx >= 0 ? path.slice(idx) : "";
}