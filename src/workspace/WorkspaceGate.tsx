import { ReactNode, useEffect, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import {
  setWorkspaceEligibleCache,
  isWorkspaceEligible,
  getWorkspacePref,
} from "./featureFlag";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { WorkspaceShell } from "./WorkspaceShell";
import { LoadingScreen } from "@/components/auth/LoadingScreen";

interface Props {
  children: ReactNode;
}

/**
 * Chooses the app's router surface from the real authenticated role/plan, not
 * from the stale localStorage eligibility cache. This keeps admin, Premium and
 * Fundador on the exact same WorkspaceShell whenever the preference is enabled.
 */
export function WorkspaceGate({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { plan, loading: subLoading } = useSubscription();
  const decisionUserRef = useRef<string | null | undefined>(undefined);
  const [decision, setDecision] = useState<{
    workspace: boolean;
    initialPath: string;
    initialTitle: string;
  } | null>(null);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (decisionUserRef.current !== currentUserId) {
      decisionUserRef.current = currentUserId;
      setDecision(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (decision || authLoading) return;

    const initialPath = resolveInitialPath({
      pathname: window.location.pathname,
      search: window.location.search,
      role,
      plan,
      hasUser: Boolean(user),
    });
    const initialTitle = deriveInitialTitle(window.location.pathname);

    if (!user) {
      setWorkspaceEligibleCache(false);
      setDecision({ workspace: false, initialPath, initialTitle });
      return;
    }

    if (roleLoading || subLoading) return;

    const eligible = isWorkspaceEligible(role, plan);
    setWorkspaceEligibleCache(eligible);
    setDecision({
      workspace: eligible && getWorkspacePref() !== "off",
      initialPath,
      initialTitle,
    });
  }, [authLoading, decision, plan, role, roleLoading, subLoading, user]);

  if (!decision) {
    return <LoadingScreen />;
  }

  if (!decision.workspace) {
    return (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    );
  }

  return (
    <WorkspaceProvider initialPath={decision.initialPath} initialTitle={decision.initialTitle}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}

function deriveInitialTitle(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "");
  if (normalized === "" || normalized === "/dashboard") return "Inicial";
  const last = normalized.split("/").filter(Boolean).pop();
  if (!last) return "Inicial";
  return last.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function resolveInitialPath({
  pathname,
  search,
  role,
  plan,
  hasUser,
}: {
  pathname: string;
  search: string;
  role: string | null | undefined;
  plan: string | null | undefined;
  hasUser: boolean;
}): string {
  const rawPath = `${pathname}${search}`;
  if (!hasUser || pathname !== "/auth") return rawPath;

  const next = new URLSearchParams(search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth")) {
    return next;
  }

  if (role === "admin") return "/admin";
  if (role === "fornecedor") return "/dashboard-fornecedor";
  if (plan === "educa_pass") return "/educa-academy";
  if (plan === "cartao_digital") return "/meu-cartao";
  if (plan === "start") return "/dashboard-start";
  return "/dashboard";
}