import React, { lazy, Suspense } from "react";
const FeedbackPopup = lazy(() => import("@/components/feedback/FeedbackPopup").then(m => ({ default: m.FeedbackPopup })));
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { GamificationPill } from "@/components/layout/GamificationPill";
import {
  Plane,
  Building2,
  CreditCard,
  Globe,
  Hotel,
  Ship,
  Car,
  Loader2,
  User,
  LogOut,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { OnlineAgentsStrip } from "@/components/community-chat/OnlineAgentsStrip";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { shouldApplyPremiumFundadorFilter } from "@/lib/sidebarVisibility";
import { useIsTeamMember } from "@/contexts/TeamSessionContext";

// Lazy load heavy dashboard cards to reduce initial bundle
const CuratedNewsFeed = lazy(() => import("@/components/dashboard/CuratedNewsFeed").then(m => ({ default: m.CuratedNewsFeed })));
const UpcomingAgendaEventsCard = lazy(() => import("@/components/dashboard/UpcomingAgendaEventsCard").then(m => ({ default: m.UpcomingAgendaEventsCard })));
const CommunitySocialFeed = lazy(() => import("@/components/dashboard/CommunitySocialFeed").then(m => ({ default: m.CommunitySocialFeed })));
const AgentToolsCard = lazy(() => import("@/components/dashboard/AgentToolsCard").then(m => ({ default: m.AgentToolsCard })));
const DashboardBanner = lazy(() => import("@/components/dashboard/DashboardBanner").then(m => ({ default: m.DashboardBanner })));
const TripRemindersCard = lazy(() => import("@/components/dashboard/TripRemindersCard").then(m => ({ default: m.TripRemindersCard })));
const MapaTurismoCard = lazy(() => import("@/components/dashboard/start/MapaTurismoCard").then(m => ({ default: m.MapaTurismoCard })));
const AcademyCollapsibleCard = lazy(() => import("@/components/dashboard/AcademyCollapsibleCard").then(m => ({ default: m.AcademyCollapsibleCard })));
const MarketingCard = lazy(() => import("@/components/dashboard/MarketingCard").then(m => ({ default: m.MarketingCard })));
const ClientesCard = lazy(() => import("@/components/dashboard/ClientesCard").then(m => ({ default: m.ClientesCard })));
const FinanceiroCard = lazy(() => import("@/components/dashboard/FinanceiroCard").then(m => ({ default: m.FinanceiroCard })));
const SalesResourcesCard = lazy(() => import("@/components/dashboard/SalesResourcesCard").then(m => ({ default: m.SalesResourcesCard })));
const GuidesReferencesCard = lazy(() => import("@/components/dashboard/GuidesReferencesCard").then(m => ({ default: m.GuidesReferencesCard })));
const LeadsAwaitingCard = lazy(() => import("@/components/dashboard/LeadsAwaitingCard").then(m => ({ default: m.LeadsAwaitingCard })));


import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icon mapping for suppliers
const iconMap: Record<string, LucideIcon> = {
  plane: Plane,
  building: Building2,
  "credit-card": CreditCard,
  globe: Globe,
  hotel: Hotel,
  ship: Ship,
  car: Car,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useUserRole();
  const { plan } = useSubscription();
  const isTeamMember = useIsTeamMember();
  const isSimplifiedDashboard = shouldApplyPremiumFundadorFilter(isAdmin, plan);

  // Register daily login for gamification
  const { registerDailyLogin } = useGamification();
  React.useEffect(() => {
    registerDailyLogin();
  }, [registerDailyLogin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Fetch user profile for first name
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

  // Fetch suppliers from database
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        icon: iconMap[item.icon] || Globe,
        description: item.description,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = suppliersLoading;

  return (
    <DashboardLayout flushHorizontal>
      <DashboardContainer className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
        {/* Header with Welcome Message, Exchange Rate, Notifications, Profile & Logout */}
        <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between gap-3 lg:gap-2 xl:gap-3 min-w-0">
          {/* Welcome message + Online agents */}
          <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 lg:gap-2 min-w-0">
            <h1 className="font-display text-2xl lg:text-xl xl:text-3xl font-bold text-foreground whitespace-nowrap truncate min-w-0">
              {getGreeting()}, {firstName}!
            </h1>
            <OnlineAgentsStrip />
          </div>

          {/* Top bar with all header elements */}
          <div className="flex flex-nowrap items-center gap-2 lg:gap-1.5 xl:gap-3 shrink-0">
            <GamificationPill />
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            {/* 1. Banner Rotativo */}
            <DashboardBanner />

            {isTeamMember ? (
              <>
                {/* Minha Agenda & Próximas Viagens (apenas estas seções para subusuários) */}
                <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-2 lg:h-[max(60vh,560px)] lg:max-h-[820px]">
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><UpcomingAgendaEventsCard /></div>
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><TripRemindersCard /></div>
                </section>
              </>
            ) : isSimplifiedDashboard ? (
              <>
                {/* 2b. Leads aguardando atendimento */}
                <section className="order-2">
                  <LeadsAwaitingCard />
                </section>

                {/* Agenda & Próximas Viagens lado a lado; demais seções em largura total */}
                <section className="order-3 grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch lg:h-[max(60vh,560px)] lg:max-h-[820px]">
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><UpcomingAgendaEventsCard /></div>
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><TripRemindersCard /></div>
                </section>
                <section className="order-4 min-w-0"><CuratedNewsFeed /></section>
                <section className="order-5 min-w-0"><CommunitySocialFeed defaultExpanded /></section>
                <section className="order-6 min-w-0"><AcademyCollapsibleCard /></section>
                <section className="order-7 min-w-0"><MapaTurismoCard alwaysExpanded /></section>
              </>
            ) : (
              <>
                {/* 2. Minha Agenda & Próximas Viagens (única linha em duas colunas no desktop) */}
                <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-2 lg:h-[max(60vh,560px)] lg:max-h-[820px]">
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><UpcomingAgendaEventsCard /></div>
                  <div className="flex flex-col min-w-0 min-h-0 lg:h-full overflow-hidden [&>*]:h-full [&>*]:min-h-0"><TripRemindersCard /></div>
                </section>

                {/* 2b. Leads aguardando atendimento */}
                <section className="order-3">
                  <LeadsAwaitingCard />
                </section>

                {/* 3. Notícias do Trade — largura total */}
                <section className="order-4 min-w-0">
                  <CuratedNewsFeed />
                </section>

                {/* 3b. Comunidade — largura total */}
                <section className="order-5 min-w-0">
                  <CommunitySocialFeed />
                </section>

                {/* 3c. EducaTravel Academy — largura total */}
                <section className="order-6 min-w-0">
                  <AcademyCollapsibleCard />
                </section>

                {/* 3d. Mapa do Turismo — largura total */}
                <section className="order-7 min-w-0">
                  <MapaTurismoCard />
                </section>

                {/* 4. Clientes + Financeiro lado a lado */}
                <section className="order-8 grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
                  <div className="min-w-0"><ClientesCard /></div>
                  <div className="min-w-0"><FinanceiroCard /></div>
                </section>

                {/* 5b. Marketing + Ferramentas do Agente lado a lado (alturas independentes) */}
                <section className="order-9 grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
                  <div className="min-w-0"><MarketingCard /></div>
                  <div className="min-w-0"><AgentToolsCard /></div>
                </section>

                {/* 6. Recursos de Vendas + Guias e Referências lado a lado */}
                <section className="order-10 grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
                  <div className="min-w-0"><SalesResourcesCard /></div>
                  <div className="min-w-0"><GuidesReferencesCard /></div>
                </section>
              </>
            )}
          </Suspense>
        )}
      </DashboardContainer>
    </DashboardLayout>
  );
}