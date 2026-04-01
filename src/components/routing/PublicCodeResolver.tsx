import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CarteiraPublicaV2 = lazy(() => import("@/pages/CarteiraPublicaV2"));
const OrcamentoPublicoV2 = lazy(() => import("@/pages/OrcamentoPublicoV2"));

/**
 * Resolver for /:agencySlug/:accessCode route.
 * Tries to resolve as a quote first (fast check), then falls back to carteira digital.
 * On seuorcamento.tur.br domain → always quote.
 * On carteiradigital.tur.br domain → always carteira.
 * On main domain → tries quote, then carteira.
 */
export default function PublicCodeResolver() {
  const { agencySlug, accessCode } = useParams();
  const [resolved, setResolved] = useState<"quote" | "carteira" | null>(null);
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
    if (hostname.includes("carteiradigital.tur.br")) {
      setResolved("carteira");
      setLoading(false);
      return;
    }

    // On main domain: try quote first, then carteira
    if (!agencySlug || !accessCode) {
      setError("Link inválido");
      setLoading(false);
      return;
    }

    const tryResolve = async () => {
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
      } catch {
        // Not a quote, try carteira
      }

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
      {resolved === "quote" ? <OrcamentoPublicoV2 /> : <CarteiraPublicaV2 />}
    </Suspense>
  );
}
