/**
 * Preset visual dos sites White Label.
 *
 * `classic` é o visual atual (mantido para todos os tenants), `travelEditorial`
 * é a linguagem de portal de viagens (100 Limites) e `luxuryEditorial` é o
 * acabamento de curadoria de luxo (Paraíso Viagens). Os tokens ficam em
 * `src/index.css` (`.wl-editorial` e `.wl-luxury`), então nenhum estilo precisa
 * ser espalhado pelos componentes.
 *
 * IMPORTANTE: `luxuryEditorial` reaproveita integralmente o LAYOUT editorial —
 * apenas troca tokens, tipografia e acabamento.
 */
export type AgencySiteThemeKey =
  | "classic"
  | "travelEditorial"
  | "luxuryEditorial"
  /** Mesmo layout editorial, identidade rosé/magenta (Destinos com a Ju). */
  | "roseEditorial"
  /** Mesmo layout editorial, identidade roxo profundo + dourado (Faé Viagens). */
  | "faeEditorial"
  /** Mesmo layout editorial, acabamento base NEUTRO (SiteLab Base). */
  | "siteBaseEditorial"
  /** Mesmo layout editorial, identidade verde floresta + mint (Casa Nova Tur). */
  | "casaNovaEditorial"
  /** Mesmo layout editorial, identidade azul #164F76 + amarelo #FDC700 (Essyatur). */
  | "essyaEditorial";

const THEME_BY_HOSTNAME: Record<string, AgencySiteThemeKey> = {
  "arenatravelgroup.com.br": "siteBaseEditorial",
  "www.arenatravelgroup.com.br": "siteBaseEditorial",
  "innovati.tur.br": "siteBaseEditorial",
  "www.innovati.tur.br": "siteBaseEditorial",
  "100limites.tur.br": "travelEditorial",
  "www.100limites.tur.br": "travelEditorial",
  "paraisoviagens.com": "luxuryEditorial",
  "www.paraisoviagens.com": "luxuryEditorial",
  "destinoscomaju.com.br": "roseEditorial",
  "www.destinoscomaju.com.br": "roseEditorial",
  "faeviagens.com.br": "faeEditorial",
  "www.faeviagens.com.br": "faeEditorial",
  "sitelab.local": "siteBaseEditorial",
  "casanovatur.demo.local": "casaNovaEditorial",
  "essyatur.com.br": "siteBaseEditorial",
  "www.essyatur.com.br": "siteBaseEditorial",
  "briefing-14-v1.preview.local": "siteBaseEditorial",
  "omundoemcores.com.br": "siteBaseEditorial",
  "www.omundoemcores.com.br": "siteBaseEditorial",
  "briefing-16-v1.preview.local": "siteBaseEditorial",
  "briefing-17-v1.preview.local": "siteBaseEditorial",
  "briefing-19-v1.preview.local": "siteBaseEditorial",
  "briefing-20-v1.preview.local": "siteBaseEditorial",
  "curtiviagens.com.br": "siteBaseEditorial",
  "www.curtiviagens.com.br": "siteBaseEditorial",
  "briefing-21-v1.preview.local": "siteBaseEditorial",
  "immturismo.com.br": "siteBaseEditorial",
  "www.immturismo.com.br": "siteBaseEditorial",
  "bagagemnamao.com.br": "siteBaseEditorial",
  "www.bagagemnamao.com.br": "siteBaseEditorial",
  "kaributurismo.com.br": "siteBaseEditorial",
  "www.kaributurismo.com.br": "siteBaseEditorial",
  "briefing-22-v1.preview.local": "siteBaseEditorial",
  "pristur.com.br": "siteBaseEditorial",
  "www.pristur.com.br": "siteBaseEditorial",
  "briefing-23-v1.preview.local": "siteBaseEditorial",
  "briefing-24-v1.preview.local": "siteBaseEditorial",
  "briefing-25-v1.preview.local": "siteBaseEditorial",
  "briefing-27-v1.preview.local": "siteBaseEditorial",
  "briefing-28-v1.preview.local": "siteBaseEditorial",
  "briefing-29-v1.preview.local": "siteBaseEditorial",
  "briefing-30-v1.preview.local": "siteBaseEditorial",
  "briefing-31-v1.preview.local": "siteBaseEditorial",
  "shoppingviagens.com.br": "siteBaseEditorial",
  "www.shoppingviagens.com.br": "siteBaseEditorial",
  "essya-curti-v1.preview.local": "siteBaseEditorial",
  "drica-presentation.preview.local": "siteBaseEditorial",
  "dricaviagens.com.br": "siteBaseEditorial",
  "www.dricaviagens.com.br": "siteBaseEditorial",
  "bardelli-mundo.preview.local": "siteBaseEditorial",
  "bardelli-imm.preview.local": "siteBaseEditorial",
  "bardelli-presentation.preview.local": "siteBaseEditorial",
  "bardelliviagens.com.br": "siteBaseEditorial",
  "www.bardelliviagens.com.br": "siteBaseEditorial",
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteTheme(hostname?: string | null): AgencySiteThemeKey {
  return THEME_BY_HOSTNAME[normalizeHost(hostname)] ?? "classic";
}

/**
 * Atalho de apresentação: o hostname usa a FAMÍLIA editorial de layout?
 * (true para todos os presets editoriais.)
 */
export function isEditorialTheme(hostname?: string | null): boolean {
  const theme = resolveSiteTheme(hostname);
  return (
    theme === "travelEditorial" ||
    theme === "luxuryEditorial" ||
    theme === "roseEditorial" ||
    theme === "faeEditorial" ||
    theme === "siteBaseEditorial" ||
    theme === "casaNovaEditorial" ||
    theme === "essyaEditorial"
  );
}

/** O hostname usa o acabamento de luxo (variações finas sobre o editorial)? */
export function isLuxuryTheme(hostname?: string | null): boolean {
  return resolveSiteTheme(hostname) === "luxuryEditorial";
}

/** Classe raiz que ativa os tokens do preset (aplicada só no site white label). */
export const EDITORIAL_ROOT_CLASS = "wl-editorial";
export const LUXURY_ROOT_CLASS = "wl-luxury";
export const ROSE_ROOT_CLASS = "wl-rose";
export const FAE_ROOT_CLASS = "wl-fae";
export const SITE_BASE_ROOT_CLASS = "wl-site-base";
export const CASA_NOVA_ROOT_CLASS = "wl-casanova";
export const ESSYA_ROOT_CLASS = "wl-essya";

/** Classe(s) raiz do tema resolvido — única fonte de verdade para o layout. */
export function siteThemeRootClass(hostname?: string | null): string {
  const theme = resolveSiteTheme(hostname);
  if (theme === "luxuryEditorial") return `${EDITORIAL_ROOT_CLASS} ${LUXURY_ROOT_CLASS}`;
  if (theme === "roseEditorial") return `${EDITORIAL_ROOT_CLASS} ${ROSE_ROOT_CLASS}`;
  if (theme === "faeEditorial") return `${EDITORIAL_ROOT_CLASS} ${FAE_ROOT_CLASS}`;
  if (theme === "siteBaseEditorial") {
    // O Mundo em Cores: acabamento claro próprio, só no host da prévia.
    const h = normalizeHost(hostname);
    const extra =
      h === "drica-presentation.preview.local" || h === "dricaviagens.com.br" || h === "www.dricaviagens.com.br"
        ? " wl-drica"
        : h === "briefing-22-v1.preview.local" || h === "pristur.com.br" || h === "www.pristur.com.br"
        ? " wl-mundo wl-pristur-mundo"
        : h === "immturismo.com.br" || h === "www.immturismo.com.br"
        ? " wl-mundo wl-shopping-mundo wl-imm"
        : h === "briefing-25-v1.preview.local" || h === "shoppingviagens.com.br" || h === "www.shoppingviagens.com.br"
        ? " wl-mundo wl-shopping-mundo"
        : h === "briefing-24-v1.preview.local" || h === "innovati.tur.br" || h === "www.innovati.tur.br"
        ? " wl-mundo wl-innovati-mundo"
        : h === "briefing-19-v1.preview.local" || h === "bagagemnamao.com.br" || h === "www.bagagemnamao.com.br"
        ? " wl-mundo wl-bagagem-mundo"
        : h === "bardelli-imm.preview.local" || h === "bardelli-mundo.preview.local" || h === "bardelliviagens.com.br" || h === "www.bardelliviagens.com.br"
        ? " wl-mundo wl-bardelli-mundo"
        : h === "briefing-23-v1.preview.local" || h === "arenatravelgroup.com.br" || h === "www.arenatravelgroup.com.br"
        ? " wl-mundo wl-arena"
        : h === "briefing-21-v1.preview.local" || h === "kaributurismo.com.br" || h === "www.kaributurismo.com.br"
        ? " wl-mundo wl-karibu"
        : h === "briefing-14-v1.preview.local" || h === "omundoemcores.com.br" || h === "www.omundoemcores.com.br"
        ? " wl-mundo"
        : h === "bardelliviagens.com.br" || h === "www.bardelliviagens.com.br"
          ? " wl-bardelli wl-bardelli-official"
          : h === "bardelli-presentation.preview.local"
          ? " wl-bardelli"
          : h === "briefing-20-v1.preview.local" || h === "curtiviagens.com.br" || h === "www.curtiviagens.com.br"
          ? " wl-curti"
          : h === "essya-curti-v1.preview.local"
          ? " wl-curti wl-essya-curti"
          : h === "essyatur.com.br" || h === "www.essyatur.com.br"
          ? " wl-curti wl-essya-curti"
          : "";
    return `${EDITORIAL_ROOT_CLASS} ${SITE_BASE_ROOT_CLASS}${extra}`;
  }
  if (theme === "casaNovaEditorial") return `${EDITORIAL_ROOT_CLASS} ${CASA_NOVA_ROOT_CLASS}`;
  if (theme === "essyaEditorial") return `${EDITORIAL_ROOT_CLASS} ${ESSYA_ROOT_CLASS}`;
  if (theme === "travelEditorial") return EDITORIAL_ROOT_CLASS;
  return "";
}

/** Largura de conteúdo do preset editorial (~1200px) e do visual clássico. */
export function siteContainer(editorial: boolean): string {
  return editorial
    ? "mx-auto w-full max-w-[1200px] px-5 md:px-8"
    : "mx-auto max-w-6xl px-4";
}
