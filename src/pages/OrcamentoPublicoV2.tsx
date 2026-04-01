import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Quote, QuoteService, ServiceType, ServiceData } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const OrcamentoPublico = lazy(() => import("@/pages/OrcamentoPublico"));

async function fetchQuoteByPublicCode(agencySlug: string, code: string) {
  const { data, error } = await supabase.rpc('get_quote_by_public_code', {
    p_agency_slug: agencySlug,
    p_code: code,
  });
  if (error) throw error;
  const result = data as any;
  if (result.error) throw new Error(result.error);
  return {
    quote: {
      ...result.quote,
      services: (result.services || []).map((s: any) => ({
        ...s,
        service_type: s.service_type as ServiceType,
        service_data: s.service_data as unknown as ServiceData,
      })),
    } as Quote,
    agentProfile: result.agent_profile as AgentProfile | null,
  };
}

export default function OrcamentoPublicoV2() {
  const { agencySlug, accessCode } = useParams<{ agencySlug: string; accessCode: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!agencySlug || !accessCode) {
      setError("Link inválido");
      setLoading(false);
      return;
    }

    fetchQuoteByPublicCode(agencySlug, accessCode)
      .then(({ quote, agentProfile }) => {
        setQuote(quote);
        setAgentProfile(agentProfile);
      })
      .catch((err) => {
        setError(err.message || "Orçamento não encontrado");
      })
      .finally(() => setLoading(false));
  }, [agencySlug, accessCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-destructive">{error || "Orçamento não encontrado"}</p>
          <p className="text-sm text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <OrcamentoPublico quoteOverride={quote} agentProfileOverride={agentProfile} />
    </Suspense>
  );
}
