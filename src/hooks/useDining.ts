import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiningPlace {
  id: string;
  name: string;
  city: string;
  country: string;
  destination: string;
  neighborhood: string | null;
  cuisine_type: string | null;
  price_range: string | null;
  short_description: string | null;
  full_description: string | null;
  address: string | null;
  google_maps_link: string | null;
  website: string | null;
  image_url: string | null;
  gallery_urls: string[];
  expert_tip: string | null;
  has_view: boolean;
  michelin: boolean;
  rooftop: boolean;
  local_favorite: boolean;
  must_visit: boolean;
  review_score: number | null;
}

export interface DiningFilters {
  search: string;
  cuisineTypes: string[];
  priceRanges: string[];
  neighborhoods: string[];
  highlights: string[];
}

export const CUISINE_TYPE_OPTIONS = ["Italiana", "Japonesa", "Francesa", "Brasileira", "Mexicana", "Americana", "Mediterrânea", "Asiática", "Contemporânea", "Seafood"];
export const PRICE_RANGE_OPTIONS = ["$", "$$", "$$$", "$$$$"];
export const DINING_HIGHLIGHT_OPTIONS = [
  { key: "michelin", label: "Michelin", icon: "⭐" },
  { key: "has_view", label: "Vista panorâmica", icon: "🌅" },
  { key: "rooftop", label: "Rooftop", icon: "🏙️" },
  { key: "local_favorite", label: "Favorito local", icon: "❤️" },
  { key: "must_visit", label: "Imperdível", icon: "🔥" },
];

export function useDining(filters: DiningFilters) {
  return useQuery({
    queryKey: ["dining", filters],
    queryFn: async () => {
      const { data, error } = await supabase.from("dining_places").select("*").eq("is_active", true);
      if (error) throw error;
      let results = (data || []) as DiningPlace[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(h =>
          h.name.toLowerCase().includes(s) ||
          h.destination.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s) ||
          h.country.toLowerCase().includes(s)
        );
      }
      if (filters.cuisineTypes.length > 0) {
        results = results.filter(h => h.cuisine_type && filters.cuisineTypes.includes(h.cuisine_type));
      }
      if (filters.priceRanges.length > 0) {
        results = results.filter(h => h.price_range && filters.priceRanges.includes(h.price_range));
      }
      if (filters.neighborhoods.length > 0) {
        results = results.filter(h => h.neighborhood && filters.neighborhoods.includes(h.neighborhood));
      }
      for (const highlight of filters.highlights) {
        results = results.filter(h => (h as any)[highlight] === true);
      }
      results.sort((a, b) => (b.review_score || 0) - (a.review_score || 0));
      return results;
    },
  });
}

export function useDiningFilterOptions() {
  return useQuery({
    queryKey: ["dining-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dining_places").select("neighborhood, cuisine_type, destination").eq("is_active", true);
      if (error) throw error;
      const neighborhoods = [...new Set((data || []).map(h => h.neighborhood).filter(Boolean))] as string[];
      const cuisineTypes = [...new Set((data || []).map(h => h.cuisine_type).filter(Boolean))] as string[];
      const destinations = [...new Set((data || []).map(h => h.destination).filter(Boolean))] as string[];
      return { neighborhoods: neighborhoods.sort(), cuisineTypes: cuisineTypes.sort(), destinations: destinations.sort() };
    },
  });
}
