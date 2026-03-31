import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { AdvisorPage } from "@/components/advisor/AdvisorPage";
import { AdvisorCard } from "@/components/advisor/AdvisorCard";
import { useShopping, useShoppingFilterOptions, ShoppingFilters, SHOPPING_TYPE_OPTIONS, SHOPPING_PRICE_RANGE_OPTIONS, SHOPPING_TAG_OPTIONS } from "@/hooks/useShopping";

const defaultFilters: ShoppingFilters = {
  search: "",
  shoppingTypes: [],
  priceRanges: [],
  neighborhoods: [],
  tags: [],
};

export default function ShoppingAdvisor() {
  const [filters, setFilters] = useState<ShoppingFilters>(defaultFilters);
  const { data: items, isLoading } = useShopping(filters);
  const { data: filterOptions } = useShoppingFilterOptions();

  const filterSections = [
    ...(filterOptions?.shoppingTypes && filterOptions.shoppingTypes.length > 0
      ? [{ title: "Tipo", type: "checkbox" as const, options: filterOptions.shoppingTypes, filterKey: "shoppingTypes" }]
      : [{ title: "Tipo", type: "checkbox" as const, options: SHOPPING_TYPE_OPTIONS, filterKey: "shoppingTypes" }]),
    { title: "Faixa de Preço", type: "checkbox" as const, options: SHOPPING_PRICE_RANGE_OPTIONS, filterKey: "priceRanges" },
    ...(filterOptions?.neighborhoods && filterOptions.neighborhoods.length > 0
      ? [{ title: "Bairro", type: "checkbox" as const, options: filterOptions.neighborhoods, filterKey: "neighborhoods" }]
      : []),
    { title: "Destaques", type: "checkbox" as const, options: SHOPPING_TAG_OPTIONS, filterKey: "tags" },
  ];

  return (
    <AdvisorPage
      title="Shopping Advisor"
      subtitle="Encontre os melhores locais de compras para seus clientes"
      icon={<ShoppingBag className="h-6 w-6 text-primary" />}
      headerIcon={<ShoppingBag className="h-5 w-5 text-primary shrink-0" />}
      searchPlaceholder="Buscar loja, shopping ou destino..."
      filters={filters}
      onFiltersChange={setFilters}
      filterSections={filterSections}
      destinations={filterOptions?.destinations || []}
      items={items}
      isLoading={isLoading}
      searchValue={filters.search}
      onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
      emptyIcon={<ShoppingBag className="h-10 w-10 text-muted-foreground" />}
      renderCard={(item) => {
        const tags = [
          item.is_outlet && { label: "Outlet", icon: "🏷️", color: "bg-accent/10 text-accent-foreground border-accent/20" },
          item.must_visit && { label: "Imperdível", icon: "🔥", color: "bg-warning/10 text-warning border-warning/20" },
        ].filter(Boolean) as any[];

        return (
          <AdvisorCard
            key={item.id}
            name={item.name}
            location={[item.neighborhood, item.city].filter(Boolean).join(" – ") || item.destination}
            category={item.shopping_type}
            tags={tags}
            shortDescription={item.short_description}
            googleMapsLink={item.google_maps_link}
            expertTip={item.expert_tip}
            itemId={item.id}
            itemType="shopping"
            priceDisplay={item.price_range ? (
              <span className="text-2xl font-bold text-foreground">{item.price_range}</span>
            ) : undefined}
          />
        );
      }}
    />
  );
}
