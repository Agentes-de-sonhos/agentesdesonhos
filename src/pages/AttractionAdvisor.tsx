import { useState } from "react";
import { Landmark } from "lucide-react";
import { AdvisorPage } from "@/components/advisor/AdvisorPage";
import { AdvisorCard } from "@/components/advisor/AdvisorCard";
import { useAttractions, useAttractionFilterOptions, AttractionFilters, ATTRACTION_CATEGORY_OPTIONS, VISIT_TIME_OPTIONS, ATTRACTION_TAG_OPTIONS } from "@/hooks/useAttractions";

const defaultFilters: AttractionFilters = {
  search: "",
  categories: [],
  neighborhoods: [],
  visitTimes: [],
  tags: [],
};

export default function AttractionAdvisor() {
  const [filters, setFilters] = useState<AttractionFilters>(defaultFilters);
  const { data: items, isLoading } = useAttractions(filters);
  const { data: filterOptions } = useAttractionFilterOptions();

  const filterSections = [
    ...(filterOptions?.categories && filterOptions.categories.length > 0
      ? [{ title: "Categoria", type: "checkbox" as const, options: filterOptions.categories, filterKey: "categories" }]
      : [{ title: "Categoria", type: "checkbox" as const, options: ATTRACTION_CATEGORY_OPTIONS, filterKey: "categories" }]),
    ...(filterOptions?.neighborhoods && filterOptions.neighborhoods.length > 0
      ? [{ title: "Bairro / Localização", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }]
      : []),
    { title: "Tempo de Visita", type: "checkbox" as const, options: VISIT_TIME_OPTIONS, filterKey: "visitTimes" },
    { title: "Destaques", type: "checkbox" as const, options: ATTRACTION_TAG_OPTIONS, filterKey: "tags" },
  ];

  return (
    <AdvisorPage
      title="Attraction Advisor"
      subtitle="Descubra os melhores pontos turísticos para recomendar"
      icon={<Landmark className="h-6 w-6 text-primary" />}
      headerIcon={<Landmark className="h-5 w-5 text-primary shrink-0" />}
      searchPlaceholder="Buscar atração, cidade ou destino..."
      filters={filters}
      onFiltersChange={setFilters}
      filterSections={filterSections}
      destinations={filterOptions?.destinations || []}
      items={items}
      isLoading={isLoading}
      searchValue={filters.search}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      emptyIcon={<Landmark className="h-10 w-10 text-muted-foreground" />}
      renderCard={(item) => {
        const tags = [
          item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" },
        ].filter(Boolean) as any[];

        return (
          <AdvisorCard
            key={item.id}
            name={item.name}
            location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination}
            category={item.category}
            tags={tags}
            details={item.average_visit_time ? [{ icon: "⏱️", label: item.average_visit_time }] : []}
            shortDescription={item.short_description}
            googleMapsLink={item.google_maps_link}
            expertTip={item.expert_tip}
          />
        );
      }}
    />
  );
}
