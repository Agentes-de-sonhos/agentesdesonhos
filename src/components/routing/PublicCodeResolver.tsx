import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CarteiraPublicaV2 = lazy(() => import("@/pages/CarteiraPublicaV2"));
const OrcamentoPublicoV2 = lazy(() => import("@/pages/OrcamentoPublicoV2"));
const RoteiroPublicoV2 = lazy(() => import("@/pages/RoteiroPublicoV2"));

/**
 * Resolver for /:agencySlug/:accessCode route.
 * Domain-based: seuorcamento.tur.br → quote, carteiradigital.tur.br → carteira, seuroteiro.tur.br → itinerary.
 * Main domain: tries quote → itinerary → carteira.
 */
export default function PublicCodeResolver() {
  const { agencySlug, accessCode } = useParams();
  const [resolved, setResolved] = useState<"quote" | "carteira" | "itinerary" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const hostname = window.location.hostname;

    // Domain-based routing
    if (hostname.includes("seuorcamento.tur.br")) {
      setResolved("quote");
      setLoading(false);
      return;
    }
    if (hostname.includes("seuroteiro.tur.br")) {
      setResolved("itinerary");
      setLoading(false);
      return;
    }
    if (hostname.includes("carteiradigital.tur.br")) {
      setResolved("carteira");
      setLoading(false);
      return;
    }

    if (!agencySlug || !accessCode) {
      setError("Link inválido");
      setLoading(false);
      return;
    }

    const tryResolve = async () => {
      // Try quote
      try {
        const { data } = await supabase.rpc('get_quote_by_public_code' as any, {
          p_agency_slug: agencySlug,
          p_code: accessCode,
        });
        const result = data as any;
        if (result && !result.error) {
          setResolved("quote");
          setLoading(false);
          return;
        }
      } catch { /* not a quote */ }

      // Try itinerary
      try {
        const { data } = await supabase.rpc('get_itinerary_by_public_code' as any, {
          p_agency_slug: agencySlug,
          p_code: accessCode,
        });
        const result = data as any;
        if (result && !result.error) {
          setResolved("itinerary");
          setLoading(false);
          return;
        }
      } catch { /* not an itinerary */ }

      // Fall back to carteira
      setResolved("carteira");
      setLoading(false);
    };

    tryResolve();
  }, [agencySlug, accessCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      {resolved === "quote" ? <OrcamentoPublicoV2 /> : resolved === "itinerary" ? <RoteiroPublicoV2 /> : <CarteiraPublicaV2 />}
    </Suspense>
  );
}
