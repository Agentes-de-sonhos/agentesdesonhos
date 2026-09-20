/**
 * Aliases determinísticos da aba Inicial.
 *
 * Cada produto tem mais de uma rota que representa a mesma "home" (ex.: o
 * dashboard do plano Start, o do fornecedor e a raiz `/`). Todas devem ser
 * normalizadas para a ÚNICA aba Inicial, nunca abrindo uma segunda janela.
 */

/** Grupos de rotas equivalentes por produto. */
const HOME_ALIAS_GROUPS: string[][] = [
  // Plataforma Agentes de Sonhos
  ["/", "/dashboard", "/dashboard-start", "/dashboard-fornecedor"],
  // Painel white label / Site Lab Base
  ["/gestao"],
];

export function normalizeHomePath(path: string): string {
  return (path || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

function groupFor(path: string): string[] | undefined {
  const clean = normalizeHomePath(path);
  return HOME_ALIAS_GROUPS.find((group) => group.includes(clean));
}

/** `true` quando o caminho é a Inicial ou um alias equivalente dela. */
export function isHomeAliasPath(path: string, homePath: string): boolean {
  const target = normalizeHomePath(path);
  const home = normalizeHomePath(homePath);
  if (target === home) return true;
  const homeGroup = groupFor(home);
  return Boolean(homeGroup && homeGroup.includes(target));
}
