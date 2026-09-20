import React, { lazy, Suspense } from "react";
const FeedbackPopup = lazy(() => import("@/components/feedback/FeedbackPopup").then(m => ({ default: m.FeedbackPopup })));
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { Loader2, User, LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { usePermissions } from "@/hooks/usePermissions";

// Lazy load heavy dashboard cards to reduce initial bundle
const UpcomingAgendaEventsCard = lazy(() => import("@/components/dashboard/UpcomingAgendaEventsCard").then(m => ({ default: m.UpcomingAgendaEventsCard })));
const CommunitySocialFeed = lazy(() => import("@/components/dashboard/CommunitySocialFeed").then(m => ({ default: m.CommunitySocialFeed })));
const TripRemindersCard = lazy(() => import("@/components/dashboard/TripRemindersCard").then(m => ({ default: m.TripRemindersCard })));
import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { useOpenInternalWindow } from "@/workspace/useOpenInternalWindow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard() {
  const navigate = useNavigate();
  const openInternalWindow = useOpenInternalWindow();
  const { signOut, user } = useAuth();
  const { can } = usePermissions();

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

  return (
    <DashboardLayout flushHorizontal>
      <DashboardContainer className="space-y-4 sm:space-y-6 animate-fade-in overflow-x-hidden">
        <MobileTopBar />
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl lg:text-xl xl:text-3xl font-bold text-foreground whitespace-nowrap truncate min-w-0">
              {getGreeting()}, {firstName}!
            </h1>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap xl:justify-end">
            <DashboardQuickActions />
            <div className="hidden h-7 w-px bg-border sm:block" />
            <div className="flex flex-nowrap items-center gap-2">
              <ExchangeRateCard />
              <NotificationsDropdown />
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                    aria-label="Meu perfil"
                    onClick={() => openInternalWindow("/perfil", "Meu perfil")}
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
                    aria-label="Sair"
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

        <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
          <section className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-2" data-dashboard-section="agenda-trips">
            {can("agenda.view") && (
              <div className="flex h-full min-h-0 min-w-0 flex-col [&>*]:h-full [&>*]:min-h-0"><UpcomingAgendaEventsCard /></div>
            )}
            {(can("trips.view") || can("agenda.view")) && (
              <div className="flex h-full min-h-0 min-w-0 flex-col [&>*]:h-full [&>*]:min-h-0"><TripRemindersCard /></div>
            )}
          </section>
          {can("community.public.view") && (
            <section className="min-w-0" data-dashboard-section="community">
              <CommunitySocialFeed />
            </section>
          )}
        </Suspense>
      </DashboardContainer>
    </DashboardLayout>
  );
}