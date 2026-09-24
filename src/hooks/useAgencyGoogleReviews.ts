import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleReviewsEnabled, mapGooglePlaceReviews } from "@/lib/agencyGoogleReviews";

/** Busca sob demanda (quando `active`), deduplicada por hostname e sem refetch. */
export function useAgencyGoogleReviews(hostname: string, active: boolean) {
  const enabled = active && isGoogleReviewsEnabled(hostname);
  return useQuery({
    queryKey: ["agency-google-reviews", hostname.toLowerCase()],
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-place-reviews", {
        body: { hostname },
      });
      if (error) throw new Error("unavailable");
      const mapped = mapGooglePlaceReviews(data);
      if (!mapped) throw new Error("unavailable");
      return mapped;
    },
  });
}
