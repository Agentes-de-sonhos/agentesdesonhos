import { ReactNode, useEffect, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getWorkspaceFlag,
  getWorkspaceEligibleCache,
  setWorkspaceEligibleCache,
  isWorkspaceEligible,
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
        <EligibilitySync mountedWithTabs={false} />
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
        <EligibilitySync mountedWithTabs={true} />
        {children}
      </BrowserRouter>
    );
  }

  if (!isWorkspaceEligible(role, plan)) {
    return (
      <BrowserRouter>
        <EligibilitySync mountedWithTabs={true} />
        {children}
      </BrowserRouter>
    );
  }

  const initialPath = window.location.pathname + window.location.search;
  const initialTitle = deriveInitialTitle(window.location.pathname);

  return (
    <WorkspaceProvider initialPath={initialPath} initialTitle={initialTitle}>
      <EligibilitySync mountedWithTabs={true} />
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

/**
 * Keeps the eligibility cache in sync with the user's actual role/plan, and
 * reloads the page exactly once when the cached value disagrees with what's
 * currently mounted (e.g. first login as a Premium user → cache flips from
 * "0" to "1" → we reload so the tabbed router mounts).
 */
function EligibilitySync({ mountedWithTabs }: { mountedWithTabs: boolean }) {
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (roleLoading || subLoading) return;
    const eligible = isWorkspaceEligible(role, plan);
    const prevCache = getWorkspaceEligibleCache();
    if (prevCache !== eligible) setWorkspaceEligibleCache(eligible);

    // What the flag WOULD be right now, after the cache update.
    const shouldMountTabs = getWorkspaceFlag();
    if (shouldMountTabs !== mountedWithTabs && !reloadedRef.current) {
      reloadedRef.current = true;
      // Reload once so the correct router surface takes over.
      setTimeout(() => window.location.reload(), 50);
    }
  }, [role, plan, roleLoading, subLoading, mountedWithTabs]);

  return null;
}

function deriveInitialTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "");
  if (normalized === "" || normalized === "/dashboard") return "Inicial";
  const last = normalized.split("/").filter(Boolean).pop();
  if (!last) return "Inicial";
  return last.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}