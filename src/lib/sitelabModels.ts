/**
 * SiteLab — registro de modelos de site (laboratório visual compartilhado).
 *
 * Cada modelo é um tenant SINTÉTICO: slug próprio, nome visível, logo, 3 cores
 * e `overrides` opcionais. Nenhum modelo usa user_id, domínio, slug ou conteúdo
 * de uma agência real — o laboratório é isolado por definição.
 *
 * A configuração pode vir do banco (`get_sitelab_template`), mas existe sempre
 * um fallback declarativo aqui para que a prévia funcione sem rede.
 */

export interface SiteLabPalette {
  /** Cor principal da marca e das ações principais. */
  primary: string;
  /** Segundo acento (ações secundárias, foco/borda ativa de controles). */
  secondary: string;
  /** Tom muito claro (fundos suaves, superfícies, miolo de intervalos). */
  tertiary: string;
  /** Fundo geral da página. */
  background: string;
}

export interface SiteLabModel {
  slug: string;
  /** Nome visível do modelo (nunca o nome de uma agência real). */
  name: string;
  /** Logo do próprio SiteLab — provisório e facilmente substituível. */
  logoUrl: string | null;
  palette: SiteLabPalette;
  /** Hostname do tenant técnico ligado a este modelo (ligação explícita). */
  adminHostname: string;
  /** Personalizações futuras por modelo, sem duplicar o template. */
  overrides: Record<string, unknown>;
}

/** UUID neutro: nenhum dado real é lido ou gravado pelas telas demonstrativas. */
export const SITELAB_DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Hostname do TENANT TÉCNICO do Site Lab (registrado em `agency_public_domains`).
 *
 * Não é um domínio público: existe para que o laboratório seja resolvido pelo
 * MESMO caminho de servidor das agências (get_agency_domain /
 * get_agency_admin_portal), com guard, autenticação e permissões reais. O
 * tenant é isolado e pode estar vazio — nenhum dado de agência real é usado.
 */
export const SITELAB_DEMO_HOSTNAME = "sitelab.local";

/** Prefixo de URL onde o laboratório monta o template compartilhado. */
export const SITELAB_BASE_PATH = "/sitelab-base";

/**
 * Helper central: a URL é da GESTÃO do laboratório?
 *
 * A gestão precisa ser decidida ANTES do router do App (o painel real usa o
 * workspace de abas, com um router por aba). Análogo a `isAgencyAdminPath`.
 */
export function isSiteLabAdminPath(pathname: string | null | undefined): boolean {
  const clean = (pathname || "").replace(/\/+$/, "");
  const base = `${SITELAB_BASE_PATH}/gestao`;
  return clean === base || clean.startsWith(`${base}/`);
}


/**
 * Helper central: identifica o contexto sintético do laboratório.
 * Nenhuma chamada a endpoints reais nem gravação de dados deve ocorrer quando true.
 */
export function isSiteLabDemoHost(hostname?: string | null): boolean {
  return (hostname || "").trim().toLowerCase() === SITELAB_DEMO_HOSTNAME;
}

export const SITELAB_BASE: SiteLabModel = {
  slug: "sitelab-base",
  name: "SiteLab Base",
  logoUrl: null,
  adminHostname: SITELAB_DEMO_HOSTNAME,
  palette: {
    primary: "#4B2A6E",
    secondary: "#FFD600",
    tertiary: "#F3EFF7",
    background: "#FFFFFF",
  },
  overrides: {},
};

export const SITELAB_MODELS: SiteLabModel[] = [SITELAB_BASE];

export function sitelabModelBySlug(slug: string | null | undefined): SiteLabModel | null {
  const key = (slug || "").trim().toLowerCase();
  return SITELAB_MODELS.find((m) => m.slug === key) ?? null;
}

export type SiteLabView = "site" | "clientArea" | "admin";

export const SITELAB_VIEWS: { view: SiteLabView; label: string; suffix: string }[] = [
  { view: "site", label: "Site", suffix: "" },
  { view: "clientArea", label: "Área do cliente", suffix: "/area-do-cliente" },
  { view: "admin", label: "Gestão", suffix: "/gestao" },
];

export function sitelabPath(slug: string, view: SiteLabView): string {
  const entry = SITELAB_VIEWS.find((v) => v.view === view);
  return `/${slug}${entry?.suffix ?? ""}`;
}

/** Converte a configuração pública (RPC) em modelo, preservando o fallback. */
export function sitelabModelFromRecord(
  fallback: SiteLabModel,
  record: unknown,
): SiteLabModel {
  const r = (record ?? null) as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return fallback;
  const str = (v: unknown, d: string | null) =>
    typeof v === "string" && v.trim() ? v.trim() : d;
  return {
    slug: str(r.slug, fallback.slug)!,
    name: str(r.name, fallback.name)!,
    logoUrl: str(r.logo_url, fallback.logoUrl),
    adminHostname: str(r.admin_hostname, fallback.adminHostname)!,
    palette: {
      primary: str(r.primary_color, fallback.palette.primary)!,
      secondary: str(r.secondary_color, fallback.palette.secondary)!,
      tertiary: str(r.tertiary_color, fallback.palette.tertiary)!,
      background: str(r.background_color, fallback.palette.background)!,
    },
    overrides:
      r.custom_overrides && typeof r.custom_overrides === "object"
        ? (r.custom_overrides as Record<string, unknown>)
        : fallback.overrides,
  };
}
