/**
 * Navegação interna da Gestão demonstrativa do Site Lab.
 *
 * Os destinos são DERIVADOS dos destinos reais da fonte única
 * (`agencyAdminMenu`), mas sempre dentro da rota protegida do laboratório
 * (`/sitelab-base/gestao?destino=...`). Nunca se navega para `/gestao` real,
 * e a seleção sobrevive a voltar/avançar e a recarregar a página.
 */
import {
  AGENDA_ITEM,
  CREATE_ITEMS,
  MANAGEMENT_ITEMS,
  PROJECTS_ITEMS,
  PROJECTS_ROOT,
  USER_ITEMS,
  type MenuItemDef,
} from "@/lib/agencyAdminMenu";

export const SITELAB_ADMIN_PATH = "/sitelab-base/gestao";

/** Superfícies demonstrativas: cada categoria tem seu próprio formato visual. */
export type SiteLabSurfaceKind =
  | "home"
  | "editor"
  | "projects"
  | "kanban"
  | "clients"
  | "bookings"
  | "financial"
  | "agenda"
  | "account";

/** Slug estável derivado do destino real (sem expor rota navegável). */
export function destinoSlug(to: string): string {
  return to
    .replace(/^\//, "")
    .replace(/[/?=]+/g, "-")
    .toLowerCase();
}

export function sitelabAdminHref(item: MenuItemDef): string {
  return `${SITELAB_ADMIN_PATH}?destino=${destinoSlug(item.to)}`;
}

export const SITELAB_ADMIN_HOME = SITELAB_ADMIN_PATH;

export const SITELAB_ADMIN_PROJECTS_HREF = `${SITELAB_ADMIN_PATH}?destino=${destinoSlug(
  `${PROJECTS_ROOT}?tab=orcamentos`,
)}`;

/** Todos os itens navegáveis do laboratório, derivados da fonte única. */
export const SITELAB_ADMIN_ITEMS: MenuItemDef[] = [
  ...CREATE_ITEMS,
  ...PROJECTS_ITEMS,
  AGENDA_ITEM,
  ...MANAGEMENT_ITEMS,
  ...USER_ITEMS,
];

export function itemForDestino(destino: string | null): MenuItemDef | null {
  if (!destino) return null;
  const key = destino.trim().toLowerCase();
  return SITELAB_ADMIN_ITEMS.find((item) => destinoSlug(item.to) === key) ?? null;
}

/** Categoria visual de cada destino (cabeçalho/toolbar/tabs correspondentes). */
export function surfaceKindFor(item: MenuItemDef | null): SiteLabSurfaceKind {
  if (!item) return "home";
  const to = item.to;
  if (to.startsWith("/gestao/criar/")) return "editor";
  if (to.startsWith(PROJECTS_ROOT)) return "projects";
  if (to.includes("/funil") || to.includes("/operacoes")) return "kanban";
  if (to.includes("/clientes")) return "clients";
  if (to.startsWith("/gestao/reservas")) return "bookings";
  if (to.startsWith("/gestao/financeiro")) return "financial";
  if (to.startsWith("/gestao/agenda")) return "agenda";
  return "account";
}

/** Aba ativa do grupo "Meus projetos" (mesma semântica do painel real). */
export function projectsTabFor(item: MenuItemDef | null): string | null {
  if (!item || !item.to.startsWith(PROJECTS_ROOT)) return null;
  return new URLSearchParams(item.to.split("?")[1] ?? "").get("tab") ?? "orcamentos";
}
