import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useAgencyCustomDomain } from "@/hooks/useAgencyCustomDomain";
import { fetchAgentProfile } from "@/hooks/useAgentProfile";

/**
 * Contexto necessário para montar links públicos: nome da agência do dono
 * (master, mesmo quando o usuário logado é colaborador) e domínio
 * personalizado ativo. Somente leitura.
 */
export function useAgencyPublicLinkContext() {
  const { agencyOwnerId } = useAgencyOwnerId();
  const { customDomain } = useAgencyCustomDomain();

  const { data: agencyName } = useQuery({
    queryKey: ["agency-public-link-name", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const profile = await fetchAgentProfile(agencyOwnerId as string, supabase);
      return profile?.agency_name || profile?.name || null;
    },
  });

  return {
    agencyName: (agencyName as string | null | undefined) ?? null,
    customDomain,
  };
}
