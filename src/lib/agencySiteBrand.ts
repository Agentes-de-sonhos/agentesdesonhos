/**
 * Override de logotipo por hostname do site White Label.
 *
 * Regra: o cadastro da agência (`info.logo_url`) continua sendo a fonte padrão.
 * O mapa abaixo existe apenas para tenants cujo logotipo definitivo foi enviado
 * como asset do projeto (arquivo oficial da marca), e nunca afeta outros
 * domínios.
 */
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import destinosComAJuLogo from "@/assets/whitelabel/logo-destinos-com-a-ju-atualizado.png.asset.json";
import paraisoLogo from "@/assets/whitelabel/logo-paraiso-viagens.png.asset.json";
import faeLogo from "@/assets/whitelabel/logo-fae-viagens.png.asset.json";

const LOGO_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": destinosComAJuLogo.url,
  "www.destinoscomaju.com.br": destinosComAJuLogo.url,
  /** Versão horizontal recortada e transparente do logotipo oficial. */
  "paraisoviagens.com": paraisoLogo.url,
  "www.paraisoviagens.com": paraisoLogo.url,
  /** Emblema + assinatura tipográfica oficiais da Faé Viagens. */
  "faeviagens.com.br": faeLogo.url,
  "www.faeviagens.com.br": faeLogo.url,
};

/**
 * Metadado reutilizável: o logotipo do hostname já contém o nome da marca.
 * Quando true, a apresentação NÃO repete o nome ao lado do logotipo.
 */
const LOGO_WITH_WORDMARK_HOSTS = new Set([
  "paraisoviagens.com",
  "www.paraisoviagens.com",
  "faeviagens.com.br",
  "www.faeviagens.com.br",
]);

export function normalizeBrandHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** Logotipo oficial do hostname (asset do projeto), quando existir. */
export function resolveAgencyLogoOverride(hostname?: string | null): string | null {
  return LOGO_BY_HOSTNAME[normalizeBrandHost(hostname)] ?? null;
}

/** O logotipo do hostname já é um wordmark (nome incluído na arte)? */
export function logoIncludesWordmark(hostname?: string | null): boolean {
  return LOGO_WITH_WORDMARK_HOSTS.has(normalizeBrandHost(hostname));
}

/** Logotipo efetivo do site: override oficial → cadastro da agência → nulo. */
export function resolveAgencyLogoUrl(info: AgencyDomainInfo): string | null {
  return resolveAgencyLogoOverride(info.hostname) ?? info.logo_url ?? null;
}
