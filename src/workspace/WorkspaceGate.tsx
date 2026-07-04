import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceFlag } from "./featureFlag";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { WorkspaceShell } from "./WorkspaceShell";

interface Props {
  children: ReactNode;
}

/**
 * Renders `children` (the app's <Routes/>) as-is when the Workspace is disabled.
 * When enabled AND the user is an admin, wraps them in a tabbed MDI shell.
 *
 * The flag is a local (localStorage) toggle read at mount. The floating toggle
 * button reloads the page after switching, so this gate is evaluated once per
 * page load — no runtime router mutation.
 */
export function WorkspaceGate({ children }: Props) {
  const { isAdmin, loading } = useUserRole();
  const flagOn = getWorkspaceFlag();

  // Bail out fast in all non-admin / off cases (99% of users, incl. anonymous).
  if (!flagOn) return <>{children}</>;
  if (loading) return <>{children}</>;
  if (!isAdmin) return <>{children}</>;

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