import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplierReviewDialog } from "@/components/mapa-turismo/SupplierReviewDialog";
import { DirectorySupplierCard } from "@/components/mapa-turismo/DirectorySupplierCard";
import {
  Building2,
  Search,
  Globe,
  Loader2,
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
  ArrowUpDown,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliersWithSpecialties } from "@/hooks/useSupplierSpecialties";
import { useSupplierLikes, useSupplierReviewStats } from "@/hooks/useSupplierLikes";
import { useSupplierReviews } from "@/hooks/useSupplierReviews";
import { useOperatorReviews } from "@/hooks/useOperatorReviews";
import { useTravelMeetSuppliers } from "@/hooks/useTravelMeetSuppliers";
import { useApprovedTourGuides } from "@/hooks/useTourGuides";
import { useDirectoryScrollRestore } from "@/hooks/useDirectoryReturn";
import {
  DIRECTORY_ROOT,
  captureDirectoryReturn,
  categoryFromDirectoryPath,
  categoryListingRoute,
  directoryServiceTitle,
  isSpecializedDirectoryCategory,
} from "@/lib/directoryNavigation";
import { BackToDirectoryHomeButton } from "@/components/mapa-turismo/BackToDirectoryHomeButton";
import { toast } from "sonner";

interface CategoryDef {
  title: string;
  icon: LucideIcon;
  category: string;
  color: string;
  activeColor: string;
  iconColor: string;
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
  { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-100 text-orange-700", activeColor: "bg-orange-500 text-white", iconColor: "text-orange-500" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-100 text-teal-700", activeColor: "bg-teal-500 text-white", iconColor: "text-teal-500" },
];

interface Specialty {
  id: string;
  name: string;
}

type SortOption = "alpha" | "rating" | "likes";

/**
 * Duas camadas:
 * 1. `/mapa-turismo` → home neutra (apenas seletor de serviços);
 * 2. `/mapa-turismo/<slug>` → listagem isolada do serviço.
 *
 * URLs antigas `?categoria=<categoria>` são redirecionadas (replace) para a rota
 * canônica, preservando os filtros relevantes da query.
 */
export default function MapaTurismo() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();

  const routeCategory = categoryFromDirectoryPath(pathname);
  if (routeCategory) {
    return <MapaTurismoListing key={routeCategory} category={routeCategory} />;
  }

  const rawCategoria = params.get("categoria");
  if (rawCategoria) {
    const target = categoryListingRoute(rawCategoria);
    if (!target) return <Navigate to={DIRECTORY_ROOT} replace />;
    const query = new URLSearchParams(params);
    query.delete("categoria");
    const search = query.toString();
    return <Navigate to={search ? `${target}?${search}` : target} replace />;
  }

  return <MapaTurismoHome />;
}

/** Home neutra: cabeçalho + seletor de serviços. Nada selecionado, sem listagem. */
function MapaTurismoHome() {
  const navigate = useNavigate();
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

        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))" }}
        >
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.category}
                onClick={() => navigate(categoryListingRoute(cat.category) ?? DIRECTORY_ROOT)}
                aria-label={`Explorar ${cat.title}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border border-transparent",
                  cat.color,
                  "hover:scale-[1.02] hover:shadow-md hover:border-border/50",
                )}
              >
                <Icon className={cn("h-6 w-6", cat.iconColor)} />
                <span className="text-center leading-tight px-1">{cat.title}</span>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">
          Selecione um serviço para explorar os parceiros
        </p>
      </div>
    </DashboardLayout>
  );
}

function MapaTurismoListing({ category }: { category: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParams = useRef(new URLSearchParams(searchParams)).current;
  const initialSort = initialParams.get("ordenar");
  const initialHosp = initialParams.get("hosp");
  const [search, setSearch] = useState(initialParams.get("q") || "");
  const categoryFilter = category;
  const serviceTitle = directoryServiceTitle(category) ?? category;
  const serviceDef = CATEGORIES_DATA.find((c) => c.category === category);
  const ServiceIcon = serviceDef?.icon ?? Globe;
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    initialParams.get("especialidade")?.split(",").filter(Boolean) || [],
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    initialSort === "rating" || initialSort === "likes" ? initialSort : "alpha",
  );
  const [hospQuickFilter, setHospQuickFilter] = useState<"resort" | "rede" | null>(
    initialHosp === "resort" || initialHosp === "rede" ? initialHosp : null,
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string; source: string } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { getLikeCount, hasLiked, toggleLike } = useSupplierLikes();
  const { data: reviewStatsMap = {} } = useSupplierReviewStats();

  // Review submission hook for the dialog target
  const { submitReview: submitSupplierReview } = useSupplierReviews(reviewTarget?.source === "supplier" ? reviewTarget.id : "");
  const { submitReview: submitOperatorReview } = useOperatorReviews(reviewTarget?.source === "operator" ? reviewTarget.id : "");

  // A URL reflete o contexto completo do diretório (categoria + filtros + busca +
  // ordenação), tornando refresh, link direto e histórico do navegador previsíveis.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedSpecialties.length > 0) params.especialidade = selectedSpecialties.join(",");
    if (search.trim()) params.q = search.trim();
    if (sortBy !== "alpha") params.ordenar = sortBy;
    if (hospQuickFilter) params.hosp = hospQuickFilter;
    const next = new URLSearchParams(params).toString();
    if (next !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedSpecialties, search, sortBy, hospQuickFilter, searchParams, setSearchParams]);

  // Restaura a rolagem quando o usuário volta de um perfil.
  useDirectoryScrollRestore(true);

  const handleSpecialtiesChange = (specialties: string[]) => {
    setSelectedSpecialties(specialties);
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedSpecialties([]);
    setHospQuickFilter(null);
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

  const allItems = useMemo(() => {
    const fromSuppliers = (suppliers || []).map((s: any) => ({
      ...s,
      _source: "supplier" as const,
      website_url: s.website_url,
      instagram_url: s.instagram_url,
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
    }));
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
      };
    });
    // Companhias marítimas vêm da fonte especializada (/mapa-turismo/cruzeiros).
    return [...fromSuppliers, ...fromOperators, ...fromTravelMeet, ...fromGuides].filter(
      (item: any) => !isSpecializedDirectoryCategory(item.category),
    );
  }, [suppliers, tourOperators, travelMeetSuppliers, tourGuides]);

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

          return matchesSearch && matchesCategory && matchesSpecialties && matchesQuickFilter;
        })
      : [];

    // Sort
    results = [...results].sort((a, b) => {
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
  }, [allItems, hasActiveFilter, search, categoryFilter, selectedSpecialties, hospQuickFilter, sortBy, reviewStatsMap, getLikeCount]);

  const isLoadingAll = isLoading || loadingOperators || loadingTravelMeet || loadingGuides;

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
        <div className="flex items-center gap-2">
          <BackToDirectoryHomeButton />
        </div>

        <PageHeader
          pageKey="mapa-turismo"
          title={serviceTitle}
          subtitle="Encontre parceiros do trade turístico"
          icon={ServiceIcon}
          adminTab="trade-suppliers"
        />

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

              const openProfile = () => {
                if (supplier._source === "travelmeet") {
                  if (supplier.website_url) window.open(supplier.website_url, "_blank");
                  return;
                }
                navigate(
                  supplier._source === "operator"
                    ? `/mapa-turismo/operadora/${supplier.id}`
                    : supplier._source === "guide"
                    ? `/mapa-turismo/guia/${supplier.id}`
                    : `/mapa-turismo/${supplier.id}`,
                  captureDirectoryReturn()
                );
              };

              const showRating = supplier._source !== "operator" && supplier._source !== "cruise";

              return (
                <DirectorySupplierCard
                  key={`${supplier._source}-${supplier.id}`}
                  name={supplier.name}
                  category={supplier.category}
                  logoUrl={supplier.logo_url}
                  specialties={supplier.specialties}
                  likeCount={likeCount}
                  liked={liked}
                  onLike={(e) => handleToggleLike(e, supplier.id, supplier._source)}
                  onOpen={openProfile}
                  tags={
                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5">
                      {supplier.category}
                    </Badge>
                  }
                >
                  {showRating && (
                    <div className="mt-3 flex items-center gap-1.5 text-sm min-w-0 flex-wrap">
                      <span className="font-semibold text-foreground whitespace-nowrap">{avgRating ?? "—"}</span>
                      <div className="flex items-center gap-0.5 shrink-0" aria-label={`${reviewCount} avaliações`}>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                        onClick={(e) => { e.stopPropagation(); handleOpenReview(supplier); }}
                      >
                        <Star className="h-3 w-3" />
                        Avaliar
                      </Button>
                    </div>
                  )}
                </DirectorySupplierCard>
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
