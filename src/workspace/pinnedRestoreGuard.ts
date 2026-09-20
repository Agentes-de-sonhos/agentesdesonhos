/**
 * Validação de guards antes de restaurar uma aba fixada.
 *
 * Restaurar uma preferência NUNCA pode contornar plano, equipe/permissão ou
 * contexto: a aba só reabre quando a rota existe no produto atual e os guards
 * vigentes liberam o acesso.
 */
import { canAccessRoute } from "@/lib/routePermissions";
import {
  APP_CREATE_GROUP,
  APP_PROJECTS_GROUP,
  APP_AGENDA_ITEM,
  APP_MANAGEMENT_ITEMS,
  APP_OTHER_ITEMS,
  APP_MORE_GROUP,
  type AppSidebarItem,
} from "@/lib/appSidebarMenu";
import type { Feature } from "@/types/subscription";

const ALL_ITEMS: AppSidebarItem[] = [
  ...APP_CREATE_GROUP.items,
  ...APP_PROJECTS_GROUP.items,
  APP_AGENDA_ITEM,
  ...APP_MANAGEMENT_ITEMS,
  ...APP_OTHER_ITEMS,
  ...APP_MORE_GROUP.items,
];

function clean(path: string): string {
  return (path || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

/** Item de menu correspondente ao caminho (match mais específico). */
export function menuItemForPath(path: string): AppSidebarItem | undefined {
  const target = clean(path);
  return ALL_ITEMS.filter((item) => {
    const url = clean(item.url);
    return target === url || target.startsWith(`${url}/`);
  }).sort((a, b) => clean(b.url).length - clean(a.url).length)[0];
}

/** Guard da plataforma Agentes de Sonhos: plano + permissões de equipe. */
export function buildPlatformPinnedGuard(deps: {
  can: (key: string) => boolean;
  hasFeature: (feature: Feature) => boolean;
}) {
  return (path: string): boolean => {
    const item = menuItemForPath(path);
    if (item?.requiredFeature && !deps.hasFeature(item.requiredFeature)) return false;
    if (item?.requiredPermission && !deps.can(item.requiredPermission)) return false;
    if (item?.anyPermission && !item.anyPermission.some((key) => deps.can(key))) return false;
    return canAccessRoute(clean(path), deps.can);
  };
}

/**
 * Guard do painel white label / Site Lab Base: apenas rotas do próprio painel
 * (prefixo `/gestao`) e os guards de permissão vigentes. Isso impede que uma
 * preferência da plataforma apareça dentro do painel de uma agência.
 */
export function buildAgencyAdminPinnedGuard(deps: {
  can: (key: string) => boolean;
  knownPaths: string[];
}) {
  const known = new Set(deps.knownPaths.map(clean));
  return (path: string): boolean => {
    const target = clean(path);
    if (!target.startsWith("/gestao")) return false;
    if (!known.has(target)) return false;
    return canAccessRoute(target, deps.can);
  };
}
