import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const IMPERSONATION_KEY = "impersonation_data";
const IMPERSONATION_CONTEXT_KEY = "impersonation_support_context";
const IMPERSONATION_EVENT = "impersonation-data-changed";
const IMPERSONATION_TRANSITION_MS = 60_000;

export interface ImpersonationData {
  adminSessionAccess: string;
  adminSessionRefresh: string;
  targetUserName: string;
  targetUserId: string;
  adminId: string;
  startedAt: string;
  impersonationLogId?: string | null;
}

export function getImpersonationData(): ImpersonationData | null {
  try {
    // Legacy cleanup: the old implementation used localStorage for the banner,
    // which made support mode appear in every open tab on the same domain.
    localStorage.removeItem(IMPERSONATION_KEY);

    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as ImpersonationData;
    const startedAt = new Date(data.startedAt).getTime();
    const isExpired = Number.isFinite(startedAt) && Date.now() - startedAt > 8 * 60 * 60 * 1000;
    return isExpired ? null : data;
  } catch {
    return null;
  }
}

export function setImpersonationData(data: ImpersonationData) {
  sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
  localStorage.setItem(
    IMPERSONATION_CONTEXT_KEY,
    JSON.stringify({
      targetUserId: data.targetUserId,
      adminId: data.adminId,
      startedAt: data.startedAt,
      impersonationLogId: data.impersonationLogId ?? null,
    })
  );
  window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function clearImpersonationData() {
  sessionStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
  window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function isImpersonating(): boolean {
  return !!getImpersonationData();
}

export function isActiveImpersonatingUser(userId?: string | null): boolean {
  const data = getImpersonationData();
  return !!userId && !!data && data.targetUserId === userId;
}

export function isSupportSessionForUser(userId?: string | null): boolean {
  if (!userId) return false;
  const activeData = getImpersonationData();
  if (activeData?.targetUserId === userId) return true;

  try {
    const raw = localStorage.getItem(IMPERSONATION_CONTEXT_KEY);
    if (!raw) return false;
    const context = JSON.parse(raw) as Pick<ImpersonationData, "targetUserId" | "startedAt">;
    const startedAt = new Date(context.startedAt).getTime();
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > 8 * 60 * 60 * 1000) {
      localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
      return false;
    }
    return context.targetUserId === userId;
  } catch {
    localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
    return false;
  }
}

export function ImpersonationBanner() {
  const [data, setData] = useState<ImpersonationData | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setData(getImpersonationData());

    const handler = () => setData(getImpersonationData());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Update elapsed time every second
  useEffect(() => {
    if (!data) return;
    const update = () => {
      const start = new Date(data.startedAt).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}m ${secs.toString().padStart(2, "0")}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const handleExit = async () => {
    if (!data || exiting) return;
    setExiting(true);

    try {
      // Sign out of impersonated session (does NOT touch the admin's stored tokens
      // — they live in localStorage under impersonation_data and are restored below).
      await supabase.auth.signOut();

      // Restore admin session
      const { error } = await supabase.auth.setSession({
        access_token: data.adminSessionAccess,
        refresh_token: data.adminSessionRefresh,
      });

      if (error) {
        console.error("Error restoring admin session:", error);
        toast({ title: "Erro ao restaurar sessão", description: "Faça login novamente.", variant: "destructive" });
        clearImpersonationData();
        navigate("/auth");
        return;
      }

      // Close the support-session log (admin RLS now applies)
      if (data.impersonationLogId) {
        await (supabase as any)
          .from("impersonation_logs")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", data.impersonationLogId)
          .is("ended_at", null);
      }

      clearImpersonationData();
      setData(null);
      toast({ title: "Sessão de suporte encerrada", description: "Você voltou para o painel administrativo." });
      navigate("/admin");
    } catch (err) {
      console.error("Exit impersonation error:", err);
      clearImpersonationData();
      navigate("/auth");
    } finally {
      setExiting(false);
    }
  };

  if (!data) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 shadow-lg text-sm font-medium">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span>
          Modo suporte — Acessando como <strong>{data.targetUserName}</strong>
        </span>
        <span className="opacity-70">({elapsed})</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-amber-600/20 border-amber-700/40 text-amber-950 hover:bg-amber-600/40 h-7"
        onClick={handleExit}
        disabled={exiting}
      >
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Voltar para admin
      </Button>
    </div>
  );
}
