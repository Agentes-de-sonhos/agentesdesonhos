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

const LOGO_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": destinosComAJuLogo.url,
  "www.destinoscomaju.com.br": destinosComAJuLogo.url,
};

export function normalizeBrandHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

/** Logotipo oficial do hostname (asset do projeto), quando existir. */
export function resolveAgencyLogoOverride(hostname?: string | null): string | null {
  return LOGO_BY_HOSTNAME[normalizeBrandHost(hostname)] ?? null;
}

/** Logotipo efetivo do site: override oficial → cadastro da agência → nulo. */
export function resolveAgencyLogoUrl(info: AgencyDomainInfo): string | null {
  return resolveAgencyLogoOverride(info.hostname) ?? info.logo_url ?? null;
}
