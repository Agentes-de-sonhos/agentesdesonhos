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
import {
  Building2,
  Search,
  Globe,
  Instagram,
  ChevronRight,
  Loader2,
  Filter,
  Tag,
  X,
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

  const handleSpecialtyToggle = (specialtyName: string) => {
    const newSpecialties = selectedSpecialties.includes(specialtyName)
      ? selectedSpecialties.filter((s) => s !== specialtyName)
      : [...selectedSpecialties, specialtyName];
    setSelectedSpecialties(newSpecialties);
    updateUrlParams(categoryFilter, newSpecialties);
  };

  const clearSpecialties = () => {
    setSelectedSpecialties([]);
    updateUrlParams(categoryFilter, []);
  };

  const { data: suppliers, isLoading } = useSuppliersWithSpecialties();
  const { data: allSpecialties = [] } = useAllSpecialties();

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
      "Operadoras de turismo": "bg-blue-500/10 text-blue-600",
      "Consolidadoras": "bg-purple-500/10 text-purple-600",
      "Companhias aéreas": "bg-sky-500/10 text-sky-600",
      "Hospedagem": "bg-amber-500/10 text-amber-600",
      "Locadoras de veículos": "bg-green-500/10 text-green-600",
      "Cruzeiros": "bg-cyan-500/10 text-cyan-600",
      "Seguros viagem": "bg-red-500/10 text-red-600",
      "Parques e atrações": "bg-pink-500/10 text-pink-600",
      "Receptivos": "bg-orange-500/10 text-orange-600",
      "Guias": "bg-teal-500/10 text-teal-600",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
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

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome da empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar categoria" />
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

            {/* Specialty Filter */}
            {allSpecialties.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Tag className="h-4 w-4" />
                    Filtrar por especialidade
                  </div>
                  {selectedSpecialties.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSpecialties}
                      className="h-7 text-xs"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSpecialties.map((specialty) => (
                    <Badge
                      key={specialty.id}
                      variant={
                        selectedSpecialties.includes(specialty.name)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => handleSpecialtyToggle(specialty.name)}
                    >
                      {specialty.name}
                    </Badge>
                  ))}
                </div>
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
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhum fornecedor encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros de busca
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers?.map((supplier) => (
              <Card
                key={supplier.id}
                className="group cursor-pointer shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                onClick={() => navigate(`/mapa-turismo/${supplier.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {supplier.logo_url ? (
                        <img
                          src={supplier.logo_url}
                          alt={supplier.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {supplier.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`mt-1 text-xs ${getCategoryColor(supplier.category)}`}
                          >
                            {supplier.category}
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  {supplier.specialties && supplier.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {supplier.specialties.slice(0, 3).map((specialty: Specialty) => (
                        <Badge
                          key={specialty.id}
                          variant="outline"
                          className="text-xs bg-primary/5"
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

                  <div className="mt-4 flex items-center gap-2">
                    {supplier.website_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(supplier.instagram_url!, "_blank");
                        }}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Category Legend */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Categorias disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className={`cursor-pointer transition-opacity hover:opacity-80 ${getCategoryColor(cat)} ${
                    categoryFilter === cat ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    handleCategoryChange(categoryFilter === cat ? "all" : cat)
                  }
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
