import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import { NewsFeedCard } from "@/components/dashboard/NewsFeedCard";
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
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Fetch news from database (unified news - trade + general)
  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
        date: formatDate(item.created_at),
        category: item.category,
      }));
    },
  });

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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays === 1) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const isLoading = newsLoading || suppliersLoading;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header with Welcome Message, Exchange Rate, Notifications, Profile & Logout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Welcome message */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Olá, Agente de Sonhos! 👋
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
                    className="h-9 w-9 rounded-full hover:bg-primary/10"
                    onClick={() => navigate("/perfil")}
                  >
                    <User className="h-5 w-5 text-muted-foreground" />
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
                    className="h-9 w-9 rounded-full hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
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
            {/* 1. Mapa do Turismo - TOP PRIORITY */}
            <section className="order-1">
              <SectionHeader title="Mapa do Turismo" color="map" />
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
                <SupplierCategoriesCard />
              </div>
            </section>

            {/* 2. Notícias e Próximas Viagens - lado a lado */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 order-2">
              <div>
                <SectionHeader title="Principais Notícias" color="news" />
                <CuratedNewsFeed />
                {/* Fallback to manual news if no curated news */}
                {news && news.length > 0 && (
                  <div className="mt-3">
                    <NewsFeedCard news={news} />
                  </div>
                )}
              </div>
              <div>
                <SectionHeader title="Próximas Viagens" color="reminders" />
                <TripRemindersCard />
              </div>
            </section>

            {/* 3. Productivity Section - Minha Meta & Agenda */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 order-3">
              <div>
                <SectionHeader title="Minha Meta" color="financial" />
                <ClientsManagementCard />
              </div>
              <div>
                <SectionHeader title="Minha Agenda" color="events" />
                <UpcomingAgendaEventsCard />
              </div>
            </section>

            {/* 4. Ferramentas IA - Roteiro and Conteúdo */}
            <section className="order-4">
              <SectionHeader title="Ferramentas IA" color="ai" />
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <QuickActionCard
                  title="Criar Roteiro"
                  description="Gere roteiros personalizados com IA"
                  icon={Route}
                  variant="primary"
                  onClick={() => navigate("/ferramentas-ia/criar-roteiro")}
                />
                <QuickActionCard
                  title="Criar Conteúdo"
                  description="Posts e descrições automatizados"
                  icon={FileText}
                  variant="accent"
                  onClick={() => navigate("/ferramentas-ia/criar-conteudo")}
                />
              </div>
            </section>

            {/* 5. Outras Ferramentas */}
            <section className="order-5">
              <SectionHeader title="Outras Ferramentas" color="tools" />
              <div className="grid gap-4 grid-cols-3">
                <QuickActionCard
                  title="Bloqueios Aéreos"
                  description="Voos promocionais"
                  icon={Plane}
                  variant="secondary"
                  onClick={() => navigate("/bloqueios-aereos")}
                />
                <QuickActionCard
                  title="Materiais"
                  description="Artes e divulgação"
                  icon={Image}
                  variant="secondary"
                  onClick={() => navigate("/materiais")}
                />
                <QuickActionCard
                  title="Educa Travel"
                  description="Academy e cursos"
                  icon={GraduationCap}
                  variant="secondary"
                  onClick={() => navigate("/educa-academy")}
                />
                <QuickActionCard
                  title="Bloco de Notas"
                  description="Anotações rápidas"
                  icon={StickyNote}
                  variant="secondary"
                  onClick={() => navigate("/bloco-notas")}
                />
                <QuickActionCard
                  title="Calculadora"
                  description="Cálculos e conversões"
                  icon={Calculator}
                  variant="secondary"
                  onClick={() => navigate("/calculadora")}
                />
                <QuickActionCard
                  title="Gestão de Clientes"
                  description="CRM e funil de vendas"
                  icon={Users}
                  variant="secondary"
                  onClick={() => navigate("/gestao-clientes")}
                />
                <QuickActionCard
                  title="Gerar Orçamento"
                  description="Propostas comerciais"
                  icon={FileText}
                  variant="secondary"
                  onClick={() => navigate("/ferramentas-ia/gerar-orcamento")}
                />
                <QuickActionCard
                  title="Carteira Digital"
                  description="Vouchers e documentos"
                  icon={Wallet}
                  variant="secondary"
                  onClick={() => navigate("/ferramentas-ia/trip-wallet")}
                />
                <QuickActionCard
                  title="Comunidade"
                  description="Networking e eventos"
                  icon={Heart}
                  variant="secondary"
                  onClick={() => navigate("/comunidade")}
                />
              </div>
            </section>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}