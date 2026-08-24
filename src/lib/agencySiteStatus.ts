/**
 * Status de publicação do site White Label, por hostname.
 *
 * Config declarativa: o default é sempre "live", então nenhum tenant existente
 * é afetado. Para colocar (ou tirar) um domínio em modo "site em construção",
 * basta editar `STATUS_BY_HOST` — nenhum condicional novo nos componentes.
 *
 * IMPORTANTE: o status vale APENAS para a home ("/"). Rotas transacionais
 * públicas (/orcamento, /roteiro, /carteira, /fatura) nunca são bloqueadas.
 */
export type AgencySiteStatus = "live" | "under_construction";

/**
 * Variante visual da página temporária. `default` é a página institucional
 * genérica (usada por todos os tenants atuais); variantes nomeadas são
 * acabamentos exclusivos de um domínio, fáceis de remover quando o site
 * completo entrar no ar.
 */
export type AgencyConstructionVariant = "default" | "destinosComAJu";

export interface AgencySiteStatusConfig {
  status: AgencySiteStatus;
  /** CNPJ opcional para quando o cadastro da agência ainda não tiver o dado. */
  cnpj?: string;
  variant?: AgencyConstructionVariant;
}

const STATUS_BY_HOST: Record<string, AgencySiteStatusConfig> = {
  "100limites.tur.br": { status: "under_construction" },
  "www.100limites.tur.br": { status: "under_construction" },
  "paraisoviagens.com": { status: "under_construction" },
  "www.paraisoviagens.com": { status: "under_construction" },
};

/** Variante da página temporária configurada para o hostname. */
export function resolveConstructionVariant(hostname?: string | null): AgencyConstructionVariant {
  return resolveSiteStatusConfig(hostname).variant ?? "default";
}

export function normalizeStatusHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteStatusConfig(hostname?: string | null): AgencySiteStatusConfig {
  return STATUS_BY_HOST[normalizeStatusHost(hostname)] ?? { status: "live" };
}

export function resolveSiteStatus(hostname?: string | null): AgencySiteStatus {
  return resolveSiteStatusConfig(hostname).status;
}

export function isUnderConstruction(hostname?: string | null): boolean {
  return resolveSiteStatus(hostname) === "under_construction";
}

/* ---------------------- BYPASS DE PREVIEW (Lovable apenas) ------------------- */

/**
 * Hostnames técnicos de preview (Lovable) e de desenvolvimento local.
 * Nunca inclui domínios reais de agência nem o domínio publicado.
 */
function isLovablePreviewHost(actualHostname?: string | null): boolean {
  const host = normalizeStatusHost(actualHostname);
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  return (
    (host.startsWith("id-preview--") || host.startsWith("preview--")) &&
    host.endsWith(".lovable.app")
  );
}

/**
 * Permite revisar a home de um tenant `under_construction` APENAS no hostname
 * técnico de preview do Lovable, com `?__agency_preview=1`.
 *
 * Jamais funciona no domínio real da agência, no domínio publicado
 * (agentedesonhoproject.lovable.app) ou em qualquer outro host.
 */
export function isConstructionPreviewBypass(
  actualHostname?: string | null,
  search?: string | null,
): boolean {
  if (!isLovablePreviewHost(actualHostname)) return false;
  return new URLSearchParams(search || "").get("__agency_preview") === "1";
}

/** Status efetivo da home considerando o bypass de preview. */
export function shouldRenderUnderConstruction(
  agencyHostname?: string | null,
  actualHostname?: string | null,
  search?: string | null,
): boolean {
  if (!isUnderConstruction(agencyHostname)) return false;
  return !isConstructionPreviewBypass(actualHostname, search);
}

/** CNPJ configurado para o hostname (fallback quando o perfil não tem o dado). */
export function configuredCnpj(hostname?: string | null): string | null {
  return resolveSiteStatusConfig(hostname).cnpj ?? null;
}

/** Rotas públicas que NUNCA podem ser afetadas pelo status da home. */
export const ALWAYS_PUBLIC_ROUTE_PREFIXES = [
  "/orcamento/",
  "/roteiro/",
  "/carteira/",
  "/fatura/",
  "/area-do-cliente",
  "/ofertas",
  "/politicasdeprivacidade",
  "/termosdeuso",
];

/** Superfície que a rota "/" deve renderizar para um hostname. */
export function resolveHomeSurface(
  hostname?: string | null,
): "under_construction" | "site_home" {
  return isUnderConstruction(hostname) ? "under_construction" : "site_home";
}

/**
 * O status de publicação só governa a home. Qualquer outra rota pública
 * (incluindo links transacionais por código) segue liberada.
 */
export function isRouteGatedByStatus(pathname: string, hostname?: string | null): boolean {
  const path = pathname || "/";
  if (ALWAYS_PUBLIC_ROUTE_PREFIXES.some((p) => path === p || path.startsWith(p))) return false;
  return path === "/" && isUnderConstruction(hostname);
}
