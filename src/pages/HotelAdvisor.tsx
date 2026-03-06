import { useState } from "react";
import { Building2, SlidersHorizontal } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HotelSearchBar } from "@/components/hotels/HotelSearchBar";
import { HotelFiltersPanel } from "@/components/hotels/HotelFiltersPanel";
import { HotelCard } from "@/components/hotels/HotelCard";
import { useHotels, useHotelFilterOptions, HotelFilters } from "@/hooks/useHotels";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const defaultFilters: HotelFilters = {
  search: "",
  regions: [],
  categories: [],
  starRatings: [],
  brands: [],
  propertyTypes: [],
  amenities: [],
  tags: [],
  conditions: [],
  priceRange: null,
};

export default function HotelAdvisor() {
  const [filters, setFilters] = useState<HotelFilters>(defaultFilters);
  const { data: hotels, isLoading } = useHotels(filters);
  const { data: filterOptions } = useHotelFilterOptions();

  const regions = filterOptions?.regions || [];
  const brands = filterOptions?.brands || [];
  const destinations = filterOptions?.destinations || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Hotel Advisor
            </h1>
          </div>
          <p className="text-muted-foreground">
            Encontre o hotel ideal para seu cliente com filtros avançados e dados profissionais
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto">
          <HotelSearchBar
            value={filters.search}
            onChange={(search) => setFilters((f) => ({ ...f, search }))}
            destinations={destinations}
          />
        </div>

        {/* Content */}
        <div className="flex gap-6">
          {/* Filters - Desktop */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-4">
              <HotelFiltersPanel
                filters={filters}
                onChange={setFilters}
                regions={regions}
                brands={brands}
              />
            </div>
          </aside>

          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden fixed bottom-6 right-6 z-40 shadow-lg rounded-full h-12 w-12 p-0">
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <HotelFiltersPanel
                filters={filters}
                onChange={setFilters}
                regions={regions}
                brands={brands}
              />
            </SheetContent>
          </Sheet>

          {/* Results */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Buscando..." : `${hotels?.length || 0} hotéis encontrados`}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : hotels && hotels.length > 0 ? (
              <div className="space-y-3">
                {hotels.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted rounded-full p-6 mb-4">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum hotel encontrado</h3>
                <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                  {filters.search
                    ? `Não encontramos hotéis para "${filters.search}". Tente outra busca ou ajuste os filtros.`
                    : "Busque por um destino para começar ou aguarde a importação de hotéis."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
