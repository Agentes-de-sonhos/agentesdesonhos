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
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { NewsFeedCard } from "@/components/dashboard/NewsFeedCard";
import { SupplierCategoriesCard } from "@/components/dashboard/SupplierCategoriesCard";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { UpcomingAgendaEventsCard } from "@/components/dashboard/UpcomingAgendaEventsCard";
import { ClientsManagementCard } from "@/components/dashboard/ClientsManagementCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { ExchangeRateCard } from "@/components/dashboard/ExchangeRateCard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";

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
        {/* Header with Exchange Rate and Notifications */}
        <div className="flex flex-col gap-3">
          {/* Top bar with exchange rate and notifications */}
          <div className="flex items-center justify-between">
            <ExchangeRateCard />
            <NotificationsDropdown />
          </div>
          
          {/* Welcome message */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Olá, Agente de Sonhos! 👋
          </h1>
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

            {/* 2. Principais Notícias (unified news) */}
            <section className="order-2">
              <SectionHeader title="Principais Notícias" color="news" />
              {news && news.length > 0 ? (
                <NewsFeedCard news={news} />
              ) : (
                <div className="rounded-xl border bg-card p-6 sm:p-8 text-center text-muted-foreground shadow-card">
                  <p>Nenhuma notícia disponível</p>
                </div>
              )}
            </section>

            {/* 3. Productivity Section - Gestão de Clientes & Agenda */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2 order-3">
              <div>
                <SectionHeader title="Gestão de Clientes" color="financial" />
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

            {/* 5. Próximos Eventos - BOTTOM */}
            <section className="order-5">
              <SectionHeader title="Próximos Eventos" color="events" />
              <UpcomingEventsCard />
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}