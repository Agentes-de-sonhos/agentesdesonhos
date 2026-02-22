import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Newspaper,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NoticiaHub {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  alerta_trade: boolean;
  nivel_alerta: string;
}

const CATEGORIAS_FILTER = [
  "Todas",
  "Destaques",
  "Alertas do Trade",
  "Aéreo",
  "Destinos",
  "Mercado",
  "Cruzeiros",
  "Turismo",
  "Eventos",
];

const PAGE_SIZE = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function NewsCardBadges({ item }: { item: NoticiaHub }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {item.alerta_trade && (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] uppercase tracking-wider font-bold">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Alerta do Trade
        </Badge>
      )}
      {item.tipo_exibicao === "destaque" && !item.alerta_trade && (
        <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase tracking-wider font-semibold">
          <Star className="h-3 w-3 mr-1" />
          Destaque
        </Badge>
      )}
      {item.status === "sugerido_ia" && (
        <Badge className="bg-accent text-accent-foreground border-0 text-[10px] uppercase tracking-wider font-semibold">
          <Sparkles className="h-3 w-3 mr-1" />
          Curadoria da IA
        </Badge>
      )}
      {item.status === "aprovado" && !item.alerta_trade && item.tipo_exibicao !== "destaque" && (
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
          Aprovado
        </Badge>
      )}
      <Badge variant="outline" className="text-[10px]">
        {item.categoria}
      </Badge>
    </div>
  );
}

function NewsCard({ item, size = "normal" }: { item: NoticiaHub; size?: "large" | "normal" }) {
  const isLarge = size === "large";

  return (
    <a
      href={item.url_original}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className={`border-0 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover ${item.alerta_trade ? "ring-1 ring-destructive/20 bg-destructive/[0.02]" : ""}`}>
        <CardContent className={isLarge ? "p-6" : "p-4"}>
          <NewsCardBadges item={item} />
          <h3 className={`font-display font-semibold text-foreground group-hover:text-primary transition-colors mt-2 leading-snug ${isLarge ? "text-lg" : "text-sm"}`}>
            {item.titulo_curto}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
            {item.resumo}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground font-medium">{item.fonte}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
            <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function Noticias() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [page, setPage] = useState(1);

  const { data: allNews, isLoading } = useQuery({
    queryKey: ["noticias-hub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .in("status", ["aprovado", "sugerido_ia"])
        .order("relevancia_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as NoticiaHub[];
    },
  });

  const alertas = useMemo(
    () => (allNews || []).filter((n) => n.alerta_trade && n.relevancia_score >= 9).slice(0, 3),
    [allNews]
  );

  const destaques = useMemo(
    () =>
      (allNews || [])
        .filter((n) => n.status === "aprovado" && n.tipo_exibicao === "destaque" && !n.alerta_trade)
        .slice(0, 3),
    [allNews]
  );

  const curadoriaIA = useMemo(
    () => (allNews || []).filter((n) => n.status === "sugerido_ia").slice(0, 10),
    [allNews]
  );

  // Filtered list for the main paginated section
  const filteredNews = useMemo(() => {
    if (!allNews) return [];
    let list = allNews;

    switch (activeFilter) {
      case "Destaques":
        list = allNews.filter((n) => n.tipo_exibicao === "destaque");
        break;
      case "Alertas do Trade":
        list = allNews.filter((n) => n.alerta_trade);
        break;
      case "Todas":
        break;
      default:
        list = allNews.filter((n) => n.categoria === activeFilter);
    }
    return list;
  }, [allNews, activeFilter]);

  const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE);
  const paginatedNews = filteredNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filter changes
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const showSections = activeFilter === "Todas";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
            <Newspaper className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Notícias do Trade
            </h1>
            <p className="text-muted-foreground">
              Curadoria inteligente para agentes de viagens
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS_FILTER.map((cat) => (
            <Button
              key={cat}
              variant={activeFilter === cat ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap text-xs rounded-full"
              onClick={() => handleFilterChange(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Alertas do Trade */}
            {showSections && alertas.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas do Trade
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {alertas.map((item) => (
                    <NewsCard key={item.id} item={item} size="large" />
                  ))}
                </div>
              </section>
            )}

            {/* Destaques da Curadoria */}
            {showSections && destaques.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Destaques da Curadoria
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {destaques.map((item) => (
                    <NewsCard key={item.id} item={item} size="large" />
                  ))}
                </div>
              </section>
            )}

            {/* Curadoria da IA */}
            {showSections && curadoriaIA.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent-foreground" />
                  Curadoria da IA
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {curadoriaIA.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* All / Filtered News */}
            {paginatedNews.length > 0 && (
              <section className="space-y-3">
                {!showSections && (
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {activeFilter}
                  </h2>
                )}
                {showSections && (
                  <h2 className="font-display text-lg font-bold text-foreground">
                    Todas as Notícias
                  </h2>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {paginatedNews.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Empty state */}
            {filteredNews.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notícia encontrada para "{activeFilter}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
