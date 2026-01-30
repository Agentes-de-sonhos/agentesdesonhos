import {
  Route,
  FileText,
  MapPin,
  Calculator,
  Plane,
  Building2,
  CreditCard,
  Globe,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { NewsFeedCard } from "@/components/dashboard/NewsFeedCard";
import { ExternalLinksCard } from "@/components/dashboard/ExternalLinksCard";
import { TradeUpdatesCard } from "@/components/dashboard/TradeUpdatesCard";

// Mock data
const newsItems = [
  {
    id: "1",
    title: "Temporada de cruzeiros 2025: Brasil deve receber 2 milhões de turistas",
    source: "Panrotas",
    url: "https://panrotas.com.br",
    date: "Há 2 horas",
    category: "Cruzeiros",
  },
  {
    id: "2",
    title: "Novos voos diretos para Europa a partir de São Paulo",
    source: "Mercado & Eventos",
    url: "https://mercadoeeventos.com.br",
    date: "Há 5 horas",
    category: "Aéreo",
  },
  {
    id: "3",
    title: "Embratur lança campanha internacional para atrair turistas",
    source: "Ministério do Turismo",
    url: "https://gov.br/turismo",
    date: "Ontem",
    category: "Institucional",
  },
];

const externalLinks = [
  {
    id: "1",
    title: "Amadeus",
    url: "https://amadeus.com",
    icon: Plane,
    description: "Sistema de reservas",
  },
  {
    id: "2",
    title: "Hotelbeds",
    url: "https://hotelbeds.com",
    icon: Building2,
    description: "Plataforma hoteleira",
  },
  {
    id: "3",
    title: "Omnibees",
    url: "https://omnibees.com",
    icon: CreditCard,
    description: "Motor de reservas",
  },
  {
    id: "4",
    title: "Panrotas",
    url: "https://panrotas.com.br",
    icon: Globe,
    description: "Portal de notícias",
  },
];

const tradeUpdates = [
  {
    id: "1",
    title: "Programa de fidelidade renovado",
    description: "Principais operadoras anunciam benefícios exclusivos para agentes de viagens cadastrados.",
    type: "novo" as const,
    date: "30 Jan 2025",
  },
  {
    id: "2",
    title: "Capacitação em destinos europeus",
    description: "Nova plataforma de treinamento online disponível com certificações gratuitas.",
    type: "destaque" as const,
    date: "29 Jan 2025",
  },
  {
    id: "3",
    title: "Atualização de comissões",
    description: "Confira as novas tabelas de comissionamento das principais operadoras.",
    type: "atualização" as const,
    date: "28 Jan 2025",
  },
];

const Index = () => {
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

        {/* Quick Actions */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Ações Rápidas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="Criar Roteiro"
              description="Gere roteiros personalizados com IA"
              icon={Route}
              variant="primary"
            />
            <QuickActionCard
              title="Criar Conteúdo"
              description="Posts e descrições automatizados"
              icon={FileText}
              variant="accent"
            />
            <QuickActionCard
              title="Especialista em Destinos"
              description="Consulte informações detalhadas"
              icon={MapPin}
            />
            <QuickActionCard
              title="Converter Orçamento"
              description="Transforme pedidos em propostas"
              icon={Calculator}
            />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* News Feed */}
          <NewsFeedCard title="Feed de Notícias" news={newsItems} />

          {/* Trade Updates */}
          <TradeUpdatesCard updates={tradeUpdates} />
        </div>

        {/* External Links */}
        <ExternalLinksCard title="Atalhos Rápidos" links={externalLinks} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
