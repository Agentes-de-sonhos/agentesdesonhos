import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCruises, useRegioes, usePerfisCliente } from "@/hooks/useCruises";
import type { CruiseFilters, CompanhiaMaritima } from "@/types/cruises";
import {
  Ship, Search, X, Loader2, Globe, Anchor, Compass, ChevronRight,
  Building2, Waves, Sailboat, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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

export default function CruisesPage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCruises();
  const { data: regioes = [] } = useRegioes();
  const { data: perfis = [] } = usePerfisCliente();

  const [filters, setFilters] = useState<CruiseFilters>({
    search: "",
    tipo: "all",
    categoria: "all",
    regioes: [],
    perfis: [],
  });

  const toggleFilter = (key: "regioes" | "perfis", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", tipo: "all", categoria: "all", regioes: [], perfis: [] });
  };

  const hasActiveFilters =
    filters.search || filters.tipo !== "all" || filters.categoria !== "all" ||
    filters.regioes.length > 0 || filters.perfis.length > 0;

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (filters.search && !c.nome.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.tipo !== "all" && c.tipo !== filters.tipo) return false;
      if (filters.categoria !== "all" && c.categoria !== filters.categoria) return false;
      if (filters.regioes.length > 0 && !c.regioes.some((r) => filters.regioes.includes(r.id))) return false;
      if (filters.perfis.length > 0 && !c.perfis.some((p) => filters.perfis.includes(p.id))) return false;
      return true;
    });
  }, [companies, filters]);

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.tipo !== "all") {
    const label = TIPO_OPTIONS.find((t) => t.value === filters.tipo)?.label || filters.tipo;
    activeChips.push({ label: `Tipo: ${label}`, onRemove: () => setFilters((p) => ({ ...p, tipo: "all" })) });
  }
  if (filters.categoria !== "all") {
    const label = CATEGORIA_OPTIONS.find((c) => c.value === filters.categoria)?.label || filters.categoria;
    activeChips.push({ label: `Categoria: ${label}`, onRemove: () => setFilters((p) => ({ ...p, categoria: "all" })) });
  }
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/mapa-turismo")} className="gap-1 text-muted-foreground">
            ← Mapa do Turismo
          </Button>
        </div>

        <PageHeader
          pageKey="cruzeiros"
          title="Companhias Marítimas"
          subtitle="Explore companhias de cruzeiros oceânicos, fluviais e expedições"
          icon={Ship}
        />

        {/* Tipo buttons */}
        <div className="flex flex-wrap gap-2">
          {TIPO_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = filters.tipo === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilters((p) => ({ ...p, tipo: p.tipo === opt.value ? "all" : opt.value as any }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                    : "bg-card text-foreground border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Categoria pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIA_OPTIONS.map((opt) => {
            const isActive = filters.categoria === opt.value;
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
              </button>
            );
          })}
        </div>

        {/* Search + region/profile filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar companhia..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="pl-10 h-10 bg-card"
            />
          </div>

          {/* Region tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Regiões
            </p>
            <div className="flex flex-wrap gap-1.5">
              {regioes.map((r) => {
                const isActive = filters.regioes.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleFilter("regioes", r.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs transition-all border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {r.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Sailboat className="h-3 w-3" /> Perfil do viajante
            </p>
            <div className="flex flex-wrap gap-1.5">
              {perfis.map((p) => {
                const isActive = filters.perfis.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleFilter("perfis", p.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs transition-all border",
                      isActive
                        ? "bg-accent text-accent-foreground border-accent font-medium"
                        : "bg-card text-muted-foreground border-border hover:border-accent/40 hover:text-foreground"
                    )}
                  >
                    {p.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
        {hasActiveFilters && (
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
            {filtered.map((company) => (
              <CruiseCard key={company.id} company={company} onProfileClick={(id) => toggleFilter("perfis", id)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CruiseCard({ company, onProfileClick }: { company: CompanhiaMaritima; onProfileClick: (id: string) => void }) {
  const navigate = useNavigate();
  const isLuxo = company.categoria === "Luxo";
  const displayRegioes = company.regioes.slice(0, 3);
  const extraRegioes = company.regioes.length - 3;

  return (
    <Card
      className={cn(
        "group border-0 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 cursor-pointer",
        isLuxo
          ? "bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 dark:via-card dark:to-card ring-1 ring-amber-200/60 dark:ring-amber-800/40 shadow-[0_4px_24px_-4px_rgba(217,169,78,0.15)] hover:shadow-[0_12px_32px_-8px_rgba(217,169,78,0.25)]"
          : "bg-card/90 backdrop-blur-sm ring-1 ring-border/40 shadow-card hover:shadow-card-hover"
      )}
      onClick={() => navigate(`/mapa-turismo/cruzeiros/${company.id}`)}
    >
      {/* Luxury accent bar */}
      {isLuxo && (
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
      )}

      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className={cn(
            "h-14 w-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 transition-transform duration-300 group-hover:scale-105",
            isLuxo
              ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/60 dark:to-amber-950 ring-amber-200/50 dark:ring-amber-700/50"
              : "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950 dark:to-cyan-900 ring-border/50"
          )}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.nome} className="h-full w-full object-contain p-1.5" loading="lazy" decoding="async" />
            ) : (
              <Ship className={cn("h-7 w-7", isLuxo ? "text-amber-600 dark:text-amber-400" : "text-cyan-600 dark:text-cyan-400")} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate text-[15px] leading-tight">{company.nome}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
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
            </div>
          </div>
        </div>

        {/* Regions */}
        {displayRegioes.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {displayRegioes.map((r) => (
                <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                  {r.nome}
                </span>
              ))}
              {extraRegioes > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-muted-foreground/70">
                  +{extraRegioes}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Profile chips */}
        {company.perfis.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
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
        )}

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3.5 w-3.5" /> Visitar site
              </a>
            ) : (
              <span />
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1 font-medium",
                isLuxo ? "text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-950/50" : "text-primary"
              )}
              onClick={(e) => { e.stopPropagation(); navigate(`/mapa-turismo/cruzeiros/${company.id}`); }}
            >
              Ver mais <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
