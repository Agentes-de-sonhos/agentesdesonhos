import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { AdvisorPage } from "@/components/advisor/AdvisorPage";
import { AdvisorCard } from "@/components/advisor/AdvisorCard";
import { useDining, useDiningFilterOptions, DiningFilters, CUISINE_TYPE_OPTIONS, PRICE_RANGE_OPTIONS, DINING_HIGHLIGHT_OPTIONS } from "@/hooks/useDining";

const defaultFilters: DiningFilters = {
  search: "",
  cuisineTypes: [],
  priceRanges: [],
  neighborhoods: [],
  highlights: [],
};

export default function DiningAdvisor() {
  const [filters, setFilters] = useState<DiningFilters>(defaultFilters);
  const { data: items, isLoading } = useDining(filters);
  const { data: filterOptions } = useDiningFilterOptions();

  const filterSections = [
    ...(filterOptions?.cuisineTypes && filterOptions.cuisineTypes.length > 0
      ? [{ title: "Tipo de Cozinha", type: "checkbox" as const, options: filterOptions.cuisineTypes, filterKey: "cuisineTypes" }]
      : [{ title: "Tipo de Cozinha", type: "checkbox" as const, options: CUISINE_TYPE_OPTIONS, filterKey: "cuisineTypes" }]),
    { title: "Faixa de Preço", type: "checkbox" as const, options: PRICE_RANGE_OPTIONS, filterKey: "priceRanges" },
    ...(filterOptions?.neighborhoods && filterOptions.neighborhoods.length > 0
      ? [{ title: "Bairro", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }]
      : []),
    { title: "Destaques", type: "checkbox" as const, options: DINING_HIGHLIGHT_OPTIONS, filterKey: "highlights" },
  ];

  return (
    <AdvisorPage
      title="Dining Advisor"
      subtitle="Encontre os melhores restaurantes para recomendar aos seus clientes"
      icon={<UtensilsCrossed className="h-6 w-6 text-primary" />}
      headerIcon={<UtensilsCrossed className="h-5 w-5 text-primary shrink-0" />}
      searchPlaceholder="Buscar restaurante, cidade ou destino..."
      filters={filters}
      onFiltersChange={setFilters}
      filterSections={filterSections}
      destinations={filterOptions?.destinations || []}
      items={items}
      isLoading={isLoading}
      searchValue={filters.search}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
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
          <AdvisorCard
            key={item.id}
            name={item.name}
            location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination}
            category={item.cuisine_type}
            tags={tags}
            shortDescription={item.short_description}
            googleMapsLink={item.google_maps_link}
            expertTip={item.expert_tip}
            itemId={item.id}
            itemType="dining"
            priceDisplay={item.price_range ? (
              <span className="text-2xl font-bold text-foreground">{item.price_range}</span>
            ) : undefined}
          />
        );
      }}
    />
  );
}
