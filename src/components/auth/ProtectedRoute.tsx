import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamSession } from "@/contexts/TeamSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingScreen } from "./LoadingScreen";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { plan, loading: subLoading } = useSubscription();
  const { role, loading: roleLoading, isFornecedor, isAdmin } = useUserRole();
  const { member: teamMember, loading: teamLoading } = useTeamSession();
  const location = useLocation();
  const checkInterval = useRef<ReturnType<typeof setInterval>>();
  useSessionTracker();

  // Safety net: never block rendering on subscription/role loading for more
  // than a few seconds. If something is slow or silently fails, release the
  // gate so the user always sees the UI instead of a stuck loading screen.
  const [safetyElapsed, setSafetyElapsed] = useState(false);
  useEffect(() => {
    setSafetyElapsed(false);
    const t = window.setTimeout(() => setSafetyElapsed(true), 5000);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  // Periodically check if user is still active (every 60s)
  useEffect(() => {
    if (!user) return;

    const checkActive = async () => {
      const { data: isActive } = await supabase.rpc("is_user_active", {
        _user_id: user.id,
      });
      if (isActive === false) {
        toast.error("Sua conta foi desativada. Entre em contato com o suporte.");
        await signOut();
      }
    };

    // Check immediately on mount
    checkActive();

    // Then every 60 seconds
    checkInterval.current = setInterval(checkActive, 60_000);

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [user, signOut]);

  // Block ONLY on the auth session itself — that's required to know if the
  // user is logged in. Subscription/role can resolve in background; they only
  // affect redirect logic, which re-runs as soon as they arrive.
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // While plan/role are still loading (and the safety timeout hasn't fired),
  // show the friendly loader instead of risking a wrong redirect. After
  // `safetyElapsed`, we proceed with whatever defaults we have so the user
  // is never stuck on a blank/loading screen.
  if ((subLoading || roleLoading || teamLoading) && !safetyElapsed) {
    return <LoadingScreen />;
  }

  if ((subLoading || roleLoading) && safetyElapsed) {
    console.warn(
      "[ProtectedRoute] Safety timeout reached while waiting for",
      { subLoading, roleLoading, userId: user.id }
    );
  }

  // Fornecedor users have a dedicated ecosystem (dashboard, profile, materials, community,
  // trade agenda, news, academy, tourism map, personal profile). Other internal agent
  // areas (CRM, financeiro, orçamentos, roteiros etc.) remain blocked.
  if (isFornecedor) {
    const supplierAllowed = [
      "/dashboard-fornecedor",
      "/meu-perfil-empresa",
      "/meus-materiais",
      "/noticias",
      "/educa-academy",
      "/mapa-turismo",
      "/suporte",
    ];
    const isAllowed = supplierAllowed.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );
    if (!isAllowed) {
      return <Navigate to="/dashboard-fornecedor" replace />;
    }
  }

  // Non-supplier (and non-admin) users must not access supplier-exclusive areas.
  // Admin keeps full access for support/impersonation purposes.
  if (!isFornecedor && !isAdmin) {
    const supplierOnly = ["/dashboard-fornecedor", "/meu-perfil-empresa"];
    const isSupplierOnly = supplierOnly.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );
    if (isSupplierOnly) {
      const redirectTo = plan === "start" ? "/dashboard-start" : "/dashboard";
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Educa Pass users can only access /educa-academy and /perfil
  if (plan === "educa_pass") {
    const allowedPaths = ["/educa-academy", "/perfil", "/playbook"];
    const isAllowed = allowedPaths.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );
    if (!isAllowed) {
      return <Navigate to="/educa-academy" replace />;
    }
  }

  // Cartão Digital Pass users can only access /meu-cartao and /perfil
  if (plan === "cartao_digital") {
    const allowedPaths = ["/meu-cartao", "/perfil"];
    const isAllowed = allowedPaths.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );
    if (!isAllowed) {
      return <Navigate to="/meu-cartao" replace />;
    }
  }

  // Start (free) plan users must NEVER access /dashboard (the full dashboard
  // for paid plans) or any other plan-restricted dashboard. They are always
  // redirected to /dashboard-start. Admins are exempt (role === "admin").
  // Subusuários de equipe usam sempre o dashboard padrão, mesmo que a agência
  // esteja em plano Start.
  if (plan === "start" && role !== "admin" && !teamMember) {
    if (
      location.pathname === "/dashboard" ||
      location.pathname.startsWith("/dashboard/")
    ) {
      return <Navigate to="/dashboard-start" replace />;
    }
  }

  return <>{children}</>;
}
