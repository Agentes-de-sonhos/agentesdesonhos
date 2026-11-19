/** Explicit search exclusions requested by the agency; exact host/path only. */
const MUNDO_HOSTS = new Set(["omundoemcores.com.br", "www.omundoemcores.com.br"]);
const MUNDO_EXCLUDED_PATHS = new Set([
  "/resorts-brasil/sofitel-jequitimar-guaruja",
  "/politicasdeprivacidade",
  "/termosdeuso",
  "/resorts-brasil/cyan-resort",
  "/resorts-brasil/blue-tree-thermas-de-lins-resort",
]);

export function isAgencySearchExcluded(hostname: string, pathname: string): boolean {
  const host = hostname.trim().toLowerCase();
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (host === "pristur.com.br" || host === "www.pristur.com.br") return true;
  return MUNDO_HOSTS.has(host) && MUNDO_EXCLUDED_PATHS.has(path);
}
