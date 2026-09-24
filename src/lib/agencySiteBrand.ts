/**
 * Override de logotipo por hostname do site White Label.
 *
 * Regra: o cadastro da agência (`info.logo_url`) continua sendo a fonte padrão.
 * O mapa abaixo existe apenas para tenants cujo logotipo definitivo foi enviado
 * como asset do projeto (arquivo oficial da marca), e nunca afeta outros
 * domínios.
 */
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import destinosComAJuLogo from "@/assets/whitelabel/logo-destinos-com-a-ju-2026.png.asset.json";
import destinosComAJuFavicon from "@/assets/whitelabel/favicon-destinos-com-a-ju.png.asset.json";
import paraisoLogo from "@/assets/whitelabel/logo-paraiso-viagens.png.asset.json";
import paraisoFavicon from "@/assets/whitelabel/favicon-paraiso-viagens.png.asset.json";
import essyaFavicon from "@/assets/whitelabel/favicon-essya-tur.png.asset.json";
import faeLogo from "@/assets/whitelabel/logo-fae-viagens.png.asset.json";
import casaNovaLogo from "@/assets/whitelabel/logo-casa-nova-tur.png.asset.json";

const LOGO_BY_HOSTNAME: Record<string, string> = {
  "destinoscomaju.com.br": destinosComAJuLogo.url,
  "www.destinoscomaju.com.br": destinosComAJuLogo.url,
  /** Versão horizontal recortada e transparente do logotipo oficial. */
  "paraisoviagens.com": paraisoLogo.url,
  "www.paraisoviagens.com": paraisoLogo.url,
  /** Emblema + assinatura tipográfica oficiais da Faé Viagens. */
  "faeviagens.com.br": faeLogo.url,
  "www.faeviagens.com.br": faeLogo.url,
  /** Casa Nova Tur — placeholder transparente enviado pela agência (host técnico). */
  "casanovatur.demo.local": casaNovaLogo.url,
};

const FAVICON_BY_HOSTNAME: Record<string, string> = {
  /** Pin vermelho com globo e avião da 100 Limites (aba do navegador). */
  "100limites.tur.br": limitesFavicon.url,
  "www.100limites.tur.br": limitesFavicon.url,
  "destinoscomaju.com.br": destinosComAJuFavicon.url,
  "www.destinoscomaju.com.br": destinosComAJuFavicon.url,
  "paraisoviagens.com": paraisoFavicon.url,
  "www.paraisoviagens.com": paraisoFavicon.url,
  /** Bússola dourada oficial da Essya Tur (aba do navegador). */
  "essyatur.com.br": essyaFavicon.url,
  "www.essyatur.com.br": essyaFavicon.url,
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
  "casanovatur.demo.local",
  "www.essyatur.com.br",
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

/** Favicon efetivo: ícone específico do hostname → logotipo efetivo do site. */
export function resolveAgencyFaviconUrl(info: AgencyDomainInfo): string | null {
  return FAVICON_BY_HOSTNAME[normalizeBrandHost(info.hostname)] ?? resolveAgencyLogoUrl(info);
}
