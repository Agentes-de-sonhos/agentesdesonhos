import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Hotel {
  id: string;
  name: string;
  destination: string;
  country: string;
  region: string | null;
  neighborhood: string | null;
  category: string | null;
  star_rating: number | null;
  price_from: number | null;
  review_score: number | null;
  breakfast_included: boolean;
  free_wifi: boolean;
  parking: boolean;
  air_conditioning: boolean;
  pet_friendly: boolean;
  gym: boolean;
  spa: boolean;
  bar: boolean;
  restaurant: boolean;
  pool: boolean;
  accessible: boolean;
  family_friendly: boolean;
  brand: string | null;
  property_type: string | null;
  free_cancellation: boolean;
  special_offers: boolean;
  favorite_brazilians: boolean;
  most_booked_brazilians: boolean;
  iconic_hotel: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  google_maps_link: string | null;
}

export interface HotelFilters {
  search: string;
  regions: string[];
  categories: string[];
  starRatings: number[];
  brands: string[];
  propertyTypes: string[];
  amenities: string[];
  tags: string[];
  conditions: string[];
  priceRange: [number, number] | null;
}

export const AMENITY_KEYS = [
  { key: "breakfast_included", label: "Café da manhã incluído", icon: "☕" },
  { key: "free_wifi", label: "Wi-Fi gratuito", icon: "📶" },
  { key: "parking", label: "Estacionamento", icon: "🅿️" },
  { key: "air_conditioning", label: "Ar condicionado", icon: "❄️" },
  { key: "pet_friendly", label: "Pet friendly", icon: "🐾" },
  { key: "gym", label: "Academia", icon: "💪" },
  { key: "spa", label: "Spa", icon: "🧖" },
  { key: "bar", label: "Bar", icon: "🍸" },
  { key: "restaurant", label: "Restaurante", icon: "🍽️" },
  { key: "pool", label: "Piscina", icon: "🏊" },
  { key: "accessible", label: "Acessível", icon: "♿" },
  { key: "family_friendly", label: "Família", icon: "👨‍👩‍👧‍👦" },
] as const;

export const CATEGORY_OPTIONS = ["Excelente Custo-Benefício", "Bom Custo-Benefício", "Moderado", "Luxo"];
export const PROPERTY_TYPE_OPTIONS = ["Hotel", "Boutique Hotel", "Resort", "Apartment Hotel", "Luxury Hotel"];
export const TAG_OPTIONS = [
  { key: "favorite_brazilians", label: "Mais Procurado por Brasileiros", icon: "⭐" },
  { key: "iconic_hotel", label: "Hotel Icônico", icon: "🏆" },
];
export const CONDITION_OPTIONS = [
  { key: "free_cancellation", label: "Cancelamento gratuito" },
  { key: "special_offers", label: "Ofertas especiais" },
];

export function useHotels(filters: HotelFilters) {
  return useQuery({
    queryKey: ["hotels", filters],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("*").eq("is_active", true);
      if (error) throw error;
      
      let results = (data || []) as Hotel[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(h =>
          h.destination.toLowerCase().includes(s) ||
          (h.city || "").toLowerCase().includes(s) ||
          h.country.toLowerCase().includes(s) ||
          h.name.toLowerCase().includes(s)
        );
      }

      if (filters.regions.length > 0) {
        results = results.filter(h => h.region && filters.regions.includes(h.region));
      }
      if (filters.categories.length > 0) {
        results = results.filter(h => h.category && filters.categories.includes(h.category));
      }
      if (filters.starRatings.length > 0) {
        results = results.filter(h => h.star_rating != null && filters.starRatings.includes(h.star_rating));
      }
      if (filters.brands.length > 0) {
        results = results.filter(h => h.brand && filters.brands.includes(h.brand));
      }
      if (filters.propertyTypes.length > 0) {
        results = results.filter(h => h.property_type && filters.propertyTypes.includes(h.property_type));
      }

      for (const amenity of filters.amenities) {
        results = results.filter(h => (h as any)[amenity] === true);
      }
      for (const tag of filters.tags) {
        results = results.filter(h => (h as any)[tag] === true);
      }
      for (const condition of filters.conditions) {
        results = results.filter(h => (h as any)[condition] === true);
      }

      if (filters.priceRange) {
        results = results.filter(h => h.price_from != null && h.price_from >= filters.priceRange![0] && h.price_from <= filters.priceRange![1]);
      }

      results.sort((a, b) => (b.review_score || 0) - (a.review_score || 0));

      return results;
    },
  });
}

export function useHotelFilterOptions() {
  return useQuery({
    queryKey: ["hotel-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("region, brand, destination")
        .eq("is_active", true);
      if (error) throw error;

      const regions = [...new Set((data || []).map(h => h.region).filter(Boolean))] as string[];
      const brands = [...new Set((data || []).map(h => h.brand).filter(Boolean))] as string[];
      const destinations = [...new Set((data || []).map(h => h.destination).filter(Boolean))] as string[];

      return { regions: regions.sort(), brands: brands.sort(), destinations: destinations.sort() };
    },
  });
}
