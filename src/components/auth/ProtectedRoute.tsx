import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { plan, loading: subLoading } = useSubscription();
  const location = useLocation();
  const checkInterval = useRef<ReturnType<typeof setInterval>>();

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

  if (loading || subLoading) {
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

  return <>{children}</>;
}
