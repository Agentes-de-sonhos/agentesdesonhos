/**
 * Etapa 4 — URLs amigáveis por slug no host COMPARTILHADO de sites.
 *
 * Em `sites.agentesdesonhos.com.br/{agency_slug}` todas as superfícies do
 * tenant vivem sob o prefixo `/{slug}`:
 *   /{slug}                         → site
 *   /{slug}/gestao/*                → painel de gestão
 *   /{slug}/area-do-cliente/*       → Área do Cliente e viagens
 *   /{slug}/orcamento/:codigo       → orçamento público
 *   /{slug}/roteiro/:codigo         → roteiro público
 *   /{slug}/carteira/:codigo        → carteira digital
 *   /{slug}/fatura/:codigo          → fatura pública
 *
 * Regras invioláveis:
 * - genérico: nenhum slug/agência fica embutido no código;
 * - domínio próprio continua SEM prefixo (comportamento atual intacto);
 * - o slug é apenas um seletor de tenant; a resolução acontece no servidor e os
 *   códigos públicos continuam obrigatórios e não enumeráveis;
 * - o host compartilhado é sempre noindex/nofollow.
 */
import { normalizeHostname } from "./agencyDomains";

/** Hosts compartilhados que servem vários tenants por slug. */
export const SHARED_AGENCY_SITE_HOSTS = ["sites.agentesdesonhos.com.br"];

/** True quando o host atende múltiplos tenants pelo primeiro segmento da URL. */
export function isSharedAgencySiteHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname || "");
  return SHARED_AGENCY_SITE_HOSTS.includes(host);
}

/**
 * Primeiros segmentos que pertencem às superfícies do tenant — nunca podem ser
 * confundidos com um slug de agência.
 */
export const RESERVED_SLUG_SEGMENTS = new Set([
  "gestao",
  "area-do-cliente",
  "orcamento",
  "roteiro",
  "carteira",
  "viagem",
  "fatura",
  "ofertas",
  "preview",
  "login",
  "auth",
  "assets",
  "api",
  "static",
  "sitelab-base",
  "politicasdeprivacidade",
  "termosdeuso",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

/** Slug sintaticamente válido (não garante existência — isso é do servidor). */
export function isValidAgencySlug(slug: string | null | undefined): boolean {
  const value = (slug || "").trim().toLowerCase();
  if (!value || value.length < 2 || value.length > 60) return false;
  if (!SLUG_RE.test(value)) return false;
  if (value.includes("--")) return false;
  return !RESERVED_SLUG_SEGMENTS.has(value);
}

export interface AgencySlugLocation {
  /** Slug do tenant retirado do primeiro segmento da URL. */
  slug: string;
  /** Prefixo aplicado a todas as rotas (`/{slug}`) — basename do roteador. */
  basePath: string;
  /** Caminho interno, já sem o prefixo (sempre começa com "/"). */
  internalPath: string;
}

/**
 * Interpreta a URL no host compartilhado. Retorna `null` quando o host não é
 * compartilhado (domínio próprio: nada muda) ou quando não há slug válido.
 */
export function parseAgencySlugLocation(
  hostname: string,
  pathname: string,
): AgencySlugLocation | null {
  if (!isSharedAgencySiteHost(hostname)) return null;
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  const [first, ...rest] = clean.split("/").filter(Boolean);
  if (!first) return null;
  const slug = first.toLowerCase();
  if (!isValidAgencySlug(slug)) return null;
  return {
    slug,
    basePath: `/${slug}`,
    internalPath: `/${rest.join("/")}`.replace(/\/+$/, "") || "/",
  };
}

/** Prefixo de rotas em vigor na URL atual ("" em domínio próprio). */
export function agencyRouteBasePath(hostname: string, pathname: string): string {
  return parseAgencySlugLocation(hostname, pathname)?.basePath ?? "";
}

/** Aplica o prefixo do tenant a um caminho interno (idempotente). */
export function withAgencyBasePath(basePath: string, path: string): string {
  const base = (basePath || "").replace(/\/+$/, "");
  if (!base || !path.startsWith("/")) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path === "/" ? "" : path}` || "/";
}

/**
 * Hostname do tenant usado nas chamadas de servidor (Área do Cliente, gestão).
 * No host compartilhado o tenant NÃO vem do navegador: vem do registro
 * resolvido pelo slug, então usamos o hostname oficial da agência.
 */
export function tenantRequestHostname(
  browserHostname: string,
  resolvedHostname: string | null | undefined,
  fallback: string,
): string {
  if (isSharedAgencySiteHost(browserHostname)) {
    return normalizeHostname(resolvedHostname || "") || fallback;
  }
  return fallback;
}
