import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplierReviewDialog } from "@/components/mapa-turismo/SupplierReviewDialog";
import {
  Building2,
  Search,
  Globe,
  ChevronRight,
  Loader2,
  Tag,
  Plane,
  Hotel,
  Car,
  Ship,
  Shield,
  Ticket,
  MapPin,
  Users,
  X,
  Star,
  ThumbsUp,
  ArrowUpDown,
  Anchor,
  Waves,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliersWithSpecialties } from "@/hooks/useSupplierSpecialties";
import { useSupplierLikes, useSupplierReviewStats } from "@/hooks/useSupplierLikes";
import { useSupplierReviews } from "@/hooks/useSupplierReviews";
import { useOperatorReviews } from "@/hooks/useOperatorReviews";
import { useTravelMeetSuppliers } from "@/hooks/useTravelMeetSuppliers";
import { useApprovedTourGuides } from "@/hooks/useTourGuides";
import { toast } from "sonner";

interface CategoryDef {
  title: string;
  icon: LucideIcon;
  category: string;
  color: string;
  activeColor: string;
  iconColor: string;
  link?: string;
}

const CATEGORIES_DATA: CategoryDef[] = [
  { title: "Operadoras", icon: Plane, category: "Operadoras de turismo", color: "bg-blue-100 text-blue-700", activeColor: "bg-blue-500 text-white", iconColor: "text-blue-500" },
  { title: "Consolidadoras", icon: Building2, category: "Consolidadoras", color: "bg-violet-100 text-violet-700", activeColor: "bg-violet-500 text-white", iconColor: "text-violet-500" },
  { title: "Cias Aéreas", icon: Plane, category: "Companhias aéreas", color: "bg-sky-100 text-sky-700", activeColor: "bg-sky-500 text-white", iconColor: "text-sky-500" },
  { title: "Hospedagem", icon: Hotel, category: "Hospedagem", color: "bg-amber-100 text-amber-700", activeColor: "bg-amber-500 text-white", iconColor: "text-amber-500" },
  { title: "Locadoras", icon: Car, category: "Locadoras de veículos", color: "bg-emerald-100 text-emerald-700", activeColor: "bg-emerald-500 text-white", iconColor: "text-emerald-500" },
  { title: "Cruzeiros", icon: Ship, category: "Cruzeiros", color: "bg-cyan-100 text-cyan-700", activeColor: "bg-cyan-500 text-white", iconColor: "text-cyan-500" },
  { title: "Seguros", icon: Shield, category: "Seguros viagem", color: "bg-rose-100 text-rose-700", activeColor: "bg-rose-500 text-white", iconColor: "text-rose-500" },
  { title: "Parques", icon: Ticket, category: "Parques e atrações", color: "bg-pink-100 text-pink-700", activeColor: "bg-pink-500 text-white", iconColor: "text-pink-500" },
  // Receptivos ocultados temporariamente do Mapa do Turismo (não excluído)
  // { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-100 text-orange-700", activeColor: "bg-orange-500 text-white", iconColor: "text-orange-500" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-100 text-teal-700", activeColor: "bg-teal-500 text-white", iconColor: "text-teal-500" },
];

const CATEGORY_NAMES = CATEGORIES_DATA.map((c) => c.category);
const DEFAULT_CATEGORY = "Operadoras de turismo";

interface Specialty {
  id: string;
  name: string;
}

type SortOption = "alpha" | "rating" | "likes";

export default function MapaTurismo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(DEFAULT_CATEGORY);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("alpha");
  const [hospQuickFilter, setHospQuickFilter] = useState<"resort" | "rede" | null>(null);
  const [cruiseQuickFilters, setCruiseQuickFilters] = useState<string[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string; source: string } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { getLikeCount, hasLiked, toggleLike } = useSupplierLikes();
  const { data: reviewStatsMap = {} } = useSupplierReviewStats();

  // Review submission hook for the dialog target
  const { submitReview: submitSupplierReview } = useSupplierReviews(reviewTarget?.source === "supplier" ? reviewTarget.id : "");
  const { submitReview: submitOperatorReview } = useOperatorReviews(reviewTarget?.source === "operator" ? reviewTarget.id : "");

  useEffect(() => {
    const categoria = searchParams.get("categoria");
    if (categoria && CATEGORY_NAMES.includes(categoria)) {
      setCategoryFilter(categoria);
    }
    const especialidade = searchParams.get("especialidade");
    if (especialidade) {
      setSelectedSpecialties(especialidade.split(","));
    }
  }, []);

  const updateUrlParams = (category: string, specialties: string[]) => {
    const params: Record<string, string> = {};
    if (category !== "all") params.categoria = category;
    if (specialties.length > 0) params.especialidade = specialties.join(",");
    setSearchParams(params);
  };

  const handleCategoryChange = (cat: CategoryDef) => {
    const newCat = categoryFilter === cat.category ? "all" : cat.category;
    setCategoryFilter(newCat);
    setSelectedSpecialties([]);
    setHospQuickFilter(null);
    setCruiseQuickFilters([]);
    updateUrlParams(newCat, []);
  };

  const handleSpecialtiesChange = (specialties: string[]) => {
    setSelectedSpecialties(specialties);
    updateUrlParams(categoryFilter, specialties);
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategoryFilter(DEFAULT_CATEGORY);
    setSelectedSpecialties([]);
    setHospQuickFilter(null);
    setCruiseQuickFilters([]);
    setSearchParams({ categoria: DEFAULT_CATEGORY });
  };

  const { data: suppliers, isLoading } = useSuppliersWithSpecialties();
  const { data: travelMeetSuppliers, isLoading: loadingTravelMeet } = useTravelMeetSuppliers();
  const { data: tourGuides, isLoading: loadingGuides } = useApprovedTourGuides();

  const { data: tourOperators, isLoading: loadingOperators } = useQuery({
    queryKey: ["tour-operators-listing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []).filter((op: any) => op.approval_status === "approved");
      return data;
    },
  });

  const { data: cruiseCompanies, isLoading: loadingCruises } = useQuery({
    queryKey: ["cruise-companies-listing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companhias_maritimas")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const allItems = useMemo(() => {
    const isFilled = (v: any) => {
      if (!v) return false;
      if (typeof v !== "string") return true;
      // remove whitespace e tags HTML básicas para detectar conteúdo real
      return v.replace(/<[^>]*>/g, "").trim().length > 0;
    };
    const fromSuppliers = (suppliers || []).map((s: any) => ({
      ...s,
      _source: "supplier" as const,
      website_url: s.website_url,
      instagram_url: s.instagram_url,
      _hasProfile: isFilled(s.commercial_contacts),
    }));
    const fromOperators = (tourOperators || []).map((op: any) => ({
      id: op.id,
      name: op.name,
      category: op.category || "Operadoras de turismo",
      logo_url: op.logo_url || null,
      website_url: op.website,
      instagram_url: op.instagram,
      sales_channel: op.sales_channels,
      specialties: op.specialties
        ? op.specialties.split(",").map((s: string, i: number) => ({ id: `op-${i}`, name: s.trim() }))
        : [],
      _source: "operator" as const,
      _hasProfile: isFilled(op.commercial_contacts),
    }));
    const fromCruises = (cruiseCompanies || []).map((cm: any) => {
      const specs: string[] = [];
      if (cm.tipo) specs.push(cm.tipo);
      if (cm.categoria) specs.push(cm.categoria);
      if (cm.subtipo) specs.push(cm.subtipo);
      return {
        id: cm.id,
        name: cm.nome,
        category: "Cruzeiros",
        logo_url: cm.logo_url || null,
        website_url: cm.website,
        instagram_url: null,
        sales_channel: cm.sales_channels,
        specialties: specs.map((s, i) => ({ id: `cruise-${i}`, name: s })),
        _source: "cruise" as const,
        _hasProfile: isFilled(cm.commercial_contacts),
      };
    });
    const fromTravelMeet = (travelMeetSuppliers || []).map((tm: any) => ({
      id: `tm-${tm.id}`,
      name: tm.name || tm.company_name || tm.brand_name || "Sem nome",
      category: tm.category || tm.business_category || "Operadoras de turismo",
      logo_url: tm.logo_url || null,
      website_url: tm.website || null,
      instagram_url: tm.instagram || null,
      sales_channel: null,
      specialties: (tm.specialties || []).map((s: string, i: number) => ({ id: `tm-${i}`, name: s })),
      _source: "travelmeet" as const,
      _hasProfile: false,
    }));
    const fromGuides = (tourGuides || []).map((g: any) => {
      const langSpecs = (g.languages || []).map((l: any, i: number) => ({ id: `g-lang-${i}`, name: l.code }));
      const otherSpecs = (g.specialties || []).map((s: string, i: number) => ({ id: `g-spec-${i}`, name: s }));
      return {
        id: g.id,
        name: g.professional_name || g.full_name,
        category: "Guias",
        logo_url: g.photo_url || null,
        website_url: g.website || null,
        instagram_url: g.instagram || null,
        sales_channel: null,
        specialties: [...langSpecs, ...otherSpecs],
        _source: "guide" as const,
        _hasProfile: isFilled(g.bio) || isFilled(g.about),
      };
    });
    return [...fromSuppliers, ...fromOperators, ...fromCruises, ...fromTravelMeet, ...fromGuides];
  }, [suppliers, tourOperators, cruiseCompanies, travelMeetSuppliers, tourGuides]);

  // Contextual specialties: only from items matching the active category
  const allSpecialties = useMemo(() => {
    const namesMap = new Map<string, string>();
    const itemsForCategory = categoryFilter === "all"
      ? allItems
      : allItems.filter((item) => item.category === categoryFilter);

    itemsForCategory.forEach((item: any) => {
      (item.specialties || []).forEach((s: any) => {
        if (!s?.name) return;
        const key = s.name.trim().toLowerCase();
        if (key && !namesMap.has(key)) namesMap.set(key, s.name.trim());
      });
    });
    return Array.from(namesMap.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [allItems, categoryFilter]);

  const specialtyOptions = allSpecialties.map((name) => ({
    value: name,
    label: name,
  }));

  const hasActiveFilter = categoryFilter !== "all" || search.length > 0 || selectedSpecialties.length > 0;

  const filteredSuppliers = useMemo(() => {
    let results = hasActiveFilter
      ? allItems.filter((item) => {
          const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
          const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
          const selectedLower = selectedSpecialties.map((s) => s.toLowerCase());
          const matchesSpecialties =
            selectedLower.length === 0 ||
            selectedLower.some((specLower) =>
              item.specialties?.some(
                (s: Specialty) => s.name.trim().toLowerCase() === specLower
              )
            );

          // Hospedagem quick filters
          let matchesQuickFilter = true;
          if (hospQuickFilter === "resort") {
            const nameOrSpecs = [item.name, ...(item.specialties || []).map((s: Specialty) => s.name)].join(" ").toLowerCase();
            matchesQuickFilter = nameOrSpecs.includes("resort");
          } else if (hospQuickFilter === "rede") {
            const nameOrSpecs = [item.name, ...(item.specialties || []).map((s: Specialty) => s.name)].join(" ").toLowerCase();
            matchesQuickFilter = nameOrSpecs.includes("rede hoteleira") || nameOrSpecs.includes("rede");
          }

          // Cruise quick filters
          let matchesCruiseFilter = true;
          if (cruiseQuickFilters.length > 0 && item.category === "Cruzeiros") {
            const specNames = (item.specialties || []).map((s: Specialty) => s.name.trim().toLowerCase());
            matchesCruiseFilter = cruiseQuickFilters.every((f) =>
              specNames.some((sn) => sn.includes(f.toLowerCase()))
            );
          } else if (cruiseQuickFilters.length > 0 && item.category !== "Cruzeiros") {
            matchesCruiseFilter = false;
          }

          return matchesSearch && matchesCategory && matchesSpecialties && matchesQuickFilter && matchesCruiseFilter;
        })
      : [];

    // Sort
    results = [...results].sort((a, b) => {
      // Prioridade 1: empresas com perfil preenchido vêm primeiro
      if (a._hasProfile !== b._hasProfile) {
        return a._hasProfile ? -1 : 1;
      }
      if (sortBy === "alpha") return a.name.localeCompare(b.name);
      if (sortBy === "rating") {
        const ra = reviewStatsMap[a.id];
        const rb = reviewStatsMap[b.id];
        const avgA = ra ? ra.total / ra.count : 0;
        const avgB = rb ? rb.total / rb.count : 0;
        if (avgB !== avgA) return avgB - avgA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "likes") {
        const diff = getLikeCount(b.id, b._source) - getLikeCount(a.id, a._source);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [allItems, hasActiveFilter, search, categoryFilter, selectedSpecialties, hospQuickFilter, cruiseQuickFilters, sortBy, reviewStatsMap, getLikeCount]);

  const isLoadingAll = isLoading || loadingOperators || loadingCruises || loadingTravelMeet || loadingGuides;

  const handleOpenReview = (supplier: any) => {
    if (!user) {
      toast.error("Faça login para avaliar");
      return;
    }
    setReviewTarget({ id: supplier.id, name: supplier.name, source: supplier._source });
    setReviewDialogOpen(true);
  };

  const queryClient = useQueryClient();
  const handleSubmitReview = (data: { rating: number; comment?: string }) => {
    const mutation = reviewTarget?.source === "operator" ? submitOperatorReview : submitSupplierReview;
    mutation.mutate(data, {
      onSuccess: () => {
        setReviewDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["supplier-review-stats-all"] });
      },
    });
  };

  const handleToggleLike = (e: React.MouseEvent, supplierId: string, source: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }
    toggleLike.mutate({ supplierId, source });
  };

  return (
    <DashboardLayout>
      
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="mapa-turismo"
          title="Mapa do Turismo"
          subtitle="Encontre parceiros do trade turístico"
          icon={Globe}
          adminTab="trade-suppliers"
        />

        {/* Category grid */}
        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))" }}
        >
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border",
                  isActive
                    ? `${cat.activeColor} shadow-lg ring-2 ring-offset-2 ring-offset-background ring-current scale-[1.02] border-transparent`
                    : `${cat.color} border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/50`
                )}
              >
                <Icon className={cn("h-6 w-6", isActive ? "text-white" : cat.iconColor)} />
                <span className="text-center leading-tight px-1">{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Filters row: search + specialties inline */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-card"
            />
          </div>
          {allSpecialties.length > 0 && (
            <div className="flex-1 min-w-0">
              <MultiSelect
                options={specialtyOptions}
                selected={selectedSpecialties}
                onChange={handleSpecialtiesChange}
                placeholder={categoryFilter !== "all" ? `Filtrar ${CATEGORIES_DATA.find(c => c.category === categoryFilter)?.title?.toLowerCase() || "empresas"} por especialidade...` : "Filtrar por especialidade..."}
                searchPlaceholder="Buscar especialidade..."
                emptyMessage="Nenhuma especialidade encontrada."
                className="bg-card"
              />
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px] h-10 text-sm bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Ordem alfabética</SelectItem>
                <SelectItem value="rating">Melhor avaliadas</SelectItem>
                <SelectItem value="likes">Mais curtidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(search || selectedSpecialties.length > 0) && (
            <Button variant="ghost" size="sm" className="h-10 gap-1 shrink-0" onClick={clearAllFilters}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Hospedagem quick filters */}
        {categoryFilter === "Hospedagem" && (
          <div className="flex items-center gap-3">
            <Button
              variant={hospQuickFilter === "resort" ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full px-5 gap-2 transition-all",
                hospQuickFilter === "resort"
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                  : "border-amber-300 text-amber-700 hover:bg-amber-50"
              )}
              onClick={() => setHospQuickFilter(hospQuickFilter === "resort" ? null : "resort")}
            >
              <Hotel className="h-4 w-4" />
              Resort Brasil
            </Button>
            <Button
              variant={hospQuickFilter === "rede" ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full px-5 gap-2 transition-all",
                hospQuickFilter === "rede"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                  : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              )}
              onClick={() => setHospQuickFilter(hospQuickFilter === "rede" ? null : "rede")}
            >
              <Building2 className="h-4 w-4" />
              Rede Hoteleira
            </Button>
          </div>
        )}

        {/* Cruzeiros quick filters */}
        {categoryFilter === "Cruzeiros" && (() => {
          const cruiseItems = allItems.filter((item) => item.category === "Cruzeiros");
          const getSpecCount = (keyword: string) =>
            cruiseItems.filter((item) =>
              (item.specialties || []).some((s: Specialty) => s.name.trim().toLowerCase().includes(keyword.toLowerCase()))
            ).length;

          const CRUISE_TIPO_FILTERS = [
            { label: "Oceânico", value: "Oceanico", icon: Anchor },
            { label: "Fluvial", value: "Fluvial", icon: Waves },
            { label: "Expedição", value: "Expedicao", icon: Compass },
          ];

          const CRUISE_CHAR_FILTERS = [
            "Luxo", "Premium", "Contemporaneo",
            "Navio Pequeno", "Navio Médio", "Navio Grande",
            "Boutique", "All Inclusive", "Iate", "Veleiro", "Temático",
          ];

          const toggleCruiseFilter = (val: string) => {
            setCruiseQuickFilters((prev) =>
              prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
            );
          };

          const visibleChars = CRUISE_CHAR_FILTERS.filter((f) => getSpecCount(f) > 0);

          return (
            <div className="space-y-3">
              {/* Tipo de navegação */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground mr-1">Tipo:</span>
                {CRUISE_TIPO_FILTERS.map((f) => {
                  const count = getSpecCount(f.value);
                  if (count === 0) return null;
                  const Icon = f.icon;
                  const isActive = cruiseQuickFilters.includes(f.value);
                  return (
                    <Button
                      key={f.value}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full px-4 gap-1.5 h-8 text-xs font-medium transition-all",
                        isActive
                          ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 shadow-sm"
                          : "border-border text-muted-foreground hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                      )}
                      onClick={() => toggleCruiseFilter(f.value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {f.label}
                      <span className={cn("text-[10px] ml-0.5", isActive ? "text-cyan-200" : "text-muted-foreground/60")}>
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Características */}
              {visibleChars.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Filtros:</span>
                  {visibleChars.map((f) => {
                    const isActive = cruiseQuickFilters.includes(f);
                    const count = getSpecCount(f);
                    return (
                      <button
                        key={f}
                        onClick={() => toggleCruiseFilter(f)}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {f === "Contemporaneo" ? "Contemporâneo" : f}
                        <span className={cn("text-[10px]", isActive ? "text-primary-foreground/70" : "text-muted-foreground/50")}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  {cruiseQuickFilters.length > 0 && (
                    <button
                      onClick={() => setCruiseQuickFilters([])}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" /> Limpar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {hasActiveFilter && filteredSuppliers.length > 0 && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
               <span className="font-semibold text-foreground">{filteredSuppliers.length}</span>{" "}
               empresa{filteredSuppliers.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Results */}
        {isLoadingAll ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasActiveFilter ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Selecione uma categoria acima para encontrar parceiros do trade turístico
            </p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            {categoryFilter === "receptivos" ? (
              <>
                <span className="text-4xl">😊</span>
                <p className="text-lg font-medium text-foreground">Estamos preparando ótimos receptivos para você</p>
                <p className="text-muted-foreground max-w-md">Em breve você encontrará parceiros incríveis por aqui. Enquanto isso, explore outras categorias!</p>
              </>
            ) : categoryFilter === "Guias" ? (
              <>
                <span className="text-4xl">👀</span>
                <p className="text-lg font-medium text-foreground">Ainda não temos guias cadastrados por aqui</p>
                <p className="text-muted-foreground max-w-md">Mas estamos trabalhando para trazer opções incríveis em breve!</p>
              </>
            ) : (
              <>
                <span className="text-4xl">😅</span>
                <p className="text-lg font-medium text-foreground">Ainda não encontramos resultados por aqui</p>
                <p className="text-muted-foreground max-w-md">Tente ajustar os filtros ou explorar outras categorias.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((supplier) => {
              const stats = reviewStatsMap[`${supplier._source}:${supplier.id}`];
              const avgRating = stats?.count ? (stats.total / stats.count).toFixed(1).replace(".", ",") : null;
              const reviewCount = stats?.count || 0;
              const likeCount = getLikeCount(supplier.id, supplier._source);
              const liked = hasLiked(supplier.id, supplier._source);
              const fullStars = stats?.count ? Math.round(stats.total / stats.count) : 0;

              return (
                <Card
                  key={`${supplier._source}-${supplier.id}`}
                  className="group cursor-pointer shadow-card border-0 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  onClick={() => {
                    if (supplier._source === "travelmeet") {
                      if (supplier.website_url) {
                        window.open(supplier.website_url, "_blank");
                      }
                      return;
                    }
                    navigate(
                      supplier._source === "cruise"
                        ? `/mapa-turismo/cruzeiros/${supplier.id}`
                        : supplier._source === "operator"
                        ? `/mapa-turismo/operadora/${supplier.id}`
                        : supplier._source === "guide"
                        ? `/mapa-turismo/guia/${supplier.id}`
                        : `/mapa-turismo/${supplier.id}`
                    );
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                        {supplier.logo_url ? (
                          <img src={supplier.logo_url} alt={supplier.name} className="h-full w-full object-contain p-1.5" />
                        ) : (
                          <Building2 className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate text-base">{supplier.name}</h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-xs">
                                {supplier.category}
                              </Badge>
                              {supplier._hasProfile && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-medium"
                                  title="Esta empresa possui perfil completo no Mapa do Turismo"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Perfil completo
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0 mt-0.5" />
                        </div>
                      </div>
                    </div>

                    {supplier.specialties && supplier.specialties.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {supplier.specialties.slice(0, 3).map((specialty: Specialty) => (
                          <Badge key={specialty.id} variant="outline" className="text-xs bg-primary/5 border-primary/20">
                            {specialty.name}
                          </Badge>
                        ))}
                        {supplier.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{supplier.specialties.length - 3}</Badge>
                        )}
                      </div>
                    )}

                    {/* Social interaction bar */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Rating — oculto para operadoras */}
                        {supplier._source !== "operator" ? (
                        <div className="flex items-center gap-1.5 text-sm min-w-0">
                          <span className="font-semibold text-foreground whitespace-nowrap">
                            {avgRating ?? "—"}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0" aria-label={`${reviewCount} avaliações`}>
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  index < fullStars ? "fill-current text-amber-400" : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {reviewCount} {reviewCount === 1 ? "avaliação" : "avaliações"}
                          </span>
                        </div>
                        ) : <div />}

                        {/* Likes */}
                        <button
                          onClick={(e) => handleToggleLike(e, supplier.id, supplier._source)}
                          className={cn(
                            "flex items-center gap-1 text-sm transition-colors rounded-full px-2 py-0.5",
                            liked
                              ? "text-primary font-semibold bg-primary/10"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                          )}
                        >
                          <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-primary")} />
                          <span>{likeCount}</span>
                        </button>

                        {/* Avaliar — oculto para operadoras */}
                        {supplier._source !== "operator" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReview(supplier);
                          }}
                        >
                          <Star className="h-3 w-3" />
                          Avaliar
                        </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <SupplierReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        supplierName={reviewTarget?.name || ""}
        onSubmit={handleSubmitReview}
          isSubmitting={submitSupplierReview.isPending || submitOperatorReview.isPending}
      />
    </DashboardLayout>
  );
}
