/**
 * Rotas de criação que podem ter várias janelas internas abertas ao mesmo tempo.
 * Cada abertura vira uma instância independente (rascunho/formulário próprios),
 * ao contrário das telas comuns de listagem/detalhe, que continuam sendo
 * apenas focadas quando já existe uma aba.
 */
const MULTI_INSTANCE_PATHS = [
  "/ferramentas-ia/gerar-orcamento",
  "/ferramentas-ia/trip-wallet",
  "/ferramentas-ia/criar-roteiro",
];

/** Normaliza removendo query, hash e barra final. */
function normalize(path: string): string {
  return (path || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

/**
 * `true` apenas para a rota base de criação (sem id de registro existente),
 * de modo que a edição de um mesmo orçamento/carteira/roteiro continue
 * limitada a uma única janela.
 */
export function isMultiInstanceRoute(path: string): boolean {
  const clean = normalize(path);
  return MULTI_INSTANCE_PATHS.some((p) => clean === p || clean === `${p}/novo`);
}
