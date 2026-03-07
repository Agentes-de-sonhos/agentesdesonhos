import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Attraction {
  id: string;
  name: string;
  city: string;
  country: string;
  destination: string;
  neighborhood: string | null;
  category: string | null;
  short_description: string | null;
  full_description: string | null;
  average_visit_time: string | null;
  address: string | null;
  google_maps_link: string | null;
  website: string | null;
  image_url: string | null;
  gallery_urls: string[];
  expert_tip: string | null;
  must_visit: boolean;
  review_score: number | null;
}

export interface AttractionFilters {
  search: string;
  categories: string[];
  neighborhoods: string[];
  visitTimes: string[];
  tags: string[];
}

export const ATTRACTION_CATEGORY_OPTIONS = ["Museu", "Monumento", "Parque", "Mirante", "Igreja", "Palácio", "Praça", "Jardim", "Teatro", "Galeria"];
export const VISIT_TIME_OPTIONS = ["Até 1h", "1-2h", "2-3h", "Meio dia", "Dia inteiro"];
export const ATTRACTION_TAG_OPTIONS = [
  { key: "must_visit", label: "Imperdível", icon: "🔥" },
];

export function useAttractions(filters: AttractionFilters) {
  return useQuery({
    queryKey: ["attractions", filters],
    queryFn: async () => {
      const { data, error } = await supabase.from("attractions").select("*").eq("is_active", true);
      if (error) throw error;
      let results = (data || []) as Attraction[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(h =>
          h.name.toLowerCase().includes(s) ||
          h.destination.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s) ||
          h.country.toLowerCase().includes(s)
        );
      }
      if (filters.categories.length > 0) {
        results = results.filter(h => h.category && filters.categories.includes(h.category));
      }
      if (filters.neighborhoods.length > 0) {
        results = results.filter(h => h.neighborhood && filters.neighborhoods.includes(h.neighborhood));
      }
      if (filters.visitTimes.length > 0) {
        results = results.filter(h => h.average_visit_time && filters.visitTimes.includes(h.average_visit_time));
      }
      for (const tag of filters.tags) {
        results = results.filter(h => (h as any)[tag] === true);
      }
      results.sort((a, b) => (b.review_score || 0) - (a.review_score || 0));
      return results;
    },
  });
}

export function useAttractionFilterOptions() {
  return useQuery({
    queryKey: ["attraction-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attractions").select("neighborhood, category, destination").eq("is_active", true);
      if (error) throw error;
      const neighborhoods = [...new Set((data || []).map(h => h.neighborhood).filter(Boolean))] as string[];
      const categories = [...new Set((data || []).map(h => h.category).filter(Boolean))] as string[];
      const destinations = [...new Set((data || []).map(h => h.destination).filter(Boolean))] as string[];
      return { neighborhoods: neighborhoods.sort(), categories: categories.sort(), destinations: destinations.sort() };
    },
  });
}
