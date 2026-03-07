import { useState } from "react";
import { Compass } from "lucide-react";
import { AdvisorPage } from "@/components/advisor/AdvisorPage";
import { AdvisorCard } from "@/components/advisor/AdvisorCard";
import { useExperiences, useExperienceFilterOptions, ExperienceFilters, EXPERIENCE_CATEGORY_OPTIONS, EXPERIENCE_DURATION_OPTIONS, EXPERIENCE_TAG_OPTIONS } from "@/hooks/useExperiences";

const defaultFilters: ExperienceFilters = {
  search: "",
  categories: [],
  durations: [],
  neighborhoods: [],
  tags: [],
  priceRange: null,
};

export default function ExperienceAdvisor() {
  const [filters, setFilters] = useState<ExperienceFilters>(defaultFilters);
  const { data: items, isLoading } = useExperiences(filters);
  const { data: filterOptions } = useExperienceFilterOptions();

  const filterSections = [
    ...(filterOptions?.categories && filterOptions.categories.length > 0
      ? [{ title: "Categoria", type: "checkbox" as const, options: filterOptions.categories, filterKey: "categories" }]
      : [{ title: "Categoria", type: "checkbox" as const, options: EXPERIENCE_CATEGORY_OPTIONS, filterKey: "categories" }]),
    { title: "Duração", type: "checkbox" as const, options: EXPERIENCE_DURATION_OPTIONS, filterKey: "durations" },
    ...(filterOptions?.neighborhoods && filterOptions.neighborhoods.length > 0
      ? [{ title: "Local", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }]
      : []),
    { title: "Destaques", type: "checkbox" as const, options: EXPERIENCE_TAG_OPTIONS, filterKey: "tags" },
    { title: "Preço médio (USD)", type: "price" as const, filterKey: "priceRange", priceMax: 500 },
  ];

  return (
    <AdvisorPage
      title="Experience Advisor"
      subtitle="Descubra atividades e passeios inesquecíveis para seus clientes"
      icon={<Compass className="h-6 w-6 text-primary" />}
      headerIcon={<Compass className="h-5 w-5 text-primary shrink-0" />}
      searchPlaceholder="Buscar experiência, cidade ou destino..."
      filters={filters}
      onFiltersChange={setFilters}
      filterSections={filterSections}
      destinations={filterOptions?.destinations || []}
      items={items}
      isLoading={isLoading}
      searchValue={filters.search}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      emptyIcon={<Compass className="h-10 w-10 text-muted-foreground" />}
      renderCard={(item) => {
        const tags = [
          item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" },
        ].filter(Boolean) as any[];

        const details = [
          item.average_duration && { icon: "⏱️", label: item.average_duration },
          item.category && { icon: "🏷️", label: item.category },
        ].filter(Boolean) as any[];

        return (
          <AdvisorCard
            key={item.id}
            name={item.name}
            location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination}
            category={item.category}
            tags={tags}
            details={details}
            shortDescription={item.short_description}
            googleMapsLink={item.google_maps_link}
            expertTip={item.expert_tip}
            priceDisplay={item.average_price != null ? (
              <>
                <span className="text-xs text-muted-foreground">a partir de</span>
                <span className="text-2xl font-bold text-foreground">${item.average_price.toLocaleString("en-US")}</span>
              </>
            ) : undefined}
          />
        );
      }}
    />
  );
}
