import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import {
  Route,
  FileText,
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
  StickyNote,
  Calculator,
  Users,
  Wallet,
  Heart,
  GraduationCap,
  Image,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

import { CuratedNewsFeed } from "@/components/dashboard/CuratedNewsFeed";
import { SupplierCategoriesCard } from "@/components/dashboard/SupplierCategoriesCard";
import { UpcomingAgendaEventsCard } from "@/components/dashboard/UpcomingAgendaEventsCard";
import { ClientsManagementCard } from "@/components/dashboard/ClientsManagementCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { TripRemindersCard } from "@/components/dashboard/TripRemindersCard";
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
  });

  const isLoading = suppliersLoading;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header with Welcome Message, Exchange Rate, Notifications, Profile & Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Welcome message */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {getGreeting()}, {firstName}!
          </h1>
          
          {/* Top bar with all header elements */}
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
          <>

            {/* 2. Notícias e Minha Agenda - lado a lado */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-2">
              <div className="flex flex-col">
                <SectionHeader title="Principais Notícias" color="news" />
                <div className="flex-1 [&>*]:h-full"><CuratedNewsFeed /></div>
              </div>
              <div className="flex flex-col">
                <SectionHeader title="Minha Agenda" color="events" />
                <div className="flex-1 [&>*]:h-full"><UpcomingAgendaEventsCard /></div>
              </div>
            </section>

            {/* 3. Minha Meta & Próximas Viagens */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch order-3">
              <div className="flex flex-col">
                <SectionHeader title="Minha Meta" color="financial" />
                <div className="flex-1 [&>*]:h-full"><ClientsManagementCard /></div>
              </div>
              <div className="flex flex-col">
                <SectionHeader title="Próximas Viagens" color="reminders" />
                <div className="flex-1 [&>*]:h-full"><TripRemindersCard /></div>
              </div>
            </section>


          </>
        )}
      </div>
    </DashboardLayout>
  );
}