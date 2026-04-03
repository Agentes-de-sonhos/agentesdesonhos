import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, UtensilsCrossed, Landmark, ShoppingBag, Compass, Globe } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { PageHeader } from "@/components/layout/PageHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Hotel
import { HotelFiltersPanel } from "@/components/hotels/HotelFiltersPanel";
import { HotelCard } from "@/components/hotels/HotelCard";
import { useHotels, useHotelFilterOptions, HotelFilters } from "@/hooks/useHotels";
import { SuggestHotelDialog } from "@/components/hotels/SuggestHotelDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

// Other advisors
import { AdvisorCard } from "@/components/advisor/AdvisorCard";
import { DestinationSelector } from "@/components/advisor/DestinationSelector";
import { SuggestAdvisorDialog } from "@/components/advisor/SuggestAdvisorDialog";
import { AdvisorFiltersPanel } from "@/components/advisor/AdvisorFiltersPanel";

import { useDining, useDiningFilterOptions, DiningFilters, CUISINE_TYPE_OPTIONS, PRICE_RANGE_OPTIONS, DINING_HIGHLIGHT_OPTIONS } from "@/hooks/useDining";
import { useAttractions, useAttractionFilterOptions, AttractionFilters, ATTRACTION_CATEGORY_OPTIONS, VISIT_TIME_OPTIONS, ATTRACTION_TAG_OPTIONS } from "@/hooks/useAttractions";
import { useShopping, useShoppingFilterOptions, ShoppingFilters, SHOPPING_TYPE_OPTIONS, SHOPPING_PRICE_RANGE_OPTIONS, SHOPPING_TAG_OPTIONS } from "@/hooks/useShopping";
import { useExperiences, useExperienceFilterOptions, ExperienceFilters, EXPERIENCE_CATEGORY_OPTIONS, EXPERIENCE_DURATION_OPTIONS, EXPERIENCE_TAG_OPTIONS } from "@/hooks/useExperiences";

const TABS = [
  { key: "hotel", label: "Hotéis", icon: Building2 },
  { key: "dining", label: "Restaurantes", icon: UtensilsCrossed },
  { key: "attraction", label: "Atrações / Experiências", icon: Landmark },
  { key: "shopping", label: "Compras", icon: ShoppingBag },
] as const;

type TabKey = typeof TABS[number]["key"];

// ─── Default filters ──────────────────────────────
const defaultHotelFilters: HotelFilters = { search: "", regions: [], categories: [], starRatings: [], brands: [], propertyTypes: [], amenities: [], tags: [], conditions: [], priceRange: null };
const defaultDiningFilters: DiningFilters = { search: "", cuisineTypes: [], priceRanges: [], neighborhoods: [], highlights: [] };
const defaultAttractionFilters: AttractionFilters = { search: "", categories: [], neighborhoods: [], visitTimes: [], tags: [] };
const defaultShoppingFilters: ShoppingFilters = { search: "", shoppingTypes: [], priceRanges: [], neighborhoods: [], tags: [] };
const defaultExperienceFilters: ExperienceFilters = { search: "", categories: [], durations: [], neighborhoods: [], tags: [], priceRange: null };

// ─── Tab content components ───────────────────────

function HotelTab() {
  const [filters, setFilters] = useState(defaultHotelFilters);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { data: hotels, isLoading } = useHotels(filters);
  const { data: filterOptions } = useHotelFilterOptions();

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
        <DestinationSelector destinations={filterOptions?.destinations || []} selected={filters.search} onSelect={(s) => setFilters((f) => ({ ...f, search: s }))} />
        <Button variant="outline" className="gap-2 rounded-2xl px-5 py-3.5 h-auto text-sm font-semibold border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all" onClick={() => setSuggestOpen(true)}>
          <PlusCircle className="h-5 w-5" /> Sugerir novo hotel
        </Button>
      </div>
      <AdvisorContent
        filters={<HotelFiltersPanel filters={filters} onChange={setFilters} regions={filterOptions?.regions || []} brands={filterOptions?.brands || []} />}
        isLoading={isLoading}
        count={hotels?.length || 0}
        items={hotels}
        renderCard={(h) => <HotelCard key={h.id} hotel={h} />}
        emptySearch={filters.search}
        emptyIcon={<Building2 className="h-10 w-10 text-muted-foreground" />}
      />
      <SuggestHotelDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </>
  );
}

function DiningTab() {
  const [filters, setFilters] = useState(defaultDiningFilters);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { data: items, isLoading } = useDining(filters);
  const { data: filterOptions } = useDiningFilterOptions();

  const sections = [
    ...(filterOptions?.cuisineTypes?.length ? [{ title: "Tipo de Cozinha", type: "checkbox" as const, options: filterOptions.cuisineTypes, filterKey: "cuisineTypes" }] : [{ title: "Tipo de Cozinha", type: "checkbox" as const, options: CUISINE_TYPE_OPTIONS, filterKey: "cuisineTypes" }]),
    { title: "Faixa de Preço", type: "checkbox" as const, options: PRICE_RANGE_OPTIONS, filterKey: "priceRanges" },
    ...(filterOptions?.neighborhoods?.length ? [{ title: "Bairro", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }] : []),
    { title: "Destaques", type: "checkbox" as const, options: DINING_HIGHLIGHT_OPTIONS, filterKey: "highlights" },
  ];

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
        <DestinationSelector destinations={filterOptions?.destinations || []} selected={filters.search} onSelect={(s) => setFilters((f) => ({ ...f, search: s }))} />
        <Button variant="outline" className="gap-2 rounded-2xl px-5 py-3.5 h-auto text-sm font-semibold border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all" onClick={() => setSuggestOpen(true)}>
          <PlusCircle className="h-5 w-5" /> Sugerir restaurante
        </Button>
      </div>
      <AdvisorContent
        filters={<AdvisorFiltersPanel filters={filters} onChange={setFilters} sections={sections} />}
        isLoading={isLoading}
        count={items?.length || 0}
        items={items}
        emptySearch={filters.search}
        emptyIcon={<UtensilsCrossed className="h-10 w-10 text-muted-foreground" />}
        renderCard={(item) => {
          const tags = [
            item.michelin && { label: "Michelin", icon: "⭐", color: "bg-warning/10 text-warning border-warning/20" },
            item.has_view && { label: "Vista panorâmica", icon: "🌅", color: "bg-primary/10 text-primary border-primary/20" },
            item.rooftop && { label: "Rooftop", icon: "🏙️", color: "bg-accent/10 text-accent-foreground border-accent/20" },
            item.local_favorite && { label: "Favorito local", icon: "❤️", color: "bg-destructive/10 text-destructive border-destructive/20" },
            item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" },
          ].filter(Boolean) as any[];
          return (
            <AdvisorCard key={item.id} name={item.name} location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination} category={item.cuisine_type} tags={tags} shortDescription={item.short_description} googleMapsLink={item.google_maps_link} expertTip={item.expert_tip}
              priceDisplay={item.price_range ? <span className="text-2xl font-bold text-foreground">{item.price_range}</span> : undefined} />
          );
        }}
      />
      <SuggestAdvisorDialog open={suggestOpen} onOpenChange={setSuggestOpen} advisorType="dining" />
    </>
  );
}

function AttractionTab() {
  const [filters, setFilters] = useState(defaultAttractionFilters);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestExpOpen, setSuggestExpOpen] = useState(false);
  const { data: attractions, isLoading: loadingAttractions } = useAttractions(filters);
  const { data: attractionFilterOptions } = useAttractionFilterOptions();
  const { data: experiences, isLoading: loadingExperiences } = useExperiences({ search: filters.search, categories: [], durations: [], neighborhoods: [], tags: [], priceRange: null });

  const filterSections = [
    ...(attractionFilterOptions?.categories?.length ? [{ title: "Categoria", type: "checkbox" as const, options: attractionFilterOptions.categories, filterKey: "categories" }] : [{ title: "Categoria", type: "checkbox" as const, options: ATTRACTION_CATEGORY_OPTIONS, filterKey: "categories" }]),
    ...(attractionFilterOptions?.neighborhoods?.length ? [{ title: "Bairro / Localização", type: "checkbox" as const, options: attractionFilterOptions.neighborhoods, filterKey: "neighborhoods" }] : []),
    { title: "Tempo de Visita", type: "checkbox" as const, options: VISIT_TIME_OPTIONS, filterKey: "visitTimes" },
    { title: "Destaques", type: "checkbox" as const, options: ATTRACTION_TAG_OPTIONS, filterKey: "tags" },
  ];

  // Merge attractions + experiences into a single list
  const mergedItems = [
    ...(attractions || []).map((item: any) => ({ ...item, _source: "attraction" as const })),
    ...(experiences || []).map((item: any) => ({ ...item, _source: "experience" as const })),
  ];
  const isLoading = loadingAttractions || loadingExperiences;

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
        <DestinationSelector destinations={attractionFilterOptions?.destinations || []} selected={filters.search} onSelect={(s) => setFilters((f) => ({ ...f, search: s }))} />
        <Button variant="outline" className="gap-2 rounded-2xl px-5 py-3.5 h-auto text-sm font-semibold border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all" onClick={() => setSuggestOpen(true)}>
          <PlusCircle className="h-5 w-5" /> Sugerir atração
        </Button>
        <Button variant="outline" className="gap-2 rounded-2xl px-5 py-3.5 h-auto text-sm font-semibold border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all" onClick={() => setSuggestExpOpen(true)}>
          <PlusCircle className="h-5 w-5" /> Sugerir experiência
        </Button>
      </div>
      <AdvisorContent
        filters={<AdvisorFiltersPanel filters={filters} onChange={setFilters} sections={filterSections} />}
        isLoading={isLoading}
        count={mergedItems.length}
        items={mergedItems}
        emptySearch={filters.search}
        emptyIcon={<Landmark className="h-10 w-10 text-muted-foreground" />}
        renderCard={(item) => {
          const tags = [item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" }].filter(Boolean) as any[];
          if (item._source === "experience") {
            const details = [
              item.average_duration && { icon: "⏱️", label: item.average_duration },
              item.category && { icon: "🏷️", label: item.category },
            ].filter(Boolean) as any[];
            return (
              <AdvisorCard key={item.id} name={item.name} location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination} category={item.category} tags={tags} details={details} shortDescription={item.short_description} googleMapsLink={item.google_maps_link} expertTip={item.expert_tip}
                priceDisplay={item.average_price != null ? (<><span className="text-xs text-muted-foreground">a partir de</span><span className="text-2xl font-bold text-foreground">${item.average_price.toLocaleString("en-US")}</span></>) : undefined} />
            );
          }
          return (
            <AdvisorCard key={item.id} name={item.name} location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination} category={item.category} tags={tags}
              details={item.average_visit_time ? [{ icon: "⏱️", label: item.average_visit_time }] : []} shortDescription={item.short_description} googleMapsLink={item.google_maps_link} expertTip={item.expert_tip} />
          );
        }}
      />
      <SuggestAdvisorDialog open={suggestOpen} onOpenChange={setSuggestOpen} advisorType="attraction" />
      <SuggestAdvisorDialog open={suggestExpOpen} onOpenChange={setSuggestExpOpen} advisorType="experience" />
    </>
  );
}

function ShoppingTab() {
  const [filters, setFilters] = useState(defaultShoppingFilters);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { data: items, isLoading } = useShopping(filters);
  const { data: filterOptions } = useShoppingFilterOptions();

  const sections = [
    ...(filterOptions?.shoppingTypes?.length ? [{ title: "Tipo", type: "checkbox" as const, options: filterOptions.shoppingTypes, filterKey: "shoppingTypes" }] : [{ title: "Tipo", type: "checkbox" as const, options: SHOPPING_TYPE_OPTIONS, filterKey: "shoppingTypes" }]),
    { title: "Faixa de Preço", type: "checkbox" as const, options: SHOPPING_PRICE_RANGE_OPTIONS, filterKey: "priceRanges" },
    ...(filterOptions?.neighborhoods?.length ? [{ title: "Bairro", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }] : []),
    { title: "Destaques", type: "checkbox" as const, options: SHOPPING_TAG_OPTIONS, filterKey: "tags" },
  ];

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
        <DestinationSelector destinations={filterOptions?.destinations || []} selected={filters.search} onSelect={(s) => setFilters((f) => ({ ...f, search: s }))} />
        <Button variant="outline" className="gap-2 rounded-2xl px-5 py-3.5 h-auto text-sm font-semibold border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all" onClick={() => setSuggestOpen(true)}>
          <PlusCircle className="h-5 w-5" /> Sugerir compras
        </Button>
      </div>
      <AdvisorContent
        filters={<AdvisorFiltersPanel filters={filters} onChange={setFilters} sections={sections} />}
        isLoading={isLoading}
        count={items?.length || 0}
        items={items}
        emptySearch={filters.search}
        emptyIcon={<ShoppingBag className="h-10 w-10 text-muted-foreground" />}
        renderCard={(item) => {
          const tags = [
            item.is_outlet && { label: "Outlet", icon: "🏷️", color: "bg-accent/10 text-accent-foreground border-accent/20" },
            item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" },
          ].filter(Boolean) as any[];
          return (
            <AdvisorCard key={item.id} name={item.name} location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination} category={item.shopping_type} tags={tags} shortDescription={item.short_description} googleMapsLink={item.google_maps_link} expertTip={item.expert_tip}
              priceDisplay={item.price_range ? <span className="text-2xl font-bold text-foreground">{item.price_range}</span> : undefined} />
          );
        }}
      />
      <SuggestAdvisorDialog open={suggestOpen} onOpenChange={setSuggestOpen} advisorType="shopping" />
    </>
  );
}


// ─── Shared content layout with filters + results ──

function AdvisorContent({ filters, isLoading, count, items, renderCard, emptySearch, emptyIcon }: {
  filters: React.ReactNode;
  isLoading: boolean;
  count: number;
  items: any[] | undefined;
  renderCard: (item: any) => React.ReactNode;
  emptySearch: string;
  emptyIcon: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-4">{filters}</div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden fixed bottom-6 right-6 z-40 shadow-lg rounded-full h-12 w-12 p-0">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">{filters}</SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Buscando..." : `${count} resultados encontrados`}
        </p>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-3">{items.map((item) => renderCard(item))}</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted rounded-full p-6 mb-4">{emptyIcon}</div>
            <h3 className="font-semibold text-lg">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground mt-1 text-sm max-w-sm">
              {emptySearch
                ? `Não encontramos resultados para "${emptySearch}". Tente outra busca ou ajuste os filtros.`
                : "Busque por um destino para começar ou aguarde a importação de dados."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────

export default function DreamAdvisor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "hotel";

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <DashboardLayout>
      <ComingSoonOverlay pageKey="dream-advisor" />
      <TooltipProvider>
        <div className="space-y-6">
          <PageHeader
            pageKey="dream-advisor"
            title="Travel Advisor"
            subtitle="Encontre hotéis, restaurantes, atrações, compras e experiências para recomendar aos seus clientes"
            icon={Globe}
            adminTab="hotels"
          />

          {/* Tab navigation */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === "hotel" && <HotelTab />}
          {activeTab === "dining" && <DiningTab />}
          {activeTab === "attraction" && <AttractionTab />}
          {activeTab === "shopping" && <ShoppingTab />}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

