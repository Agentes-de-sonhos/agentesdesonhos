/**
 * Camada ÚNICA de geração de URLs públicas das ferramentas da agência
 * (orçamento, roteiro, carteira, fatura).
 *
 * Formato canônico dos sites-modelo (host compartilhado):
 *   https://vitrine.tur.br/{agency_slug}/{ferramenta}/{codigo-publico}
 *
 * Domínio próprio da agência (quando houver e for publicamente roteável):
 *   https://{dominio}/{ferramenta}/{codigo-publico}
 *
 * Regras:
 * - o slug é o slug canônico do site da agência (`agency_public_domains.agency_slug`),
 *   nunca um slug derivado do nome comercial;
 * - sem slug válido NÃO se gera URL: a UI mostra um erro orientativo;
 * - links legados `/{ferramenta}/{token}` continuam válidos e são preservados.
 */
import { CANONICAL_AGENCY_SITE_HOST, isValidAgencySlug } from "@/lib/agencySlugRouting";
import type { AgencyPublicToolKind } from "@/lib/agencyPublicToolRoutes";

/** Origem oficial dos sites-modelo (fallback quando não há domínio próprio). */
export const CANONICAL_PUBLIC_SITE_ORIGIN = `https://${CANONICAL_AGENCY_SITE_HOST}`;

export type PublicToolKind = AgencyPublicToolKind;

/** Hostnames internos/de teste que nunca podem virar link público. */
const NON_ROUTABLE_HOST_SUFFIXES = [".local", ".localhost", ".test", ".invalid", ".internal"];

/** Normaliza um slug de agência (minúsculas, sem espaços) ou devolve null. */
export function normalizeAgencySiteSlug(value: string | null | undefined): string | null {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug) return null;
  return isValidAgencySlug(slug) ? slug : null;
}

/** Host de domínio próprio utilizável em links públicos, ou null. */
export function normalizePublicHostname(value: string | null | undefined): string | null {
  const host = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (!host || host.includes("/") || !host.includes(".")) return null;
  if (NON_ROUTABLE_HOST_SUFFIXES.some((s) => host.endsWith(s))) return null;
  return host;
}

export interface PublicToolUrlInput {
  kind: PublicToolKind;
  /** Slug canônico do site da agência. */
  agencySlug?: string | null;
  /** Código público do documento (nunca o id interno). */
  accessCode?: string | null;
  /** Domínio próprio ativo da agência, quando houver. */
  customDomain?: string | null;
}

/**
 * URL pública canônica, ou `null` quando faltam slug/código válidos — nunca
 * devolve um endereço quebrado.
 */
export function buildPublicToolUrl({
  kind,
  agencySlug,
  accessCode,
  customDomain,
}: PublicToolUrlInput): string | null {
  const code = (accessCode ?? "").trim();
  if (!code) return null;

  const host = normalizePublicHostname(customDomain);
  if (host) return `https://${host}/${kind}/${code}`;

  const slug = normalizeAgencySiteSlug(agencySlug);
  if (!slug) return null;
  return `${CANONICAL_PUBLIC_SITE_ORIGIN}/${slug}/${kind}/${code}`;
}

/**
 * Link LEGADO por token (`/{ferramenta}/{token}`), preservado para orçamentos
 * publicados antes do código público. Continua resolvendo nas rotas atuais.
 */
export function buildLegacyToolUrl(
  kind: PublicToolKind,
  token: string | null | undefined,
  customDomain?: string | null,
): string | null {
  const value = (token ?? "").trim();
  if (!value) return null;
  const host = normalizePublicHostname(customDomain);
  if (host) return `https://${host}/${kind}/${value}`;
  const legacyHosts: Record<PublicToolKind, string> = {
    orcamento: "https://seuorcamento.tur.br",
    roteiro: "https://seuroteiro.tur.br",
    carteira: "https://carteiradigital.tur.br",
    fatura: CANONICAL_PUBLIC_SITE_ORIGIN,
  };
  return `${legacyHosts[kind]}/${kind}/${value}`;
}

export type PublicUrlResolution =
  | { ok: true; url: string; canonical: boolean }
  | { ok: false; error: string };

export const MISSING_SLUG_MESSAGE =
  "Esta agência ainda não tem endereço público configurado. Configure o site da agência para gerar o link do orçamento.";

/**
 * Resolve o link público de um orçamento: prefere o formato canônico com slug e
 * código público, cai no link legado por token e, quando nada é válido, devolve
 * um erro orientativo em vez de uma URL falsa.
 */
export function resolveQuotePublicUrl(input: {
  agencySlug?: string | null;
  accessCode?: string | null;
  shareToken?: string | null;
  customDomain?: string | null;
}): PublicUrlResolution {
  const canonicalUrl = buildPublicToolUrl({
    kind: "orcamento",
    agencySlug: input.agencySlug,
    accessCode: input.accessCode,
    customDomain: input.customDomain,
  });
  if (canonicalUrl) return { ok: true, url: canonicalUrl, canonical: true };

  const legacy = buildLegacyToolUrl("orcamento", input.shareToken, input.customDomain);
  if (legacy) return { ok: true, url: legacy, canonical: false };

  return { ok: false, error: MISSING_SLUG_MESSAGE };
}
