import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TripService } from "@/types/trip";

/**
 * Returns the wallet trip (if any) that this itinerary is currently linked to,
 * along with its services. Used by the V2 itinerary editor to render a
 * "Vincular a serviço da viagem" combobox.
 *
 * Returns `null` when the itinerary is not linked to any trip (standalone roteiro).
 */
export function useLinkedTripForItinerary(itineraryId: string | undefined) {
  return useQuery({
    queryKey: ["linked-trip-for-itinerary", itineraryId],
    queryFn: async () => {
      if (!itineraryId) return null;

      const { data: trip, error } = await supabase
        .from("trips")
        .select("id, trip_title, destination, client_name")
        .eq("itinerary_id", itineraryId)
        .maybeSingle();

      if (error) throw error;
      if (!trip) return null;

      const { data: services, error: servicesError } = await supabase
        .from("trip_services")
        .select("*")
        .eq("trip_id", trip.id)
        .order("order_index", { ascending: true });

      if (servicesError) throw servicesError;

      return {
        trip,
        services: (services ?? []) as TripService[],
      };
    },
    enabled: !!itineraryId,
    staleTime: 60_000,
  });
}