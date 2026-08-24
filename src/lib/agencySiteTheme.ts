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
  | "roseEditorial";

const THEME_BY_HOSTNAME: Record<string, AgencySiteThemeKey> = {
  "100limites.tur.br": "travelEditorial",
  "www.100limites.tur.br": "travelEditorial",
  "paraisoviagens.com": "luxuryEditorial",
  "www.paraisoviagens.com": "luxuryEditorial",
  "destinoscomaju.com.br": "roseEditorial",
  "www.destinoscomaju.com.br": "roseEditorial",
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteTheme(hostname?: string | null): AgencySiteThemeKey {
  return THEME_BY_HOSTNAME[normalizeHost(hostname)] ?? "classic";
}

/**
 * Atalho de apresentação: o hostname usa a FAMÍLIA editorial de layout?
 * (true para `travelEditorial` e `luxuryEditorial`.)
 */
export function isEditorialTheme(hostname?: string | null): boolean {
  const theme = resolveSiteTheme(hostname);
  return (
    theme === "travelEditorial" || theme === "luxuryEditorial" || theme === "roseEditorial"
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

/** Classe(s) raiz do tema resolvido — única fonte de verdade para o layout. */
export function siteThemeRootClass(hostname?: string | null): string {
  const theme = resolveSiteTheme(hostname);
  if (theme === "luxuryEditorial") return `${EDITORIAL_ROOT_CLASS} ${LUXURY_ROOT_CLASS}`;
  if (theme === "roseEditorial") return `${EDITORIAL_ROOT_CLASS} ${ROSE_ROOT_CLASS}`;
  if (theme === "travelEditorial") return EDITORIAL_ROOT_CLASS;
  return "";
}

/** Largura de conteúdo do preset editorial (~1200px) e do visual clássico. */
export function siteContainer(editorial: boolean): string {
  return editorial
    ? "mx-auto w-full max-w-[1200px] px-5 md:px-8"
    : "mx-auto max-w-6xl px-4";
}
