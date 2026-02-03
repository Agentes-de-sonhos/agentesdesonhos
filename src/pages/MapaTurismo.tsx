import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Building2,
  Search,
  Globe,
  Instagram,
  ChevronRight,
  Loader2,
  Filter,
  Tag,
  MapPin,
} from "lucide-react";
import { useSuppliersWithSpecialties, useAllSpecialties } from "@/hooks/useSupplierSpecialties";

const CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
];

interface Specialty {
  id: string;
  name: string;
}

export default function MapaTurismo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const navigate = useNavigate();

  // Read category from URL on mount
  useEffect(() => {
    const categoria = searchParams.get("categoria");
    if (categoria && CATEGORIES.includes(categoria)) {
      setCategoryFilter(categoria);
    }
    
    const especialidade = searchParams.get("especialidade");
    if (especialidade) {
      setSelectedSpecialties(especialidade.split(","));
    }
  }, [searchParams]);

  // Update URL when filters change
  const updateUrlParams = (category: string, specialties: string[]) => {
    const params: Record<string, string> = {};
    if (category !== "all") {
      params.categoria = category;
    }
    if (specialties.length > 0) {
      params.especialidade = specialties.join(",");
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    updateUrlParams(value, selectedSpecialties);
  };

  const handleSpecialtiesChange = (specialties: string[]) => {
    setSelectedSpecialties(specialties);
    updateUrlParams(categoryFilter, specialties);
  };

  const handleCategoryChipClick = (cat: string) => {
    const newCategory = categoryFilter === cat ? "all" : cat;
    handleCategoryChange(newCategory);
  };

  const { data: suppliers, isLoading } = useSuppliersWithSpecialties();
  const { data: allSpecialties = [] } = useAllSpecialties();

  // Convert specialties to multi-select options
  const specialtyOptions = allSpecialties.map((s) => ({
    value: s.name,
    label: s.name,
  }));

  const filteredSuppliers = suppliers?.filter((supplier) => {
    const matchesSearch = supplier.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || supplier.category === categoryFilter;
    
    // Check specialty filter
    const matchesSpecialties =
      selectedSpecialties.length === 0 ||
      selectedSpecialties.some((specialtyName) =>
        supplier.specialties?.some(
          (s: Specialty) => s.name.toLowerCase() === specialtyName.toLowerCase()
        )
      );
    
    return matchesSearch && matchesCategory && matchesSpecialties;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Operadoras de turismo": "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20",
      "Consolidadoras": "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20",
      "Companhias aéreas": "bg-sky-500/10 text-sky-600 border-sky-200 hover:bg-sky-500/20",
      "Hospedagem": "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20",
      "Locadoras de veículos": "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20",
      "Cruzeiros": "bg-cyan-500/10 text-cyan-600 border-cyan-200 hover:bg-cyan-500/20",
      "Seguros viagem": "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20",
      "Parques e atrações": "bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20",
      "Receptivos": "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20",
      "Guias": "bg-teal-500/10 text-teal-600 border-teal-200 hover:bg-teal-500/20",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  const activeFiltersCount =
    (categoryFilter !== "all" ? 1 : 0) + selectedSpecialties.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <MapPin className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Diretório de Fornecedores
              </h1>
              <p className="text-muted-foreground">
                Encontre parceiros do trade turístico
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-5">
            {/* Primary Filters Row */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome da empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                />
              </div>

              {/* Category Dropdown */}
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full lg:w-[240px] h-11 bg-background/50">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Categoria" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specialties Filter */}
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

            {/* Categories Chips */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Categorias disponíveis
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={`cursor-pointer transition-all duration-200 px-3 py-1.5 text-xs font-medium ${getCategoryColor(cat)} ${
                      categoryFilter === cat
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    onClick={() => handleCategoryChipClick(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {filteredSuppliers?.length || 0}
                  </span>{" "}
                  fornecedor{filteredSuppliers?.length !== 1 ? "es" : ""} encontrado
                  {filteredSuppliers?.length !== 1 ? "s" : ""}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => {
                    setCategoryFilter("all");
                    setSelectedSpecialties([]);
                    setSearchParams({});
                  }}
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSuppliers?.length === 0 ? (
          <Card className="shadow-card border-0">
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">
                Nenhum fornecedor encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros de busca
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setSelectedSpecialties([]);
                  setSearchParams({});
                }}
              >
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
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
                    {/* Logo */}
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                      {supplier.logo_url ? (
                        <img
                          src={supplier.logo_url}
                          alt={supplier.name}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-base">
                            {supplier.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`mt-1.5 text-xs ${getCategoryColor(supplier.category)}`}
                          >
                            {supplier.category}
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  {supplier.specialties && supplier.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {supplier.specialties.slice(0, 3).map((specialty: Specialty) => (
                        <Badge
                          key={specialty.id}
                          variant="outline"
                          className="text-xs bg-primary/5 border-primary/20"
                        >
                          {specialty.name}
                        </Badge>
                      ))}
                      {supplier.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{supplier.specialties.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {supplier.sales_channel && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {supplier.sales_channel}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
                    {supplier.website_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(supplier.website_url!, "_blank");
                        }}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    {supplier.instagram_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(supplier.instagram_url!, "_blank");
                        }}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                      Ver detalhes →
                    </span>
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
