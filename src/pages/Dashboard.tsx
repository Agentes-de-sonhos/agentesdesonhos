import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Route,
  FileText,
  MapPin,
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
import { TradeUpdatesCard } from "@/components/dashboard/TradeUpdatesCard";
import { SupplierCategoriesCard } from "@/components/dashboard/SupplierCategoriesCard";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { FlightBlocksSearchCard } from "@/components/dashboard/FlightBlocksSearchCard";
import { TripRemindersCard } from "@/components/dashboard/TripRemindersCard";
import { FinancialSummaryCard } from "@/components/dashboard/FinancialSummaryCard";
import { UpcomingAgendaEventsCard } from "@/components/dashboard/UpcomingAgendaEventsCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";

// Icon mapping for suppliers
const iconMap: Record<string, LucideIcon> = {
  plane: Plane,
  building: Building2,
  "credit-card": CreditCard,
  globe: Globe,
  "map-pin": MapPin,
  hotel: Hotel,
  ship: Ship,
  car: Car,
};

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch news from database
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

  // Fetch trade updates from database
  const { data: tradeUpdates, isLoading: tradeLoading } = useQuery({
    queryKey: ["trade-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_updates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type as "novo" | "atualização" | "destaque",
        date: formatDate(item.created_at),
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

  const isLoading = newsLoading || tradeLoading || suppliersLoading;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div>
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
            {/* 1. News Feed & Trade Updates - TOP (stacked on mobile) */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <div className="order-1">
                <SectionHeader title="Principais Notícias do Dia" color="news" />
                {news && news.length > 0 ? (
                  <NewsFeedCard news={news} />
                ) : (
                  <div className="rounded-xl border bg-card p-6 sm:p-8 text-center text-muted-foreground shadow-card">
                    <p>Nenhuma notícia disponível</p>
                  </div>
                )}
              </div>

              <div className="order-2">
                <SectionHeader title="Principais Novidades do Trade" color="trade" />
                {tradeUpdates && tradeUpdates.length > 0 ? (
                  <TradeUpdatesCard updates={tradeUpdates} />
                ) : (
                  <div className="rounded-xl border bg-card p-6 sm:p-8 text-center text-muted-foreground shadow-card">
                    <p>Nenhuma novidade do trade disponível</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Productivity Section - Trips, Financial & Agenda (stacked on mobile) */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <div className="order-3">
                <SectionHeader title="Próximas Viagens" color="reminders" />
                <TripRemindersCard />
              </div>
              <div className="order-4">
                <SectionHeader title="Resumo Financeiro" color="financial" />
                <FinancialSummaryCard />
              </div>
              <div className="order-5">
                <SectionHeader title="Minha Agenda" color="events" />
                <UpcomingAgendaEventsCard />
              </div>
            </section>

            {/* 3. Mapa do Turismo (horizontal scroll on mobile) */}
            <section className="order-6">
              <SectionHeader title="Mapa do Turismo" color="map" />
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
                <SupplierCategoriesCard />
              </div>
            </section>

            {/* 4. Ferramentas IA - Only Roteiro and Conteúdo */}
            <section className="order-7">
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

            {/* 5. Próximos Eventos & Buscar Bloqueios - BOTTOM (stacked on mobile) */}
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              <div className="order-8">
                <SectionHeader title="Próximos Eventos" color="events" />
                <UpcomingEventsCard />
              </div>
              <div className="order-9">
                <SectionHeader title="Bloqueios Aéreos" color="flights" />
                <FlightBlocksSearchCard />
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
