import { ReactNode, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { TabBar } from "./TabBar";
import { useWorkspace, MAX_TABS } from "./WorkspaceProvider";

interface Props {
  /** Same JSX subtree used when Workspace is off (typically the app's <Routes/>). */
  children: ReactNode;
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

  const openTabRef = useRef(ws?.openTab);
  const canOpenRef = useRef(ws?.canOpenMore);
  openTabRef.current = ws?.openTab;
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

      // Only intercept links inside navigation surfaces
      const inNav = anchor.closest('nav, aside, [role="navigation"], [data-workspace-menu]');
      if (!inNav) return;

      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/")) return; // ignore external / mailto / #
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("data-workspace-ignore")) return;

      e.preventDefault();
      e.stopPropagation();

      if (!canOpenRef.current) {
        toast.error(`Limite de ${MAX_TABS} abas atingido. Feche uma aba para abrir outra.`);
        return;
      }

      const label =
        anchor.getAttribute("aria-label") ||
        anchor.textContent?.trim() ||
        href.split("/").filter(Boolean).pop() ||
        "Nova aba";
      const title = label.length > 40 ? label.slice(0, 40) + "…" : label;
      openTabRef.current?.(href, title);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  if (!ws) return <>{children}</>;

  const hasTabs = ws.tabs.length > 0;

  return (
    <div ref={rootRef} className="flex flex-col min-h-screen bg-background">
      <TabBar />
      <div className="flex-1 min-h-0 relative">
        {/*
          Phantom layer: when no tabs are open we still keep a MemoryRouter mounted
          so the sidebar / global chrome (rendered by DashboardLayout inside the
          routes) stays visible. The main content area is covered by an empty-state
          overlay while the sidebar remains clickable — link clicks are intercepted
          globally and turned into openTab() calls.
        */}
        {!hasTabs && (
          <div key="__ws_phantom__" className="min-h-full" aria-hidden>
            <MemoryRouter initialEntries={["/dashboard"]}>
              {children}
            </MemoryRouter>
          </div>
        )}

        {ws.tabs.map((tab) => {
          const active = tab.id === ws.activeId;
          return (
            <div
              key={tab.id}
              aria-hidden={!active}
              style={{ display: active ? "block" : "none" }}
              className="min-h-full"
            >
              <MemoryRouter initialEntries={[tab.path]}>
                {children}
              </MemoryRouter>
            </div>
          );
        })}

        {!hasTabs && (
          <div
            className="fixed left-0 lg:left-16 right-0 bottom-0 top-10 z-30 bg-background flex items-center justify-center px-6"
            role="status"
          >
            <div className="text-center max-w-md">
              <h2 className="text-lg font-semibold text-foreground">Nenhuma aba aberta</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Use o menu lateral para abrir uma nova tela.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}