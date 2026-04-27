import React, { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, User, LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OnlineAgentsStrip } from "@/components/community-chat/OnlineAgentsStrip";
import { GamificationPill } from "@/components/layout/GamificationPill";
import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GraduationCap, ArrowRight, Gift, Sparkles } from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { TrailCard } from "@/components/academy/TrailCard";
import { TrailDetail } from "@/components/academy/TrailDetail";
import { useState } from "react";
import type { TrailWithProgress } from "@/types/academy";

import { MapaTurismoCard } from "@/components/dashboard/start/MapaTurismoCard";
import { MateriaisRecentesCard } from "@/components/dashboard/start/MateriaisRecentesCard";
import { PlanUpsellSection } from "@/components/dashboard/start/PlanUpsellSection";
import { RoteiroIACard } from "@/components/dashboard/start/RoteiroIACard";
import { BloqueiosAereosStartCard } from "@/components/dashboard/start/BloqueiosAereosStartCard";

// Reused lazy cards
const CuratedNewsFeed = lazy(() =>
  import("@/components/dashboard/CuratedNewsFeed").then((m) => ({ default: m.CuratedNewsFeed }))
);
const UpcomingAgendaEventsCard = lazy(() =>
  import("@/components/dashboard/UpcomingAgendaEventsCard").then((m) => ({
    default: m.UpcomingAgendaEventsCard,
  }))
);

export default function StartDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { registerDailyLogin } = useGamification();
  const { trailsWithProgress, isLoading: academyLoading } = useAcademy();
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);

  React.useEffect(() => {
    registerDailyLogin();
  }, [registerDailyLogin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

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
    staleTime: 5 * 60 * 1000,
  });

  const firstName = profile?.name?.split(" ")[0] || "Agente";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Start users only see the 3 most recent trails
  const visibleTrails = trailsWithProgress.slice(0, 3);

  if (selectedTrail) {
    return (
      <DashboardLayout>
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {getGreeting()}, {firstName}!
            </h1>
            <OnlineAgentsStrip restrictedMode />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <GamificationPill restrictedMode />
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
                <TooltipContent>
                  <p>Meu Perfil</p>
                </TooltipContent>
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
                <TooltipContent>
                  <p>Sair</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* 1. Mapa do Turismo */}
        <MapaTurismoCard />

        {/* 2. Radar do Turismo + Minha Agenda */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
            <div className="flex flex-col flex-1 min-w-0 [&>*]:h-full">
              <CuratedNewsFeed />
            </div>
            <div className="flex flex-col flex-1 min-w-0 [&>*]:h-full">
              <UpcomingAgendaEventsCard />
            </div>
          </section>
        </Suspense>

        {/* 3. EducaTravel Academy (3 últimas trilhas) */}
        <Card className="border-0 shadow-card">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="w-fit">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  EducaTravel Academy
                </h2>
                <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/educa-academy")}
                className="text-emerald-700 hover:text-emerald-800"
              >
                Ver Academy
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {academyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleTrails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma trilha disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTrails.map((trail) => (
                  <TrailCard key={trail.id} trail={trail} onSelect={setSelectedTrail} />
                ))}
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground pt-2">
              No plano Start você tem acesso às 3 trilhas mais recentes.{" "}
              <button
                onClick={() => navigate("/planos")}
                className="text-primary font-medium hover:underline"
              >
                Faça upgrade
              </button>{" "}
              para acessar todas.
            </p>
          </CardContent>
        </Card>

        {/* 4. Materiais de Divulgação */}
        <MateriaisRecentesCard />

        {/* 4b. Bloqueios Aéreos */}
        <BloqueiosAereosStartCard />

        {/* 5. Roteiro por IA (2 por dia para Start) */}
        <RoteiroIACard />

        {/* 5b. Atalhos: Benefícios e Criador de Conteúdo */}
        <section className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <button
            onClick={() => navigate("/beneficios")}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200">
              <Gift className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">
                Benefícios e Descontos
              </h3>
              <p className="text-sm text-muted-foreground">
                Vantagens exclusivas para agentes
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => navigate("/ferramentas-ia/criar-conteudo")}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 group-hover:bg-violet-200">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">
                Criador de Conteúdo
              </h3>
              <p className="text-sm text-muted-foreground">
                Gere posts e textos com IA
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </section>

        {/* 6. Upsell sections */}
        <PlanUpsellSection />
      </div>
    </DashboardLayout>
  );
}