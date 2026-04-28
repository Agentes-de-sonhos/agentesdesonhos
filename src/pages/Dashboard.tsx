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
import { OnlineAgentsStrip } from "@/components/community-chat/OnlineAgentsStrip";

// Lazy load heavy dashboard cards to reduce initial bundle
const CuratedNewsFeed = lazy(() => import("@/components/dashboard/CuratedNewsFeed").then(m => ({ default: m.CuratedNewsFeed })));
const UpcomingAgendaEventsCard = lazy(() => import("@/components/dashboard/UpcomingAgendaEventsCard").then(m => ({ default: m.UpcomingAgendaEventsCard })));
const ClientsManagementCard = lazy(() => import("@/components/dashboard/ClientsManagementCard").then(m => ({ default: m.ClientsManagementCard })));
const CommunityQACard = lazy(() => import("@/components/dashboard/CommunityQACard").then(m => ({ default: m.CommunityQACard })));
const AgentToolsCard = lazy(() => import("@/components/dashboard/AgentToolsCard").then(m => ({ default: m.AgentToolsCard })));
const DashboardBanner = lazy(() => import("@/components/dashboard/DashboardBanner").then(m => ({ default: m.DashboardBanner })));
const TripRemindersCard = lazy(() => import("@/components/dashboard/TripRemindersCard").then(m => ({ default: m.TripRemindersCard })));
const MapaTurismoCard = lazy(() => import("@/components/dashboard/start/MapaTurismoCard").then(m => ({ default: m.MapaTurismoCard })));
const AcademyCollapsibleCard = lazy(() => import("@/components/dashboard/AcademyCollapsibleCard").then(m => ({ default: m.AcademyCollapsibleCard })));
const MarketingCard = lazy(() => import("@/components/dashboard/MarketingCard").then(m => ({ default: m.MarketingCard })));


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
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in min-w-0 overflow-x-hidden">
        {/* Header with Welcome Message, Exchange Rate, Notifications, Profile & Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Welcome message + Online agents */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {getGreeting()}, {firstName}!
            </h1>
            <OnlineAgentsStrip />
          </div>
          
          {/* Top bar with all header elements */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* 2. Minha Agenda & Próximas Viagens */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-2">
              <div className="flex flex-col flex-1 min-w-0 [&>*]:h-full"><UpcomingAgendaEventsCard /></div>
              <div className="flex flex-col flex-1 min-w-0 [&>*]:h-full"><TripRemindersCard /></div>
            </section>

            {/* 3. Radar do Turismo & EducaTravel Academy */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-3">
              <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><CuratedNewsFeed /></div>
              <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><AcademyCollapsibleCard /></div>
            </section>

            {/* 3b. Perguntas da Comunidade & Minha Meta */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-[3.5]">
              <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><CommunityQACard /></div>
              <div className="flex flex-col min-w-0 h-full [&>*]:h-full"><ClientsManagementCard /></div>
            </section>

            {/* 5. Mapa do Turismo */}
            <section className="order-5">
              <MapaTurismoCard />
            </section>

            {/* 5b. Marketing + Ferramentas do Agente lado a lado (alturas independentes) */}
            <section className="order-[5.5] grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
              <div className="min-w-0"><MarketingCard /></div>
              <div className="min-w-0"><AgentToolsCard /></div>
            </section>
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}