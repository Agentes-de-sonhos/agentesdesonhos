import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  FolderOpen,
  Sparkles,
  Calendar,
  CalendarDays,
  CalendarRange,
  Archive,
  Building2,
  Layers,
} from "lucide-react";
import { MaterialsSection } from "@/components/materials/MaterialsSection";
import { MaterialsFilterSheet } from "@/components/materials/MaterialsFilterSheet";
import { useMaterials } from "@/hooks/useMaterials";

const CATEGORIES = [
  "Todas",
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

const MATERIAL_TYPES = ["Todos", "Lâmina", "PDF", "Imagem", "Vídeo"];

export default function Materiais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedSupplier, setSelectedSupplier] = useState("Todos");

  const { 
    materials, 
    suppliers, 
    isLoading, 
    filterMaterials, 
    groupByPeriod, 
    groupByCategory, 
    groupBySupplier 
  } = useMaterials();

  // Filter materials
  const filteredMaterials = useMemo(() => 
    filterMaterials(materials, searchTerm, selectedCategory, selectedType, selectedSupplier),
    [materials, searchTerm, selectedCategory, selectedType, selectedSupplier, filterMaterials]
  );

  // Group filtered materials
  const byPeriod = useMemo(() => groupByPeriod(filteredMaterials), [filteredMaterials, groupByPeriod]);
  const byCategory = useMemo(() => groupByCategory(filteredMaterials), [filteredMaterials, groupByCategory]);
  const bySupplier = useMemo(() => groupBySupplier(filteredMaterials), [filteredMaterials, groupBySupplier]);

  // Count active filters
  const activeFiltersCount = [
    searchTerm !== "",
    selectedCategory !== "Todas",
    selectedType !== "Todos",
    selectedSupplier !== "Todos",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Todas");
    setSelectedType("Todos");
    setSelectedSupplier("Todos");
  };

  const hasContent = filteredMaterials && filteredMaterials.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Materiais de Divulgação
            </h1>
            <p className="text-muted-foreground mt-1">
              Sua biblioteca de mídia para vendas
            </p>
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os fornecedores</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          {/* Mobile Filters */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <MaterialsFilterSheet
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedSupplier={selectedSupplier}
              onSupplierChange={setSelectedSupplier}
              suppliers={suppliers || []}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Busca: "{searchTerm}"
                <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedCategory !== "Todas" && (
              <Badge variant="secondary" className="gap-1">
                {selectedCategory}
                <button onClick={() => setSelectedCategory("Todas")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedType !== "Todos" && (
              <Badge variant="secondary" className="gap-1">
                {selectedType}
                <button onClick={() => setSelectedType("Todos")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedSupplier !== "Todos" && (
              <Badge variant="secondary" className="gap-1">
                {suppliers?.find(s => s.id === selectedSupplier)?.name || "Fornecedor"}
                <button onClick={() => setSelectedSupplier("Todos")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : hasContent ? (
          <div className="space-y-8">
            {/* Today's Materials */}
            {byPeriod.today.length > 0 && (
              <MaterialsSection 
                title="Novos de Hoje" 
                materials={byPeriod.today} 
                variant="large"
                icon={<Sparkles className="h-5 w-5 text-primary" />}
              />
            )}

            {/* This Week */}
            {byPeriod.thisWeek.length > 0 && (
              <MaterialsSection 
                title="Desta Semana" 
                materials={byPeriod.thisWeek}
                icon={<Calendar className="h-5 w-5 text-primary" />}
              />
            )}

            {/* This Month */}
            {byPeriod.thisMonth.length > 0 && (
              <MaterialsSection 
                title="Deste Mês" 
                materials={byPeriod.thisMonth}
                icon={<CalendarDays className="h-5 w-5 text-primary" />}
              />
            )}

            {/* By Category */}
            {Object.keys(byCategory).length > 0 && (
              <div className="space-y-6 pt-4 border-t">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Por Categoria
                </h2>
                {Object.entries(byCategory)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([category, categoryMaterials]) => (
                    <MaterialsSection 
                      key={category}
                      title={category} 
                      materials={categoryMaterials}
                    />
                  ))
                }
              </div>
            )}

            {/* By Supplier */}
            {Object.keys(bySupplier).length > 1 && (
              <div className="space-y-6 pt-4 border-t">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Por Fornecedor
                </h2>
                {Object.entries(bySupplier)
                  .filter(([name]) => name !== "Outros")
                  .sort(([, a], [, b]) => b.length - a.length)
                  .slice(0, 5)
                  .map(([supplierName, supplierMaterials]) => (
                    <MaterialsSection 
                      key={supplierName}
                      title={supplierName} 
                      materials={supplierMaterials}
                    />
                  ))
                }
              </div>
            )}

            {/* Older Materials */}
            {byPeriod.older.length > 0 && (
              <MaterialsSection 
                title="Materiais Anteriores" 
                materials={byPeriod.older}
                icon={<Archive className="h-5 w-5 text-muted-foreground" />}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Nenhum material encontrado</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              {activeFiltersCount > 0 
                ? "Tente ajustar os filtros para encontrar o que procura"
                : "Aguarde novos materiais serem publicados"
              }
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
