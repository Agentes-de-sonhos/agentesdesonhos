import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComingSoonOverlay } from "@/components/subscription/ComingSoonOverlay";
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
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliersWithSpecialties, useAllSpecialties } from "@/hooks/useSupplierSpecialties";
import { useSupplierLikes, useSupplierReviewStats } from "@/hooks/useSupplierLikes";
import { useSupplierReviews } from "@/hooks/useSupplierReviews";
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string; source: string } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { getLikeCount, hasLiked, toggleLike } = useSupplierLikes();
  const { data: reviewStatsMap = {} } = useSupplierReviewStats();

  // Review submission hook for the dialog target
  const { submitReview } = useSupplierReviews(reviewTarget?.id || "");

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

  const handleCategoryChange = (cat: string) => {
    const newCat = categoryFilter === cat ? "all" : cat;
    setCategoryFilter(newCat);
    updateUrlParams(newCat, selectedSpecialties);
  };

  const handleSpecialtiesChange = (specialties: string[]) => {
    setSelectedSpecialties(specialties);
    updateUrlParams(categoryFilter, specialties);
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategoryFilter(DEFAULT_CATEGORY);
    setSelectedSpecialties([]);
    setSearchParams({ categoria: DEFAULT_CATEGORY });
  };

  const { data: suppliers, isLoading } = useSuppliersWithSpecialties();
  const { data: dbSpecialties = [] } = useAllSpecialties();

  const { data: tourOperators, isLoading: loadingOperators } = useQuery({
    queryKey: ["tour-operators-listing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
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
    return [...fromSuppliers, ...fromOperators];
  }, [suppliers, tourOperators]);

  // Merge DB specialties + operator specialties for complete filter list
  const allSpecialties = useMemo(() => {
    const namesMap = new Map<string, string>(); // lowercased → original casing
    // Add from DB specialties table
    dbSpecialties.forEach((s) => {
      const key = s.name.trim().toLowerCase();
      if (key && !namesMap.has(key)) namesMap.set(key, s.name.trim());
    });
    // Add from supplier_specialties (already structured)
    (suppliers || []).forEach((sup: any) => {
      (sup.specialties || []).forEach((s: any) => {
        if (!s?.name) return;
        const key = s.name.trim().toLowerCase();
        if (key && !namesMap.has(key)) namesMap.set(key, s.name.trim());
      });
    });
    // Add from tour_operators CSV field
    (tourOperators || []).forEach((op: any) => {
      if (op.specialties) {
        op.specialties.split(",").forEach((s: string) => {
          const trimmed = s.trim();
          if (!trimmed) return;
          const key = trimmed.toLowerCase();
          if (!namesMap.has(key)) namesMap.set(key, trimmed);
        });
      }
    });
    return Array.from(namesMap.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [dbSpecialties, suppliers, tourOperators]);

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
          const matchesSpecialties =
            selectedSpecialties.length === 0 ||
            selectedSpecialties.some((specialtyName) =>
              item.specialties?.some(
                (s: Specialty) => s.name.toLowerCase() === specialtyName.toLowerCase()
              )
            );
          return matchesSearch && matchesCategory && matchesSpecialties;
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
        return avgB - avgA;
      }
      if (sortBy === "likes") {
        return getLikeCount(b.id, b._source) - getLikeCount(a.id, a._source);
      }
      return 0;
    });

    return results;
  }, [allItems, hasActiveFilter, search, categoryFilter, selectedSpecialties, sortBy, reviewStatsMap, getLikeCount]);

  const isLoadingAll = isLoading || loadingOperators;

  const handleOpenReview = (supplier: any) => {
    if (!user) {
      toast.error("Faça login para avaliar");
      return;
    }
    setReviewTarget({ id: supplier.id, name: supplier.name, source: supplier._source });
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = (data: { rating: number; comment?: string }) => {
    submitReview.mutate(data, {
      onSuccess: () => setReviewDialogOpen(false),
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
      <ComingSoonOverlay pageKey="mapa-turismo" />
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="mapa-turismo"
          title="Mapa do Turismo"
          subtitle="Encontre parceiros do trade turístico"
          icon={Globe}
          adminTab="trade-suppliers"
        />

        {/* Category grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3 justify-items-center">
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => handleCategoryChange(cat.category)}
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
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
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
                placeholder="Filtrar por especialidade..."
                searchPlaceholder="Buscar especialidade..."
                emptyMessage="Nenhuma especialidade encontrada."
                className="bg-card"
              />
            </div>
          )}
          {(search || selectedSpecialties.length > 0) && (
            <Button variant="ghost" size="sm" className="h-10 gap-1 shrink-0" onClick={clearAllFilters}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Sort + count bar */}
        {hasActiveFilter && filteredSuppliers.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredSuppliers.length}</span>{" "}
              fornecedor{filteredSuppliers.length !== 1 ? "es" : ""}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px] h-9 text-sm bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">Ordem alfabética</SelectItem>
                  <SelectItem value="rating">Melhor avaliadas</SelectItem>
                  <SelectItem value="likes">Mais curtidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum fornecedor encontrado para este filtro
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((supplier) => {
              const stats = reviewStatsMap[supplier.id];
              const avgRating = stats ? (stats.total / stats.count).toFixed(1) : null;
              const reviewCount = stats?.count || 0;
              const likeCount = getLikeCount(supplier.id, supplier._source);
              const liked = hasLiked(supplier.id, supplier._source);

              return (
                <Card
                  key={supplier.id}
                  className="group cursor-pointer shadow-card border-0 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  onClick={() =>
                    navigate(
                      supplier._source === "operator"
                        ? `/mapa-turismo/operadora/${supplier.id}`
                        : `/mapa-turismo/${supplier.id}`
                    )
                  }
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
                            <Badge variant="secondary" className="mt-1.5 text-xs">
                              {supplier.category}
                            </Badge>
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
                        {/* Rating */}
                        <div className="flex items-center gap-1.5 text-sm">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-foreground">{avgRating || "—"}</span>
                          <span className="text-muted-foreground text-xs">
                            ({reviewCount})
                          </span>
                        </div>

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

                        {/* Avaliar */}
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
        isSubmitting={submitReview.isPending}
      />
    </DashboardLayout>
  );
}
