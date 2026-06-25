import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { SupplierDashboardLayout } from "@/components/layout/supplier/SupplierDashboardLayout";
import { SupplierProfileHeroCard } from "@/components/supplier-dashboard/SupplierProfileHeroCard";
import { SupplierMaterialsCard } from "@/components/supplier-dashboard/SupplierMaterialsCard";
import { OnlineAgentsStrip } from "@/components/community-chat/OnlineAgentsStrip";
import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { AcademyCollapsibleCard } from "@/components/dashboard/AcademyCollapsibleCard";

const CuratedNewsFeed = lazy(() =>
  import("@/components/dashboard/CuratedNewsFeed").then((m) => ({ default: m.CuratedNewsFeed }))
);
const MapaTurismoCard = lazy(() =>
  import("@/components/dashboard/start/MapaTurismoCard").then((m) => ({ default: m.MapaTurismoCard }))
);

const institutionalPhrases = [
  "Gerencie sua presença comercial no ecossistema Agente de Sonhos.",
  "Conecte sua empresa a agentes de viagens de todo o Brasil.",
  "Fortaleça sua presença dentro do trade turístico.",
];

export default function DashboardFornecedor() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const firstName = profile?.name?.split(" ")[0] || "Parceiro";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const phrase = institutionalPhrases[new Date().getDate() % institutionalPhrases.length];

  return (
    <SupplierDashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                {greeting}, {firstName}!
              </h1>
              <OnlineAgentsStrip />
            </div>
            <p className="text-sm text-muted-foreground">{phrase}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ExchangeRateCard />
          </div>
        </div>

        {/* 1. Hero do perfil */}
        <SupplierProfileHeroCard />

        <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
          {/* 2. Materiais de Divulgação */}
          <section>
            <div className="min-w-0"><SupplierMaterialsCard /></div>
          </section>

          {/* 3. Mapa do Turismo (full width) */}
          <section>
            <div className="min-w-0"><MapaTurismoCard alwaysExpanded /></div>
          </section>

          {/* 4. Radar + Academy */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
            <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><CuratedNewsFeed /></div>
            <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><AcademyCollapsibleCard limit={3} /></div>
          </section>
        </Suspense>
      </div>
    </SupplierDashboardLayout>
  );
}