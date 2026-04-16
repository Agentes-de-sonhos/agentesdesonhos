import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { PageHeader } from "@/components/layout/PageHeader";
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
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { GallerySection } from "@/components/materials/GallerySection";
import { SocialFeedSection } from "@/components/materials/SocialFeedSection";
import { GalleryModal } from "@/components/materials/GalleryModal";
import { MaterialsFilterSheet } from "@/components/materials/MaterialsFilterSheet";
import { useMaterials, type MaterialGallery } from "@/hooks/useMaterials";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedSupplier, setSelectedSupplier] = useState("Todos");
  const [selectedGallery, setSelectedGallery] = useState<MaterialGallery | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"gallery" | "social">("social");

  const { 
    materials, 
    suppliers, 
    isLoading, 
    filterMaterials, 
    groupIntoGalleries,
    groupGalleriesByPeriod, 
  } = useMaterials();

  // Apply URL filter param on mount
  useEffect(() => {
    const operadoraParam = searchParams.get("operadora");
    if (operadoraParam && suppliers.length > 0) {
      const match = suppliers.find(
        (s) => s.toLowerCase() === operadoraParam.toLowerCase()
      );
      if (match) {
        setSelectedSupplier(match);
      } else {
        setSelectedSupplier(operadoraParam);
      }
      // Clean URL param after applying
      searchParams.delete("operadora");
      setSearchParams(searchParams, { replace: true });
    }
  }, [suppliers, searchParams, setSearchParams]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filter materials first, then group into galleries
  const galleries = useMemo(() => {
    const filtered = filterMaterials(materials, debouncedSearch, selectedCategory, selectedType, selectedSupplier);
    return groupIntoGalleries(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, debouncedSearch, selectedCategory, selectedType, selectedSupplier]);

  // Group galleries
  const byPeriod = useMemo(() => groupGalleriesByPeriod(galleries), [galleries, groupGalleriesByPeriod]);

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

  const handleOpenGallery = (gallery: MaterialGallery) => {
    setSelectedGallery(gallery);
    setIsGalleryOpen(true);
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
    setSelectedGallery(null);
  };

  const hasContent = galleries && galleries.length > 0;

  return (
    <DashboardLayout>
      
      <div className="space-y-6">
        <PageHeader
          pageKey="materiais"
          title="Materiais de Divulgação"
          subtitle="Sua biblioteca de campanhas para vendas"
          icon={FolderOpen}
          adminTab="materials"
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* View mode toggle */}
            <div className="flex items-center gap-1 mt-2">
              <Button
                variant={viewMode === "social" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setViewMode("social")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Feed Social
              </Button>
              <Button
                variant={viewMode === "gallery" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setViewMode("gallery")}
              >
                <Rows3 className="h-3.5 w-3.5" /> Galeria
              </Button>
            </div>
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
            {viewMode === "social" ? (
              <>
                {byPeriod.today.length > 0 && (
                  <SocialFeedSection
                    title="Material de Hoje"
                    galleries={byPeriod.today}
                    icon={<Sparkles className="h-5 w-5 text-primary" />}
                  />
                )}
                {byPeriod.last7Days.length > 0 && (
                  <SocialFeedSection
                    title="Materiais dos Últimos 7 Dias"
                    galleries={byPeriod.last7Days}
                    icon={<Calendar className="h-5 w-5 text-primary" />}
                  />
                )}
              </>
            ) : (
              <>
                {byPeriod.today.length > 0 && (
                  <GallerySection 
                    title="Material de Hoje" 
                    galleries={byPeriod.today} 
                    variant="large"
                    icon={<Sparkles className="h-5 w-5 text-primary" />}
                    onOpen={handleOpenGallery}
                  />
                )}
                {byPeriod.last7Days.length > 0 && (
                  <GallerySection 
                    title="Materiais dos Últimos 7 Dias" 
                    galleries={byPeriod.last7Days}
                    icon={<Calendar className="h-5 w-5 text-primary" />}
                    onOpen={handleOpenGallery}
                  />
                )}
              </>
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

        {/* Gallery Modal */}
        <GalleryModal
          gallery={selectedGallery}
          isOpen={isGalleryOpen}
          onClose={handleCloseGallery}
        />
      </div>
    </DashboardLayout>
  );
}
