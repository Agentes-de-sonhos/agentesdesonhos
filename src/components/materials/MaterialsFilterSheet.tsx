import { useState } from "react";
import { Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const MATERIAL_TYPES = ["Lâmina", "PDF", "Imagem", "Vídeo"];

interface Supplier {
  id: string;
  name: string;
}

interface MaterialsFilterSheetProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedSupplier: string;
  onSupplierChange: (value: string) => void;
  suppliers: Supplier[];
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export function MaterialsFilterSheet({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  selectedSupplier,
  onSupplierChange,
  suppliers,
  activeFiltersCount,
  onClearFilters,
}: MaterialsFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </SheetTitle>
          <SheetDescription>
            Filtre os materiais por categoria, tipo ou fornecedor
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Título ou destino..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fornecedor</label>
            <Select value={selectedSupplier} onValueChange={onSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os fornecedores" />
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
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as categorias</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Material</label>
            <Select value={selectedType} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os tipos</SelectItem>
                {MATERIAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => {
                onClearFilters();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              Limpar todos os filtros
            </Button>
          )}

          {/* Apply */}
          <Button 
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
