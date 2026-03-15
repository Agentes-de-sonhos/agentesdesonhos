import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2,
  Search,
  Globe,
  Instagram,
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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliersWithSpecialties, useAllSpecialties } from "@/hooks/useSupplierSpecialties";

interface CategoryDef {
  title: string;
  icon: LucideIcon;
  category: string;
  color: string;
}

const CATEGORIES_DATA: CategoryDef[] = [
  { title: "Operadoras de turismo", icon: Plane, category: "Operadoras de turismo", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
  { title: "Consolidadoras", icon: Building2, category: "Consolidadoras", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { title: "Companhias aéreas", icon: Plane, category: "Companhias aéreas", color: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20" },
  { title: "Hospedagem", icon: Hotel, category: "Hospedagem", color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" },
  { title: "Locadoras de veículos", icon: Car, category: "Locadoras de veículos", color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  { title: "Cruzeiros", icon: Ship, category: "Cruzeiros", color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20" },
  { title: "Seguros viagem", icon: Shield, category: "Seguros viagem", color: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
  { title: "Parques e atrações", icon: Ticket, category: "Parques e atrações", color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20" },
  { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20" },
];

const CATEGORY_NAMES = CATEGORIES_DATA.map((c) => c.category);

interface Specialty {
  id: string;
  name: string;
}

export default function MapaTurismo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const categoria = searchParams.get("categoria");
    if (categoria && CATEGORY_NAMES.includes(categoria)) {
      setCategoryFilter(categoria);
    }
    const especialidade = searchParams.get("especialidade");
    if (especialidade) {
      setSelectedSpecialties(especialidade.split(","));
    }
  }, [searchParams]);

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
    setCategoryFilter("all");
    setSelectedSpecialties([]);
    setSearchParams({});
  };

  const { data: suppliers, isLoading } = useSuppliersWithSpecialties();
  const { data: allSpecialties = [] } = useAllSpecialties();

  // Fetch tour operators
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

  // Merge trade_suppliers + tour_operators into a unified list
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
      logo_url: null,
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

  const specialtyOptions = allSpecialties.map((s) => ({
    value: s.name,
    label: s.name,
  }));

  const hasActiveFilter = categoryFilter !== "all" || search.length > 0 || selectedSpecialties.length > 0;

  const filteredSuppliers = hasActiveFilter
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

  const isLoadingAll = isLoading || loadingOperators;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Operadoras de turismo": "bg-blue-500/10 text-blue-600 border-blue-200",
      "Consolidadoras": "bg-purple-500/10 text-purple-600 border-purple-200",
      "Companhias aéreas": "bg-sky-500/10 text-sky-600 border-sky-200",
      "Hospedagem": "bg-amber-500/10 text-amber-600 border-amber-200",
      "Locadoras de veículos": "bg-green-500/10 text-green-600 border-green-200",
      "Cruzeiros": "bg-cyan-500/10 text-cyan-600 border-cyan-200",
      "Seguros viagem": "bg-red-500/10 text-red-600 border-red-200",
      "Parques e atrações": "bg-pink-500/10 text-pink-600 border-pink-200",
      "Receptivos": "bg-orange-500/10 text-orange-600 border-orange-200",
      "Guias": "bg-teal-500/10 text-teal-600 border-teal-200",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  const activeFiltersCount =
    (categoryFilter !== "all" ? 1 : 0) + selectedSpecialties.length + (search ? 1 : 0);

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

        {/* Category Icon Buttons - same as Dashboard */}
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {CATEGORIES_DATA.map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => handleCategoryChange(cat.category)}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1",
                  "shadow-card hover:shadow-card-hover",
                  cat.color,
                  isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-card-hover scale-[1.02]"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium leading-tight">{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros avançados
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={clearAllFilters}>
                <X className="h-3 w-3" />
                Limpar filtros
              </Button>
            )}
            {!filtersOpen && (
              <p className="text-sm text-muted-foreground ml-auto">
                <span className="font-medium text-foreground">{filteredSuppliers?.length || 0}</span> fornecedor{(filteredSuppliers?.length || 0) !== 1 ? "es" : ""}
              </p>
            )}
          </div>

          <CollapsibleContent className="mt-4">
            <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome da empresa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 h-11 bg-background/50"
                    />
                  </div>
                </div>

                {allSpecialties.length > 0 && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
                      <Tag className="h-4 w-4" />
                      Especialidades:
                    </div>
                    <MultiSelect
                      options={specialtyOptions}
                      selected={selectedSpecialties}
                      onChange={handleSpecialtiesChange}
                      placeholder="Filtrar por especialidade..."
                      searchPlaceholder="Buscar especialidade..."
                      emptyMessage="Nenhuma especialidade encontrada."
                      className="flex-1 bg-background/50"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredSuppliers?.length || 0}</span>{" "}
                    fornecedor{(filteredSuppliers?.length || 0) !== 1 ? "es" : ""} encontrado{(filteredSuppliers?.length || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasActiveFilter ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Selecione uma categoria acima para encontrar parceiros do trade turístico
            </p>
          </div>
        ) : filteredSuppliers?.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum fornecedor encontrado para este filtro
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers?.map((supplier) => (
              <Card
                key={supplier.id}
                className="group cursor-pointer shadow-card border-0 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                onClick={() => navigate(`/mapa-turismo/${supplier.id}`)}
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
                          <Badge variant="secondary" className={`mt-1.5 text-xs ${getCategoryColor(supplier.category)}`}>
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

                  {supplier.sales_channel && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{supplier.sales_channel}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
                    {supplier.website_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); window.open(supplier.website_url!, "_blank"); }}>
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    {supplier.instagram_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); window.open(supplier.instagram_url!, "_blank"); }}>
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">Ver detalhes →</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
