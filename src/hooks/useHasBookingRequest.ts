import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Verificação leve: existe pelo menos um pedido de reserva ATIVO nesta oportunidade?
 * Só lê o id (nada de dados do cliente ou valores) e depende da RLS existente.
 */
export function useHasBookingRequest(opportunityId?: string | null, enabled = true) {
  const query = useQuery({
    queryKey: ["has-booking-request", opportunityId],
    enabled: !!opportunityId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_booking_requests")
        .select("id")
        .eq("opportunity_id", opportunityId as string)
        .not("status", "in", "(superseded,cancelled,expired)")
        .limit(1);
      if (error) throw error;
      return (data?.length || 0) > 0;
    },
  });

  return { hasBookingRequest: query.data === true, isLoading: query.isLoading };
}