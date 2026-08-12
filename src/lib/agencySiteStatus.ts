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

export interface AgencySiteStatusConfig {
  status: AgencySiteStatus;
  /** CNPJ opcional para quando o cadastro da agência ainda não tiver o dado. */
  cnpj?: string;
}

const STATUS_BY_HOST: Record<string, AgencySiteStatusConfig> = {
  "100limites.tur.br": { status: "under_construction" },
  "www.100limites.tur.br": { status: "under_construction" },
  "paraisoviagens.com": { status: "under_construction" },
  "www.paraisoviagens.com": { status: "under_construction" },
};

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
