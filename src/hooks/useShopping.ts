import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShoppingPlace {
  id: string;
  name: string;
  city: string;
  country: string;
  destination: string;
  neighborhood: string | null;
  shopping_type: string | null;
  price_range: string | null;
  short_description: string | null;
  full_description: string | null;
  address: string | null;
  google_maps_link: string | null;
  website: string | null;
  image_url: string | null;
  gallery_urls: string[];
  expert_tip: string | null;
  is_outlet: boolean;
  must_visit: boolean;
  review_score: number | null;
}

export interface ShoppingFilters {
  search: string;
  shoppingTypes: string[];
  priceRanges: string[];
  neighborhoods: string[];
  tags: string[];
}

export const SHOPPING_TYPE_OPTIONS = ["Shopping", "Outlet", "Rua de Compras", "Loja Icônica", "Mercado", "Loja de Departamento"];
export const SHOPPING_PRICE_RANGE_OPTIONS = ["$", "$$", "$$$", "$$$$"];
export const SHOPPING_TAG_OPTIONS = [
  { key: "is_outlet", label: "Outlet", icon: "🏷️" },
  { key: "must_visit", label: "Imperdível", icon: "🔥" },
];

export function useShopping(filters: ShoppingFilters) {
  return useQuery({
    queryKey: ["shopping", filters],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopping_places").select("*").eq("is_active", true);
      if (error) throw error;
      let results = (data || []) as ShoppingPlace[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(h =>
          h.name.toLowerCase().includes(s) ||
          h.destination.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s) ||
          h.country.toLowerCase().includes(s)
        );
      }
      if (filters.shoppingTypes.length > 0) {
        results = results.filter(h => h.shopping_type && filters.shoppingTypes.includes(h.shopping_type));
      }
      if (filters.priceRanges.length > 0) {
        results = results.filter(h => h.price_range && filters.priceRanges.includes(h.price_range));
      }
      if (filters.neighborhoods.length > 0) {
        results = results.filter(h => h.neighborhood && filters.neighborhoods.includes(h.neighborhood));
      }
      for (const tag of filters.tags) {
        results = results.filter(h => (h as any)[tag] === true);
      }
      results.sort((a, b) => (b.review_score || 0) - (a.review_score || 0));
      return results;
    },
  });
}

export function useShoppingFilterOptions() {
  return useQuery({
    queryKey: ["shopping-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopping_places").select("neighborhood, shopping_type, destination").eq("is_active", true);
      if (error) throw error;
      const neighborhoods = [...new Set((data || []).map(h => h.neighborhood).filter(Boolean))] as string[];
      const shoppingTypes = [...new Set((data || []).map(h => h.shopping_type).filter(Boolean))] as string[];
      const destinations = [...new Set((data || []).map(h => h.destination).filter(Boolean))] as string[];
      return { neighborhoods: neighborhoods.sort(), shoppingTypes: shoppingTypes.sort(), destinations: destinations.sort() };
    },
  });
}
