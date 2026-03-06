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

export const CATEGORY_OPTIONS = ["BBB", "BBB+", "Moderado", "Luxo"];
export const PROPERTY_TYPE_OPTIONS = ["Hotel", "Boutique Hotel", "Resort", "Apartment Hotel", "Luxury Hotel"];
export const TAG_OPTIONS = [
  { key: "favorite_brazilians", label: "Favorito dos Brasileiros", icon: "⭐" },
  { key: "most_booked_brazilians", label: "Mais reservado por Brasileiros", icon: "🔥" },
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
      let query = supabase.from("hotels").select("*").eq("is_active", true);

      if (filters.search) {
        const s = `%${filters.search}%`;
        query = query.or(`destination.ilike.${s},city.ilike.${s},country.ilike.${s},name.ilike.${s}`);
      }

      if (filters.regions.length > 0) {
        query = query.in("region", filters.regions);
      }
      if (filters.categories.length > 0) {
        query = query.in("category", filters.categories);
      }
      if (filters.starRatings.length > 0) {
        query = query.in("star_rating", filters.starRatings);
      }
      if (filters.brands.length > 0) {
        query = query.in("brand", filters.brands);
      }
      if (filters.propertyTypes.length > 0) {
        query = query.in("property_type", filters.propertyTypes);
      }

      // Amenities
      for (const amenity of filters.amenities) {
        query = query.eq(amenity as any, true);
      }
      // Tags
      for (const tag of filters.tags) {
        query = query.eq(tag as any, true);
      }
      // Conditions
      for (const condition of filters.conditions) {
        query = query.eq(condition as any, true);
      }

      if (filters.priceRange) {
        query = query.gte("price_from", filters.priceRange[0]).lte("price_from", filters.priceRange[1]);
      }

      query = query.order("review_score", { ascending: false, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Hotel[];
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
