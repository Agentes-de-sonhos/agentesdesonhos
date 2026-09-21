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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUserId(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

/**
 * Resolve o identificador da agência somente a partir de dados já presentes
 * no payload público. Links antigos não expõem `quote.user_id`, mas snapshots
 * de assinatura e URLs públicas de logo/avatar já carregam esse identificador.
 */
export function resolvePublicAgencyUserId(
  quote: Record<string, unknown> | null | undefined,
  profile: Record<string, unknown> | null | undefined,
): string | null {
  const direct = validUserId(quote?.user_id) ?? validUserId(profile?.user_id);
  if (direct) return direct;

  const signature = quote?.signature_snapshot;
  if (signature && typeof signature === "object") {
    const signatureId = (signature as Record<string, unknown>).id;
    if (typeof signatureId === "string") {
      const fromSignature = validUserId(signatureId.replace(/^system:/, ""));
      if (fromSignature) return fromSignature;
    }
  }

  for (const value of [profile?.agency_logo_url, profile?.avatar_url]) {
    if (typeof value !== "string") continue;
    const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    const fromPublicAsset = validUserId(match?.[0]);
    if (fromPublicAsset) return fromPublicAsset;
  }

  return null;
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
