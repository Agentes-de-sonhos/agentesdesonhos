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
  TrendingUp,
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

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mercado": "bg-amber-100 text-amber-700 border-amber-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Turismo": "bg-teal-100 text-teal-700 border-teal-200",
  "Eventos": "bg-purple-100 text-purple-700 border-purple-200",
};

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

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colorClass}`}>
      {categoria}
    </span>
  );
}

function StatusBadge({ item }: { item: NoticiaHub }) {
  if (item.alerta_trade) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
        <AlertTriangle className="h-3 w-3" />
        Alerta do Trade
      </span>
    );
  }
  if (item.tipo_exibicao === "destaque") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
        <Star className="h-3 w-3" />
        Destaque
      </span>
    );
  }
  if (item.status === "sugerido_ia") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
        <Sparkles className="h-3 w-3" />
        Curadoria da IA
      </span>
    );
  }
  return null;
}

/* ── Hero Card (top feature) ─────────────────────────────── */
function HeroNewsCard({ item }: { item: NoticiaHub }) {
  return (
    <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="border-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <StatusBadge item={item} />
            <CategoryBadge categoria={item.categoria} />
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              Score {item.relevancia_score}/10
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
            {item.titulo_curto}
          </h2>
          <p className="text-base text-muted-foreground mt-3 leading-relaxed max-w-3xl">
            {item.resumo}
          </p>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/50">
            <span className="text-sm font-semibold text-foreground/70">{item.fonte}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{formatDate(item.data_publicacao)}</span>
            <ExternalLink className="h-4 w-4 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

/* ── Alert Card (horizontal, premium) ────────────────────── */
function AlertNewsCard({ item }: { item: NoticiaHub }) {
  return (
    <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-r from-orange-50 to-card ring-1 ring-orange-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusBadge item={item} />
            <CategoryBadge categoria={item.categoria} />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground group-hover:text-orange-600 transition-colors leading-snug">
            {item.titulo_curto}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {item.resumo}
          </p>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-orange-100">
            <span className="text-xs font-semibold text-foreground/70">{item.fonte}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
            <ExternalLink className="h-3.5 w-3.5 ml-auto text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

/* ── Standard Magazine Card ──────────────────────────────── */
function MagazineNewsCard({ item }: { item: NoticiaHub }) {
  return (
    <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group h-full">
      <Card className="border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusBadge item={item} />
            <CategoryBadge categoria={item.categoria} />
          </div>
          <h3 className="font-display text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug flex-grow">
            {item.titulo_curto}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {item.resumo}
          </p>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
            <span className="text-xs font-semibold text-foreground/70">{item.fonte}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
            <ExternalLink className="h-3.5 w-3.5 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

/* ── Section Header ──────────────────────────────────────── */
function SectionTitle({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
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

  // ── Deduplicated sections ──
  const alertas = useMemo(
    () => (allNews || []).filter((n) => n.alerta_trade).slice(0, 3),
    [allNews]
  );

  const alertaIds = useMemo(() => new Set(alertas.map((n) => n.id)), [alertas]);

  // Hero = highest-scoring non-alert
  const hero = useMemo(
    () => (allNews || []).find((n) => !alertaIds.has(n.id)),
    [allNews, alertaIds]
  );

  const heroAndAlertIds = useMemo(() => {
    const s = new Set(alertaIds);
    if (hero) s.add(hero.id);
    return s;
  }, [alertaIds, hero]);

  // Curadoria = remaining items, no duplicates
  const curadoria = useMemo(
    () => (allNews || []).filter((n) => !heroAndAlertIds.has(n.id)),
    [allNews, heroAndAlertIds]
  );

  // Filtered list for pagination (respects active filter)
  const filteredNews = useMemo(() => {
    if (!allNews) return [];
    switch (activeFilter) {
      case "Destaques":
        return allNews.filter((n) => n.tipo_exibicao === "destaque");
      case "Alertas do Trade":
        return allNews.filter((n) => n.alerta_trade);
      case "Todas":
        return allNews;
      default:
        return allNews.filter((n) => n.categoria === activeFilter);
    }
  }, [allNews, activeFilter]);

  const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE);
  const paginatedNews = filteredNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const showSections = activeFilter === "Todas";

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* ── Hero Header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Newspaper className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Notícias do Trade
              </h1>
              <p className="text-muted-foreground text-base mt-0.5">
                Curadoria inteligente para agentes de viagens
              </p>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mt-2">
          {CATEGORIAS_FILTER.map((cat) => (
            <Button
              key={cat}
              variant={activeFilter === cat ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap text-xs rounded-full px-4 ${
                activeFilter === cat ? "shadow-md shadow-primary/20" : ""
              }`}
              onClick={() => handleFilterChange(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando notícias...</p>
          </div>
        ) : (
          <>
            {showSections && (
              <>
                {/* ── Hero Feature ── */}
                {hero && (
                  <section>
                    <HeroNewsCard item={hero} />
                  </section>
                )}

                {/* ── Alertas do Trade ── */}
                {alertas.length > 0 && (
                  <section className="space-y-4">
                    <SectionTitle icon={AlertTriangle} title="Alertas do Trade" color="bg-orange-500" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {alertas.map((item) => (
                        <AlertNewsCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Curadoria Inteligente ── */}
                {curadoria.length > 0 && (
                  <section className="space-y-4">
                    <SectionTitle icon={Sparkles} title="Curadoria Inteligente" color="bg-violet-500" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      {curadoria.slice(0, 10).map((item) => (
                        <MagazineNewsCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── All remaining ── */}
                {curadoria.length > 10 && (
                  <section className="space-y-4">
                    <SectionTitle icon={Newspaper} title="Todas as Notícias" color="bg-primary" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      {curadoria.slice(10).map((item) => (
                        <MagazineNewsCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ── Filtered View ── */}
            {!showSections && paginatedNews.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">{activeFilter}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {paginatedNews.map((item) =>
                    item.alerta_trade ? (
                      <AlertNewsCard key={item.id} item={item} />
                    ) : (
                      <MagazineNewsCard key={item.id} item={item} />
                    )
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      {page} de {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* ── Empty state ── */}
            {filteredNews.length === 0 && (
              <div className="text-center py-24 text-muted-foreground">
                <Newspaper className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma notícia encontrada</p>
                <p className="text-sm mt-1">Tente outro filtro de categoria</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
