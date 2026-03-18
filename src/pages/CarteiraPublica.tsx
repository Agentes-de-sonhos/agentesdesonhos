import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Trip, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";

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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              className="text-center text-lg tracking-widest"
            />
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

  useEffect(() => {
    if (!slug) return;
    // Try accessing without password first
    verifyTripBySlug(slug, "")
      .then((result) => {
        setTripData(result);
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === "Senha incorreta") {
          setNeedsPassword(true);
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
      setError(err.message || "Erro ao acessar carteira");
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

  // Redirect to the existing ViagemPublica page using the share_token
  // This avoids duplicating the massive trip viewer UI
  if (tripData.trip.share_token) {
    window.location.replace(`/viagem/${tripData.trip.share_token}`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}
