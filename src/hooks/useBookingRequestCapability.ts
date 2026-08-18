import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Capacidade efetiva de "Solicitação de reserva pelo orçamento web".
 *
 * A regra é resolvida SEMPRE no servidor
 * (`current_agency_can_use_booking_requests`): assinatura Premium ativa da
 * agência resolvida + site White Label ativo. A UI apenas reflete o resultado;
 * o banco revalida na ativação por orçamento e no envio público.
 */
export function useBookingRequestCapability() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["booking-requests-capability", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "current_agency_can_use_booking_requests" as any,
      );
      if (error) return false;
      return data === true;
    },
  });

  return { canUseBookingRequests: data === true, loading: isLoading };
}
