import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleReviewsEnabled, mapGooglePlaceReviews } from "@/lib/agencyGoogleReviews";

/**
 * Busca sob demanda (quando `active`), deduplicada enquanto a requisição está ativa.
 * Conteúdo do Google não é retido após o componente sair da tela (política do Places).
 */
export function useAgencyGoogleReviews(hostname: string, active: boolean) {
  const enabled = active && isGoogleReviewsEnabled(hostname);
  return useQuery({
    queryKey: ["agency-google-reviews", hostname.toLowerCase()],
    enabled,
    staleTime: Infinity, // sem refetch enquanto montado
    gcTime: 0, // descarta o conteúdo ao desmontar
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // fetch direto: 404 ({enabled:false}) é estado normal, não erro de tela
      const base = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      let res: Response;
      try {
        res = await fetch(`${base}/functions/v1/google-place-reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
          body: JSON.stringify({ hostname }),
        });
      } catch {
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return mapGooglePlaceReviews(data) ?? null;
    },
  });
}
