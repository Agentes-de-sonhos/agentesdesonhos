import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { normalizeAgencySiteSlug, normalizePublicHostname } from "@/lib/publicAgencyUrls";

export interface AgencyPublicSite {
  /** Slug canônico do site da agência (host compartilhado). */
  agencySlug: string | null;
  /** Domínio próprio publicamente roteável, quando houver. */
  customDomain: string | null;
}

/**
 * Identidade pública da agência do usuário logado: slug canônico e domínio
 * próprio. Fonte única para montar links públicos (orçamento, roteiro, carteira).
 */
export function useAgencyPublicSite() {
  const { agencyOwnerId } = useAgencyOwnerId();

  const { data, isLoading } = useQuery({
    queryKey: ["agency-public-site", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AgencyPublicSite> => {
      const { data, error } = await supabase
        .from("agency_public_domains" as any)
        .select("hostname, agency_slug, is_primary")
        .eq("user_id", agencyOwnerId as string)
        .eq("is_active", true)
        .order("is_primary", { ascending: false });
      if (error) return { agencySlug: null, customDomain: null };
      const rows = ((data as any[]) ?? []) as { hostname: string; agency_slug: string }[];
      const agencySlug =
        rows.map((r) => normalizeAgencySiteSlug(r.agency_slug)).find((s) => !!s) ?? null;
      const customDomain =
        rows.map((r) => normalizePublicHostname(r.hostname)).find((h) => !!h) ?? null;
      return { agencySlug, customDomain };
    },
  });

  return {
    agencySlug: data?.agencySlug ?? null,
    customDomain: data?.customDomain ?? null,
    isLoading,
  };
}
