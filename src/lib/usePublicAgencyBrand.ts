import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAgencyBrand {
  agency_primary_color: string | null;
  agency_secondary_color: string | null;
  agency_secondary_auto: boolean | null;
  agency_tertiary_color: string | null;
  agency_tertiary_auto: boolean | null;
  agency_on_secondary_color: string | null;
}

/**
 * Cores da identidade visual da agência para páginas PÚBLICAS.
 *
 * Alguns payloads públicos (orçamento por token/código, carteira digital)
 * entregam apenas dados de apresentação do agente (nome, telefone, logo) e não
 * carregam os campos de marca. Este hook busca somente os campos de marca no
 * cadastro vivo através de `get_public_profile` (RPC já liberada para leitura
 * anônima), sem expor nenhum dado privado adicional.
 *
 * Perfis antigos/valores nulos retornam nulos e o resolvedor de paleta mantém
 * o fallback automático atual.
 */
export function usePublicAgencyBrand(
  userId: string | null | undefined,
  options: { enabled?: boolean } = {},
): PublicAgencyBrand | null {
  const { data } = useQuery({
    queryKey: ["public-agency-brand", userId],
    queryFn: async (): Promise<PublicAgencyBrand | null> => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("get_public_profile", { _user_id: userId });
      if (error || !data) return null;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        agency_primary_color: (row.agency_primary_color as string | null) ?? null,
        agency_secondary_color: (row.agency_secondary_color as string | null) ?? null,
        agency_secondary_auto: (row.agency_secondary_auto as boolean | null) ?? null,
        agency_tertiary_color: (row.agency_tertiary_color as string | null) ?? null,
        agency_tertiary_auto: (row.agency_tertiary_auto as boolean | null) ?? null,
        agency_on_secondary_color: (row.agency_on_secondary_color as string | null) ?? null,
      };
    },
    // As cores mudam raramente, mas precisam aparecer ao recarregar o link
    // público depois de salvar no Perfil: sem cache longo entre sessões.
    staleTime: 60_000,
    enabled: !!userId && options.enabled !== false,
  });

  return data ?? null;
}
