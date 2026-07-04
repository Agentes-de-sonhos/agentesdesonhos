import { ReactNode, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceFlag } from "./featureFlag";
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
    return <BrowserRouter>{children}</BrowserRouter>;
  }
  return <AdminWorkspace>{children}</AdminWorkspace>;
}

/**
 * Only renders the tabbed workspace once we know the user is actually an admin.
 * While the role is loading, or if the role check fails, falls back to the
 * standard BrowserRouter so the app is never left without a router.
 */
function AdminWorkspace({ children }: Props) {
  const { isAdmin, loading } = useUserRole();

  if (loading || !isAdmin) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  const initialPath = window.location.pathname + window.location.search;
  const initialTitle = deriveInitialTitle(window.location.pathname);

  return (
    <WorkspaceProvider initialPath={initialPath} initialTitle={initialTitle}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

function deriveInitialTitle(pathname: string): string {
  const last = pathname.split("/").filter(Boolean).pop();
  if (!last) return "Início";
  return last.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}