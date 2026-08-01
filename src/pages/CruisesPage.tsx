import { useState, useMemo, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BackToDirectoryHomeButton } from "@/components/mapa-turismo/BackToDirectoryHomeButton";
import { AdvancedFilters } from "@/components/mapa-turismo/AdvancedFilters";
import { resolveCruiseLogoUrl } from "@/components/mapa-turismo/CruiseCompanyLogo";
import { DirectorySupplierCard } from "@/components/mapa-turismo/DirectorySupplierCard";
import { CardReviewSummary } from "@/components/mapa-turismo/CardReviewSummary";
import { CommunityReviewDialog } from "@/components/mapa-turismo/CommunityReviewDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCruises, useRegioes, usePerfisCliente } from "@/hooks/useCruises";
import { useSupplierLikes } from "@/hooks/useSupplierLikes";
import { useSupplierReviewStatsMap } from "@/hooks/useCommunityReviews";
import { reviewTargetKey } from "@/lib/communityReviews";
import type { CruiseFilters, CompanhiaMaritima } from "@/types/cruises";
import {
  Ship, Search, X, Loader2, Anchor, Compass,
  Waves, MapPin, Users, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDirectoryScrollRestore } from "@/hooks/useDirectoryReturn";
import { captureDirectoryReturn } from "@/lib/directoryNavigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIPO_OPTIONS = [
  { value: "all", label: "Todos", icon: Ship },
  { value: "Oceanico", label: "Oceânico", icon: Anchor },
  { value: "Fluvial", label: "Fluvial", icon: Waves },
  { value: "Expedicao", label: "Expedição", icon: Compass },
] as const;

const CATEGORIA_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "Luxo", label: "Luxo" },
  { value: "Premium", label: "Premium" },
  { value: "Contemporaneo", label: "Contemporâneo" },
] as const;

const CATEGORIA_COLORS: Record<string, string> = {
  Luxo: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Premium: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Contemporaneo: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
};

const TIPO_COLORS: Record<string, string> = {
  Oceanico: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  Fluvial: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Expedicao: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

/** Predicado único de filtragem, reutilizado pela listagem e pelos contadores. */
function matchCruises(companies: CompanhiaMaritima[], filters: CruiseFilters) {
  return companies.filter((c) => {
    if (filters.search && !c.nome.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.tipo !== "all" && c.tipo !== filters.tipo) return false;
    if (filters.categoria !== "all" && c.categoria !== filters.categoria) return false;
    if (filters.subtipos.length > 0 && !(c.subtipo && filters.subtipos.includes(c.subtipo))) return false;
    if (filters.regioes.length > 0 && !c.regioes.some((r) => filters.regioes.includes(r.id))) return false;
    if (filters.perfis.length > 0 && !c.perfis.some((p) => filters.perfis.includes(p.id))) return false;
    return true;
  });
}

export default function CruisesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: companies = [], isLoading } = useCruises();
  const { data: regioes = [] } = useRegioes();
  const { data: perfis = [] } = usePerfisCliente();
  const { getLikeCount, hasLiked, toggleLike } = useSupplierLikes();
  const { data: reviewStatsMap = {} } = useSupplierReviewStatsMap();
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);

  const initialParams = useRef(new URLSearchParams(searchParams)).current;
  const [filters, setFilters] = useState<CruiseFilters>({
    search: initialParams.get("q") || "",
    tipo: (initialParams.get("tipo") as CruiseFilters["tipo"]) || "all",
    categoria: (initialParams.get("categoria") as CruiseFilters["categoria"]) || "all",
    subtipos: initialParams.get("porte")?.split(",").filter(Boolean) || [],
    regioes: initialParams.get("regioes")?.split(",").filter(Boolean) || [],
    perfis: initialParams.get("perfis")?.split(",").filter(Boolean) || [],
  });

  // Espelha os filtros de cruzeiros na URL, para que o retorno de um perfil
  // (e refresh/link direto) preserve tipo, posicionamento, região e perfil.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.search.trim()) params.q = filters.search.trim();
    if (filters.tipo !== "all") params.tipo = filters.tipo;
    if (filters.categoria !== "all") params.categoria = filters.categoria;
    if (filters.subtipos.length) params.porte = filters.subtipos.join(",");
    if (filters.regioes.length) params.regioes = filters.regioes.join(",");
    if (filters.perfis.length) params.perfis = filters.perfis.join(",");
    const next = new URLSearchParams(params).toString();
    if (next !== searchParams.toString()) setSearchParams(params, { replace: true });
  }, [filters, searchParams, setSearchParams]);

  useDirectoryScrollRestore(true);

  const toggleFilter = (key: "regioes" | "perfis" | "subtipos", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", tipo: "all", categoria: "all", subtipos: [], regioes: [], perfis: [] });
  };

  const hasActiveFilters =
    filters.search || filters.tipo !== "all" || filters.categoria !== "all" ||
    filters.subtipos.length > 0 || filters.regioes.length > 0 || filters.perfis.length > 0;

  // Porte / posicionamento chips derived from the cruise-specific `subtipo` values
  const subtipoOptions = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => { if (c.subtipo) set.add(c.subtipo); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [companies]);

  const filtered = useMemo(() => {
    return matchCruises(companies, filters);
  }, [companies, filters]);

  /**
   * Quantidade de companhias por opção, considerando os demais filtros ativos.
   * Alimenta os contadores exibidos em cada chip.
   */
  const countFor = (patch: Partial<CruiseFilters>) =>
    matchCruises(companies, { ...filters, ...patch }).length;

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.tipo !== "all") {
    const label = TIPO_OPTIONS.find((t) => t.value === filters.tipo)?.label || filters.tipo;
    activeChips.push({ label: `Tipo: ${label}`, onRemove: () => setFilters((p) => ({ ...p, tipo: "all" })) });
  }
  if (filters.categoria !== "all") {
    const label = CATEGORIA_OPTIONS.find((c) => c.value === filters.categoria)?.label || filters.categoria;
    activeChips.push({ label: `Posicionamento: ${label}`, onRemove: () => setFilters((p) => ({ ...p, categoria: "all" })) });
  }
  filters.subtipos.forEach((s) => {
    activeChips.push({ label: s, onRemove: () => toggleFilter("subtipos", s) });
  });
  filters.regioes.forEach((rId) => {
    const reg = regioes.find((r) => r.id === rId);
    if (reg) activeChips.push({
      label: reg.nome,
      onRemove: () => toggleFilter("regioes", rId),
    });
  });
  filters.perfis.forEach((pId) => {
    const prof = perfis.find((p) => p.id === pId);
    if (prof) activeChips.push({
      label: prof.nome,
      onRemove: () => toggleFilter("perfis", pId),
    });
  });

  const handleLike = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (!user) { toast.error("Faça login para curtir"); return; }
    toggleLike.mutate({ supplierId: companyId, source: "cruise" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <BackToDirectoryHomeButton />
        </div>

        <PageHeader
          pageKey="cruzeiros"
          title="Companhias Marítimas"
          subtitle="Explore companhias de cruzeiros oceânicos, fluviais e expedições"
          icon={Ship}
        />

        {/* Tipo de navegação + busca compacta na mesma linha */}
        <div
          data-testid="cruise-filters-row"
          className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-3 lg:gap-4"
        >
        <div
          data-testid="cruise-tipo-group"
          className="flex flex-nowrap gap-1.5 md:shrink-0 md:gap-2 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TIPO_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = filters.tipo === opt.value;
            const count = countFor({ tipo: opt.value as CruiseFilters["tipo"] });
            return (
              <button
                key={opt.value}
                onClick={() => setFilters((p) => ({ ...p, tipo: p.tipo === opt.value ? "all" : opt.value as any }))}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium transition-all md:gap-2 lg:px-4",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                    : "bg-card text-foreground border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
                <span className={cn("text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

          <div
            data-testid="cruise-search-wrapper"
            className="relative w-full md:min-w-[240px] md:flex-1 md:ml-auto xl:max-w-[420px]"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Buscar companhia marítima"
              placeholder="Buscar companhia marítima..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="pl-10 h-10 bg-card w-full"
            />
          </div>
        </div>

        {/* Barra única de filtros avançados (um painel compartilhado) */}
        <AdvancedFilters
          groups={[
            {
              id: "positioning",
              label: "Posicionamento",
              icon: Sparkles,
              activeCount: filters.categoria !== "all" ? 1 : 0,
              content: CATEGORIA_OPTIONS.map((opt) => {
              const isActive = filters.categoria === opt.value;
              const count = countFor({ categoria: opt.value as CruiseFilters["categoria"] });
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilters((p) => ({ ...p, categoria: p.categoria === opt.value ? "all" : opt.value as any }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                  <span className={cn("ml-1 text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                    {count}
                  </span>
                </button>
              );
              }),
            },
            {
              id: "regions",
              label: "Regiões",
              icon: MapPin,
              activeCount: filters.regioes.length,
              content: regioes.map((r) => {
                const isActive = filters.regioes.includes(r.id);
                const count = countFor({ regioes: [r.id] });
                if (count === 0 && !isActive) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleFilter("regioes", r.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs transition-all border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {r.nome}
                    <span className={cn("ml-1 text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground/50")}>
                      {count}
                    </span>
                  </button>
                );
              }),
            },
            ...(subtipoOptions.length > 0
              ? [{
                  id: "size",
                  label: "Porte e características",
                  icon: Ship,
                  activeCount: filters.subtipos.length,
                  content: subtipoOptions.map((s) => {
                  const isActive = filters.subtipos.includes(s);
                  const count = countFor({ subtipos: [s] });
                  if (count === 0 && !isActive) return null;
                  return (
                    <button
                      key={s}
                      onClick={() => toggleFilter("subtipos", s)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs transition-all border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {s}
                      <span className={cn("ml-1 text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground/50")}>
                        {count}
                      </span>
                    </button>
                  );
                  }),
                }]
              : []),
            {
              id: "traveler",
              label: "Perfil do viajante",
              icon: Users,
              activeCount: filters.perfis.length,
              content: perfis.map((p) => {
                const isActive = filters.perfis.includes(p.id);
                const count = countFor({ perfis: [p.id] });
                if (count === 0 && !isActive) return null;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleFilter("perfis", p.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs transition-all border",
                      isActive
                        ? "bg-accent text-accent-foreground border-accent font-medium shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-accent/40 hover:text-foreground"
                    )}
                  >
                    {p.nome}
                    <span className="ml-1 text-[10px] opacity-60">{count}</span>
                  </button>
                );
              }),
            },
          ]}
        />

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {chip.label}
                <button onClick={chip.onRemove} className="ml-1 hover:bg-muted rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          </div>
        )}

        {/* Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            companhia{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Ship className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? "Nenhuma companhia encontrada para esses filtros" : "Selecione filtros para encontrar companhias"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((company) => {
              const likeCount = getLikeCount(company.id, "cruise");
              const liked = hasLiked(company.id, "cruise");
              const stats = reviewStatsMap[reviewTargetKey("cruise", company.id)];

              return (
                <CruiseCard
                  key={company.id}
                  company={company}
                  onProfileClick={(id) => toggleFilter("perfis", id)}
                  likeCount={likeCount}
                  liked={liked}
                  onLike={(e) => handleLike(e, company.id)}
                  reviewAverage={stats?.average}
                  reviewCount={stats?.count}
                  onRate={() => {
                    if (!user) {
                      toast.error("Faça login para avaliar");
                      return;
                    }
                    setReviewTarget({ id: company.id, name: company.nome });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {reviewTarget && (
        <CommunityReviewDialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          supplierName={reviewTarget.name}
          supplierSource="cruise"
          supplierId={reviewTarget.id}
          surface="card"
        />
      )}
    </DashboardLayout>
  );
}

function CruiseCard({
  company,
  onProfileClick,
  likeCount,
  liked,
  onLike,
  reviewAverage,
  reviewCount,
  onRate,
}: {
  company: CompanhiaMaritima;
  onProfileClick: (id: string) => void;
  likeCount: number;
  liked: boolean;
  onLike: (e: React.MouseEvent) => void;
  reviewAverage?: number | null;
  reviewCount?: number | null;
  onRate: () => void;
}) {
  const navigate = useNavigate();
  const isLuxo = company.categoria === "Luxo";
  const openProfile = () => navigate(`/mapa-turismo/cruzeiros/${company.id}`, captureDirectoryReturn());

  return (
    <DirectorySupplierCard
      name={company.nome}
      category="Cruzeiros"
      logoUrl={resolveCruiseLogoUrl(company)}
      specialties={company.specialties}
      likeCount={likeCount}
      liked={liked}
      onLike={onLike}
      onOpen={openProfile}
      highlighted={isLuxo}
      rating={
        <CardReviewSummary average={reviewAverage} count={reviewCount} onClick={onRate} />
      }
      tags={
        <>
          <Badge variant="outline" className={cn(
                "text-[10px] font-semibold border px-2 py-0.5 uppercase tracking-wide",
                TIPO_COLORS[company.tipo] || ""
              )}>
                {company.tipo === "Expedicao" ? "Expedição" : company.tipo === "Oceanico" ? "Oceânico" : company.tipo}
              </Badge>
              <Badge variant="outline" className={cn(
                "text-[10px] font-semibold border px-2 py-0.5",
                isLuxo ? "bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700" : "",
                !isLuxo ? CATEGORIA_COLORS[company.categoria] || "" : ""
              )}>
                {isLuxo && <span className="mr-0.5">✦</span>}
                {company.categoria === "Contemporaneo" ? "Contemporâneo" : company.categoria}
              </Badge>
              {company.subtipo && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">{company.subtipo}</Badge>
              )}
        </>
      }
    >
        {/* Regions — todas visíveis */}
        {company.regioes.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {company.regioes.map((r) => (
                <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                  {r.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Profile chips */}
        {company.perfis.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="flex flex-wrap gap-1.5">
            {company.perfis.map((p) => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onProfileClick(p.id); }}
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer border",
                  "bg-primary/8 text-primary border-primary/15 hover:bg-primary/15 hover:border-primary/30 hover:scale-[1.03] active:scale-[0.98]"
                )}
              >
                {p.nome}
              </button>
            ))}
            </div>
          </div>
        )}
    </DirectorySupplierCard>
  );
}
