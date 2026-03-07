import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdvisorSearchBar } from "./AdvisorSearchBar";
import { AdvisorFiltersPanel } from "./AdvisorFiltersPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AdvisorPageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  headerIcon: React.ReactNode;
  searchPlaceholder?: string;
  filters: Record<string, any>;
  onFiltersChange: (filters: any) => void;
  filterSections: any[];
  destinations: string[];
  items: any[] | undefined;
  isLoading: boolean;
  renderCard: (item: any) => React.ReactNode;
  emptyIcon: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function AdvisorPage({
  title,
  subtitle,
  icon,
  headerIcon,
  searchPlaceholder,
  filters,
  onFiltersChange,
  filterSections,
  destinations,
  items,
  isLoading,
  renderCard,
  emptyIcon,
  searchValue,
  onSearchChange,
}: AdvisorPageProps) {
  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-primary/10 p-2.5 rounded-xl">{icon}</div>
              <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
            </div>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <AdvisorSearchBar
              value={searchValue}
              onChange={onSearchChange}
              destinations={destinations}
              icon={headerIcon}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* Content */}
          <div className="flex gap-6">
            {/* Filters - Desktop */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-4">
                <AdvisorFiltersPanel filters={filters} onChange={onFiltersChange} sections={filterSections} />
              </div>
            </aside>

            {/* Mobile filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden fixed bottom-6 right-6 z-40 shadow-lg rounded-full h-12 w-12 p-0">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <AdvisorFiltersPanel filters={filters} onChange={onFiltersChange} sections={filterSections} />
              </SheetContent>
            </Sheet>

            {/* Results */}
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Buscando..." : `${items?.length || 0} resultados encontrados`}
              </p>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item) => renderCard(item))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-muted rounded-full p-6 mb-4">{emptyIcon}</div>
                  <h3 className="font-semibold text-lg">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                    {searchValue
                      ? `Não encontramos resultados para "${searchValue}". Tente outra busca ou ajuste os filtros.`
                      : "Busque por um destino para começar ou aguarde a importação de dados."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
