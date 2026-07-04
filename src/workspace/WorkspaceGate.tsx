import { ReactNode, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getWorkspaceFlag,
  getWorkspaceEligibleCache,
  setWorkspaceEligibleCache,
  isWorkspaceEligible,
  getWorkspacePref,
} from "./featureFlag";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { WorkspaceShell } from "./WorkspaceShell";

interface Props {
  children: ReactNode;
}

/**
 * Chooses the app's router surface based on the Workspace feature flag.
 *
 * - Workspace OFF (default, every non-admin user): renders a single BrowserRouter
 *   around `children`. Identical to the app's original behavior.
 * - Workspace ON (admin + localStorage flag): renders a WorkspaceProvider +
 *   WorkspaceShell that hosts one MemoryRouter per tab. No BrowserRouter is
 *   mounted, avoiding React Router's "Router inside Router" invariant.
 *
 * The flag is captured once at mount so mid-life auth transitions never swap
 * the router underneath a mounted tree. Toggling reloads the page.
 */
export function WorkspaceGate({ children }: Props) {
  // Snapshot the flag once — never swap routers mid-life.
  const [flagOn] = useState(() => getWorkspaceFlag());

  if (!flagOn) {
    return (
      <BrowserRouter>
        <EligibilitySync />
        {children}
      </BrowserRouter>
    );
  }
  return <EligibleWorkspace>{children}</EligibleWorkspace>;
}

/**
 * Renders the tabbed workspace once we've confirmed eligibility (admin, or
 * premium/fundador plan). While role/plan load, or if the user turns out to
 * be ineligible, falls back to the standard BrowserRouter.
 */
function EligibleWorkspace({ children }: Props) {
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();

  if (roleLoading || subLoading) {
    return (
      <BrowserRouter>
        <EligibilitySync />
        {children}
      </BrowserRouter>
    );
  }

  if (!isWorkspaceEligible(role, plan)) {
    return (
      <BrowserRouter>
        <EligibilitySync />
        {children}
      </BrowserRouter>
    );
  }

  const initialPath = window.location.pathname + window.location.search;
  const initialTitle = deriveInitialTitle(window.location.pathname);

  return (
    <WorkspaceProvider initialPath={initialPath} initialTitle={initialTitle}>
      <EligibilitySync />
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

/**
 * Keeps the eligibility cache in sync with the user's actual role/plan without
 * swapping router surfaces during the current session. The chosen router is
 * intentionally stable until the next page load or an explicit Minha Conta toggle.
 */
function EligibilitySync() {
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();
  useEffect(() => {
    if (roleLoading || subLoading) return;
    const eligible = isWorkspaceEligible(role, plan);
    const prevCache = getWorkspaceEligibleCache();
    if (prevCache !== eligible) setWorkspaceEligibleCache(eligible);

    // If the user just became eligible mid-session (first login for a
    // Premium/Fundador user, or a plan upgrade), the router surface was
    // chosen synchronously at mount as the classic BrowserRouter. Reload
    // ONCE so the tabbed Workspace mounts. A sessionStorage guard makes
    // this strictly one-shot per tab session, preventing any loop.
    if (
      eligible &&
      !prevCache &&
      getWorkspacePref() !== "off" &&
      typeof window !== "undefined"
    ) {
      try {
        const KEY = "workspace_tabs_activation_reloaded";
        if (window.sessionStorage.getItem(KEY) !== "1") {
          window.sessionStorage.setItem(KEY, "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }, [role, plan, roleLoading, subLoading]);

  return null;
}

function deriveInitialTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "");
  if (normalized === "" || normalized === "/dashboard") return "Inicial";
  const last = normalized.split("/").filter(Boolean).pop();
  if (!last) return "Inicial";
  return last.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}