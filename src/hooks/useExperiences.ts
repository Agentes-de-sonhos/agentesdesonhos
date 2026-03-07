import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Experience {
  id: string;
  name: string;
  city: string;
  country: string;
  destination: string;
  neighborhood: string | null;
  category: string | null;
  average_duration: string | null;
  short_description: string | null;
  full_description: string | null;
  average_price: number | null;
  booking_url: string | null;
  address: string | null;
  google_maps_link: string | null;
  image_url: string | null;
  gallery_urls: string[];
  expert_tip: string | null;
  must_visit: boolean;
  review_score: number | null;
}

export interface ExperienceFilters {
  search: string;
  categories: string[];
  durations: string[];
  neighborhoods: string[];
  tags: string[];
  priceRange: [number, number] | null;
}

export const EXPERIENCE_CATEGORY_OPTIONS = ["Tour", "Show", "Passeio", "Gastronomia", "Aventura", "Cultural", "Esportivo", "Noturno"];
export const EXPERIENCE_DURATION_OPTIONS = ["Até 2h", "2-4h", "Meio dia", "Dia inteiro", "Multi-dia"];
export const EXPERIENCE_TAG_OPTIONS = [
  { key: "must_visit", label: "Imperdível", icon: "🔥" },
];

export function useExperiences(filters: ExperienceFilters) {
  return useQuery({
    queryKey: ["experiences", filters],
    queryFn: async () => {
      const { data, error } = await supabase.from("experiences").select("*").eq("is_active", true);
      if (error) throw error;
      let results = (data || []) as Experience[];

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
      if (filters.durations.length > 0) {
        results = results.filter(h => h.average_duration && filters.durations.includes(h.average_duration));
      }
      if (filters.neighborhoods.length > 0) {
        results = results.filter(h => h.neighborhood && filters.neighborhoods.includes(h.neighborhood));
      }
      for (const tag of filters.tags) {
        results = results.filter(h => (h as any)[tag] === true);
      }
      if (filters.priceRange) {
        results = results.filter(h => h.average_price != null && h.average_price >= filters.priceRange![0] && h.average_price <= filters.priceRange![1]);
      }
      results.sort((a, b) => (b.review_score || 0) - (a.review_score || 0));
      return results;
    },
  });
}

export function useExperienceFilterOptions() {
  return useQuery({
    queryKey: ["experience-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("experiences").select("neighborhood, category, destination").eq("is_active", true);
      if (error) throw error;
      const neighborhoods = [...new Set((data || []).map(h => h.neighborhood).filter(Boolean))] as string[];
      const categories = [...new Set((data || []).map(h => h.category).filter(Boolean))] as string[];
      const destinations = [...new Set((data || []).map(h => h.destination).filter(Boolean))] as string[];
      return { neighborhoods: neighborhoods.sort(), categories: categories.sort(), destinations: destinations.sort() };
    },
  });
}
