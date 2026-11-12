import { selectReviewedGooglePhotos, type GoogleHotelPhoto } from "../../supabase/functions/_shared/clubMedGooglePhotos";
import { useQuery } from "@tanstack/react-query";

export interface ClubMedPlaces {
  placeId: string | null; status: string;
  placeName?: string | null; address?: string | null;
  rating?: number | null; total?: number | null; mapsUrl?: string | null;
  lat?: number | null; lng?: number | null;
  photos?: GoogleHotelPhoto[];
  reviews?: { author: string; authorUri?: string | null; rating?: number | null; text: string; relativeTime?: string | null }[];
}

/** Lê o resultado compartilhado (cache do servidor) — o navegador nunca chama o Google com chave. */
export function useClubMedSnowPlaces(slug: string | undefined) {
  return useQuery({
    queryKey: ["club-med-snow-places", slug],
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async (): Promise<ClubMedPlaces | null> => {
      const base = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${base}/functions/v1/club-med-snow-places`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) return null;
      // Recheck even if the deployed server predates this curation policy.
      const { photos, ...details } = await res.json();
      return { ...details, photos: details.stale ? [] : await selectReviewedGooglePhotos(slug!, photos) } as ClubMedPlaces;
    },
  });
}
