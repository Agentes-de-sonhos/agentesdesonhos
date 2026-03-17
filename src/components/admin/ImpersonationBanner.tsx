import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const IMPERSONATION_KEY = "impersonation_data";

export interface ImpersonationData {
  adminSessionAccess: string;
  adminSessionRefresh: string;
  targetUserName: string;
  targetUserId: string;
  adminId: string;
  startedAt: string;
}

export function getImpersonationData(): ImpersonationData | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setImpersonationData(data: ImpersonationData) {
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
}

export function clearImpersonationData() {
  localStorage.removeItem(IMPERSONATION_KEY);
}

export function isImpersonating(): boolean {
  return !!getImpersonationData();
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
      // Log the end of impersonation — update ended_at
      // We do this before restoring session because after restore we're admin again
      // and RLS will allow the update

      // Sign out of impersonated session
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
