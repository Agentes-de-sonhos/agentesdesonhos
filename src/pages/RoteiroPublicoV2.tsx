import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RoteiroPublico = lazy(() => import("@/pages/RoteiroPublico"));

/**
 * Resolves itinerary by agency slug + public access code,
 * then delegates rendering to RoteiroPublico with tokenOverride.
 */
export default function RoteiroPublicoV2() {
  const { agencySlug, accessCode } = useParams<{ agencySlug: string; accessCode: string }>();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!agencySlug || !accessCode) {
      setError("Link inválido");
      setLoading(false);
      return;
    }

    const resolve = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_itinerary_by_public_code' as any, {
          p_agency_slug: agencySlug,
          p_code: accessCode,
        });
        if (rpcError) throw rpcError;
        const result = data as any;
        if (result.error) throw new Error(result.error);
        // Use the share_token from the itinerary to load via existing RoteiroPublico
        const token = result.itinerary?.share_token;
        if (!token) throw new Error("Roteiro não encontrado");
        setShareToken(token);
      } catch (err: any) {
        setError(err.message || "Roteiro não encontrado");
      } finally {
        setLoading(false);
      }
    };

    resolve();
  }, [agencySlug, accessCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shareToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-destructive">{error || "Roteiro não encontrado"}</p>
          <p className="text-sm text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RoteiroPublico tokenOverride={shareToken} />
    </Suspense>
  );
}
