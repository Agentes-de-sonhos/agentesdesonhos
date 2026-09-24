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
