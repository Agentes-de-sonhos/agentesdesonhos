/**
 * Preset visual dos sites White Label.
 *
 * `classic` é o visual atual (mantido para todos os tenants) e `travelEditorial`
 * é a nova linguagem de portal de viagens, em avaliação e habilitada apenas para
 * os hostnames listados abaixo. Os tokens do preset ficam em `src/index.css`
 * (`.wl-editorial`), então nenhum estilo precisa ser espalhado pelos componentes.
 */
export type AgencySiteThemeKey = "classic" | "travelEditorial";

const THEME_BY_HOSTNAME: Record<string, AgencySiteThemeKey> = {
  "100limites.tur.br": "travelEditorial",
  "www.100limites.tur.br": "travelEditorial",
};

function normalizeHost(hostname?: string | null): string {
  return (hostname || "").trim().toLowerCase().replace(/:\d+$/, "");
}

export function resolveSiteTheme(hostname?: string | null): AgencySiteThemeKey {
  return THEME_BY_HOSTNAME[normalizeHost(hostname)] ?? "classic";
}

/** Atalho de apresentação: o hostname usa o preset editorial? */
export function isEditorialTheme(hostname?: string | null): boolean {
  return resolveSiteTheme(hostname) === "travelEditorial";
}

/** Classe raiz que ativa os tokens do preset (aplicada só no site white label). */
export const EDITORIAL_ROOT_CLASS = "wl-editorial";

/** Largura de conteúdo do preset editorial (~1200px) e do visual clássico. */
export function siteContainer(editorial: boolean): string {
  return editorial
    ? "mx-auto w-full max-w-[1200px] px-5 md:px-8"
    : "mx-auto max-w-6xl px-4";
}
