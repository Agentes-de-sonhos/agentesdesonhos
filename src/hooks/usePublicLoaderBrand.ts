import { useQuery } from "@tanstack/react-query";
import { fetchAgencyBySlug, type AgencyDomainInfo } from "@/lib/agencyDomains";

/**
 * Marca mínima (logotipo + nome) para a tela de carregamento dos links
 * públicos. Usa o RPC `get_agency_by_slug` (SECURITY DEFINER, somente domínios
 * ativos), então o navegador nunca escolhe o tenant: apenas informa o slug.
 *
 * Leitura de apresentação, cacheada, sem qualquer dado privado.
 */
export function usePublicLoaderBrand(agencySlug?: string | null) {
  const slug = (agencySlug || "").trim().toLowerCase();

  const { data } = useQuery<AgencyDomainInfo | null>({
    queryKey: ["public-loader-brand", slug],
    queryFn: () => fetchAgencyBySlug(slug),
    enabled: slug.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    logoUrl: data?.logo_url ?? null,
    agencyName: data?.agency_name ?? data?.owner_name ?? null,
  };
}
