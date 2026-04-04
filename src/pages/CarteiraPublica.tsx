import { useEffect, useState, lazy, Suspense } from "react";
import { setOgMeta } from "@/lib/ogMeta";
import { useParams } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Trip, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const ViagemPublica = lazy(() => import("@/pages/ViagemPublica"));

async function verifyTripBySlug(slug: string, password: string) {
  const { data, error } = await supabase.rpc('verify_trip_access_by_slug', {
    p_slug: slug,
    p_password: password,
  });
  if (error) throw error;
  const result = data as any;
  if (result.error) throw new Error(result.error);
  return {
    trip: {
      ...result.trip,
      services: (result.services || []).map((s: any) => ({
        ...s,
        service_type: s.service_type as TripServiceType,
        service_data: s.service_data,
      })),
    } as Trip,
    agentProfile: result.agent_profile as AgentProfile | null,
  };
}

function PasswordGate({ onUnlock, loading, error }: { onUnlock: (password: string) => void; loading: boolean; error: string }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onUnlock(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-1">Carteira de Viagem</h1>
            <p className="text-sm text-muted-foreground">
              Digite a senha fornecida pela sua agência
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                className="text-center text-lg tracking-widest pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Acessar Carteira
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CarteiraPublica() {
  const { slug } = useParams();
  const [tripData, setTripData] = useState<{ trip: Trip; agentProfile: AgentProfile | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [usedPassword, setUsedPassword] = useState("");

  const LOCKED_MSG = "Acesso bloqueado por segurança. Entre em contato com a agência responsável.";

  useEffect(() => {
    setOgMeta({
      title: "Sua viagem organizada em um só lugar 🎒",
      description: "Acesse seus vouchers, ingressos e documentos de forma simples e segura.",
    });
    if (!slug) return;
    verifyTripBySlug(slug, "")
      .then((result) => {
        setTripData(result);
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === "Senha incorreta" || err.message === "Senha inválida") {
          setNeedsPassword(true);
        } else if (err.message === LOCKED_MSG) {
          setIsLocked(true);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, [slug]);

  const handleUnlock = async (password: string) => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifyTripBySlug(slug, password);
      setTripData(result);
      setNeedsPassword(false);
    } catch (err: any) {
      if (err.message === LOCKED_MSG) {
        setIsLocked(true);
        setNeedsPassword(false);
      } else {
        setError(err.message || "Erro ao acessar carteira");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Link inválido</p>
      </div>
    );
  }

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-destructive/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl border-0">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-1">Acesso Bloqueado</h1>
              <p className="text-sm text-muted-foreground">
                Acesso bloqueado por segurança. Entre em contato com a agência responsável.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword && !tripData) {
    return <PasswordGate onUnlock={handleUnlock} loading={loading} error={error} />;
  }

  if (error && !tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tripData) return null;

  // Render ViagemPublica directly with pre-loaded data instead of redirecting
  // This avoids React Router state loss issues that could cause attachments to not display
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ViagemPublica 
        preLoadedTrip={tripData.trip} 
        preLoadedAgent={tripData.agentProfile} 
      />
    </Suspense>
  );
}
