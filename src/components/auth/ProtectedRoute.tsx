import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { plan, loading: subLoading } = useSubscription();
  const { role, loading: roleLoading, isFornecedor, isAdmin } = useUserRole();
  const location = useLocation();
  const checkInterval = useRef<ReturnType<typeof setInterval>>();
  useSessionTracker();

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

  if (loading || subLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Fornecedor users have a dedicated ecosystem (dashboard, profile, materials, community,
  // trade agenda, news, academy, tourism map, personal profile). Other internal agent
  // areas (CRM, financeiro, orçamentos, roteiros etc.) remain blocked.
  if (isFornecedor) {
    const supplierAllowed = [
      "/dashboard-fornecedor",
      "/meu-perfil-empresa",
      "/materiais",
      "/comunidade",
      "/agenda-trade",
      "/agenda",
      "/noticias",
      "/educa-academy",
      "/mapa-turismo",
      "/perfil",
      "/minha-conta",
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
  if (plan === "start" && role !== "admin") {
    if (
      location.pathname === "/dashboard" ||
      location.pathname.startsWith("/dashboard/")
    ) {
      return <Navigate to="/dashboard-start" replace />;
    }
  }

  return <>{children}</>;
}
