/**
 * Fronteira central de layout dos domínios White Label.
 *
 * Rotas públicas de FERRAMENTAS/DOCUMENTOS (orçamento, roteiro, carteira
 * digital, fatura) são renderizadas em modo standalone: o shell institucional
 * (cabeçalho, menu, CTA de atendimento e rodapé) NÃO é montado nelas.
 *
 * Rotas INSTITUCIONAIS (home, ofertas, área do cliente, políticas, termos)
 * continuam dentro do shell.
 */

export type AgencyPublicToolKind = "orcamento" | "roteiro" | "carteira" | "fatura";

/** Padrão de rota (react-router) → tipo de ferramenta pública. */
export const AGENCY_PUBLIC_TOOL_ROUTES: { path: string; kind: AgencyPublicToolKind }[] = [
  { path: "/orcamento/:code", kind: "orcamento" },
  { path: "/roteiro/:code", kind: "roteiro" },
  { path: "/carteira/:code", kind: "carteira" },
  { path: "/viagem/:code", kind: "carteira" },
  { path: "/fatura/:code", kind: "fatura" },
];

/** Primeiro segmento de cada rota pública de ferramenta. */
const PUBLIC_TOOL_PREFIXES = AGENCY_PUBLIC_TOOL_ROUTES.map(
  (r) => r.path.split("/")[1],
);

/**
 * Classifica um pathname: `true` = ferramenta/documento público (standalone),
 * `false` = página institucional (com shell). Ignora query string e hash.
 */
export function isAgencyPublicToolPath(pathname: string): boolean {
  const clean = (pathname.split("?")[0].split("#")[0] || "/").replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length !== 2) return false;
  return PUBLIC_TOOL_PREFIXES.includes(parts[0]) && parts[1].length > 0;
}
