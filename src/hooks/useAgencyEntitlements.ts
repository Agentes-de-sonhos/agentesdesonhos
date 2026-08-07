import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";

/**
 * Entitlements (capabilities) concedidos em nível de AGÊNCIA.
 *
 * IMPORTANTE: isto NÃO é plano de assinatura. Premium != VIP.
 * `subscription_plan` continua controlando o produto SaaS padrão; entitlements
 * representam pacotes comerciais especiais (ex.: site integrado / Área do
 * Cliente VIP) concedidos manualmente pela plataforma por agência.
 *
 * Titular e membros de equipe da mesma agência resolvem para o MESMO agency_id
 * (via `current_agency_id()` no servidor), então herdam o entitlement.
 */
export const AGENCY_ENTITLEMENTS = {
  vip_client_portal: "vip_client_portal",
  booking_requests: "booking_requests",
} as const;

export type AgencyEntitlementKey =
  (typeof AGENCY_ENTITLEMENTS)[keyof typeof AGENCY_ENTITLEMENTS];

export const AGENCY_ENTITLEMENT_LABELS: Record<AgencyEntitlementKey, string> = {
  vip_client_portal: "Área do Cliente VIP / site integrado",
  booking_requests: "Pedidos de reserva pelo orçamento",
};

export const AGENCY_ENTITLEMENT_DESCRIPTIONS: Record<AgencyEntitlementKey, string> = {
  vip_client_portal:
    "Portal único do cliente com linha do tempo da viagem, exclusivo do pacote VIP com site administrado pela plataforma.",
  booking_requests:
    "Permite que o cliente selecione serviços no orçamento web e envie um pedido de reserva para análise da agência.",
};

interface ActiveEntitlement {
  entitlement_key: string;
  ends_at: string | null;
}

export function useAgencyEntitlements() {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();

  const { data, isLoading } = useQuery({
    queryKey: ["agency-entitlements", agencyOwnerId],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // RPC resolve a agência no servidor (titular ou colaborador) e já aplica
      // is_active + vigência starts_at/ends_at.
      const { data, error } = await supabase.rpc("current_agency_entitlements" as any);
      if (error) return [] as ActiveEntitlement[];
      return ((data || []) as ActiveEntitlement[]);
    },
  });

  const active = new Set((data || []).map((d) => d.entitlement_key));

  const hasAgencyEntitlement = (key: AgencyEntitlementKey | string) => active.has(key);

  return {
    hasAgencyEntitlement,
    entitlements: data || [],
    agencyId: agencyOwnerId,
    loading: isLoading,
  };
}
