import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { SupplierDashboardLayout } from "@/components/layout/supplier/SupplierDashboardLayout";
import { SupplierProfileHeroCard } from "@/components/supplier-dashboard/SupplierProfileHeroCard";
import { SupplierAgendaCard } from "@/components/supplier-dashboard/SupplierAgendaCard";
import { SupplierMaterialsCard } from "@/components/supplier-dashboard/SupplierMaterialsCard";
import { SupplierMetricsStrip } from "@/components/supplier-dashboard/SupplierMetricsStrip";
import { SupplierAcademyCard } from "@/components/supplier-dashboard/SupplierAcademyCard";
import { OnlineAgentsStrip } from "@/components/community-chat/OnlineAgentsStrip";
import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";

const CuratedNewsFeed = lazy(() =>
  import("@/components/dashboard/CuratedNewsFeed").then((m) => ({ default: m.CuratedNewsFeed }))
);
const CommunitySocialFeed = lazy(() =>
  import("@/components/dashboard/CommunitySocialFeed").then((m) => ({ default: m.CommunitySocialFeed }))
);
const MapaTurismoCard = lazy(() =>
  import("@/components/dashboard/start/MapaTurismoCard").then((m) => ({ default: m.MapaTurismoCard }))
);

const institutionalPhrases = [
  "Gerencie sua presença comercial no ecossistema Agente de Sonhos.",
  "Conecte sua empresa a milhares de agentes de viagens.",
  "Fortaleça sua presença dentro do trade turístico.",
];

export default function DashboardFornecedor() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

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
            <div className="h-6 w-px bg-border hidden sm:block" />
            <NotificationsDropdown />
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                    onClick={() => navigate("/perfil")}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Meu Perfil</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* 1. Hero do perfil */}
        <SupplierProfileHeroCard />

        <Suspense fallback={<div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
          {/* 2. Mapa do Turismo (full width) */}
          <section>
            <div className="min-w-0"><MapaTurismoCard /></div>
          </section>

          {/* 3. Radar + Academy */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
            <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><CuratedNewsFeed /></div>
            <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><SupplierAcademyCard /></div>
          </section>

          {/* 4. Agenda do Trade + Materiais */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
            <div className="min-w-0"><SupplierAgendaCard /></div>
            <div className="min-w-0"><SupplierMaterialsCard /></div>
          </section>

          {/* 5. Comunidade (full width) */}
          <section>
            <div className="min-w-0"><CommunitySocialFeed /></div>
          </section>
        </Suspense>

        {/* Indicadores premium */}
        <SupplierMetricsStrip />
      </div>
    </SupplierDashboardLayout>
  );
}