import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Route,
  FileText,
  MapPin,
  Calculator,
  Plane,
  Building2,
  CreditCard,
  Globe,
  Hotel,
  Ship,
  Car,
  Loader2,
  Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { NewsFeedCard } from "@/components/dashboard/NewsFeedCard";
import { ExternalLinksCard } from "@/components/dashboard/ExternalLinksCard";
import { TradeUpdatesCard } from "@/components/dashboard/TradeUpdatesCard";
import { SupplierCategoriesCard } from "@/components/dashboard/SupplierCategoriesCard";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { FlightBlocksSearchCard } from "@/components/dashboard/FlightBlocksSearchCard";
import { TripRemindersCard } from "@/components/dashboard/TripRemindersCard";
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
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Olá, Agente de Sonhos! 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            O que você deseja criar hoje?
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 1. News Feed & Trade Updates - TOP */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* News Feed */}
              <div>
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Principais Notícias do Dia
                </h2>
                {news && news.length > 0 ? (
                  <NewsFeedCard news={news} />
                ) : (
                  <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>Nenhuma notícia disponível</p>
                  </div>
                )}
              </div>

              {/* Trade Updates */}
              <div>
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Principais Novidades do Trade
                </h2>
                {tradeUpdates && tradeUpdates.length > 0 ? (
                  <TradeUpdatesCard updates={tradeUpdates} />
                ) : (
                  <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    <p>Nenhuma novidade do trade disponível</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Próximas Viagens e Lembretes */}
            <TripRemindersCard />

            {/* 3. Próximos Eventos & Buscar Bloqueios */}
            <div className="grid gap-6 lg:grid-cols-2">
              <UpcomingEventsCard />
              <FlightBlocksSearchCard />
            </div>

            {/* 4. Mapa do Turismo - Categories */}
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Mapa do Turismo
              </h2>
              <SupplierCategoriesCard />
            </section>

            {/* 5. Ferramentas IA */}
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Ferramentas IA
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <QuickActionCard
                  title="Gerar Orçamento"
                  description="Monte orçamentos profissionais"
                  icon={Calculator}
                  onClick={() => navigate("/ferramentas-ia/gerar-orcamento")}
                />
                <QuickActionCard
                  title="Trip Wallet"
                  description="Organize vouchers e documentos"
                  icon={Wallet}
                  onClick={() => navigate("/ferramentas-ia/trip-wallet")}
                />
              </div>
            </section>

            {/* External Links */}
            {suppliers && suppliers.length > 0 && (
              <ExternalLinksCard title="Atalhos Rápidos" links={suppliers} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
