/**
 * Navegação de retorno do Mapa do Turismo (diretório de fornecedores).
 *
 * Centraliza a lógica de "voltar ao diretório" para TODAS as categorias e páginas
 * de detalhe (operadoras, consolidadoras, cias aéreas, hospedagem, locadoras,
 * cruzeiros, seguros, parques, receptivos, guias e fornecedores genéricos).
 *
 * Estratégia:
 * 1. Ao abrir um perfil, o diretório passa `state.directoryReturn` com a URL
 *    completa (categoria + filtros + busca + ordenação) e a posição de rolagem.
 * 2. O mesmo contexto é espelhado em sessionStorage (sobrevive a refresh).
 * 3. Sem state e sem sessionStorage (link direto), usa-se um fallback
 *    determinístico derivado da categoria real do fornecedor.
 */

export const DIRECTORY_ROOT = "/mapa-turismo";
export const CRUISES_ROOT = "/mapa-turismo/cruzeiros";

const RETURN_KEY = "mapaTurismo:return";
const SCROLL_KEY = "mapaTurismo:restoreScroll";

export interface DirectoryReturn {
  /** Caminho interno (path + query) do diretório de origem. */
  path: string;
  /** Posição de rolagem no momento em que o perfil foi aberto. */
  scrollY?: number;
}

/** Categorias oficiais do diretório (espelha CATEGORIES_DATA em MapaTurismo). */
export const DIRECTORY_CATEGORIES = [
  "Operadoras de turismo",
  "Consolidadoras",
  "Companhias aéreas",
  "Hospedagem",
  "Locadoras de veículos",
  "Cruzeiros",
  "Seguros viagem",
  "Parques e atrações",
  "Receptivos",
  "Guias",
] as const;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Apelidos/variações vindas do banco para as categorias oficiais. */
const CATEGORY_ALIASES: Record<string, string> = {
  operadora: "Operadoras de turismo",
  operadoras: "Operadoras de turismo",
  "operadora de turismo": "Operadoras de turismo",
  "operadoras de turismo": "Operadoras de turismo",
  consolidadora: "Consolidadoras",
  consolidadoras: "Consolidadoras",
  "cias aereas": "Companhias aéreas",
  "cia aerea": "Companhias aéreas",
  "companhia aerea": "Companhias aéreas",
  "companhias aereas": "Companhias aéreas",
  aereo: "Companhias aéreas",
  hospedagem: "Hospedagem",
  hotel: "Hospedagem",
  hoteis: "Hospedagem",
  resort: "Hospedagem",
  resorts: "Hospedagem",
  locadora: "Locadoras de veículos",
  locadoras: "Locadoras de veículos",
  "locadoras de veiculos": "Locadoras de veículos",
  cruzeiro: "Cruzeiros",
  cruzeiros: "Cruzeiros",
  "companhia maritima": "Cruzeiros",
  "companhias maritimas": "Cruzeiros",
  seguro: "Seguros viagem",
  seguros: "Seguros viagem",
  "seguro viagem": "Seguros viagem",
  "seguros viagem": "Seguros viagem",
  "seguros de viagem": "Seguros viagem",
  parque: "Parques e atrações",
  parques: "Parques e atrações",
  atracoes: "Parques e atrações",
  "parques e atracoes": "Parques e atrações",
  receptivo: "Receptivos",
  receptivos: "Receptivos",
  guia: "Guias",
  guias: "Guias",
  "guia de turismo": "Guias",
  "guias de turismo": "Guias",
};

/** Resolve uma categoria arbitrária do banco para a aba oficial do diretório. */
export function resolveDirectoryCategory(category?: string | null): string | null {
  if (!category) return null;
  const key = normalize(category);
  const exact = DIRECTORY_CATEGORIES.find((c) => normalize(c) === key);
  if (exact) return exact;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  // último recurso: correspondência parcial (ex.: "Parques e Atrações Temáticas")
  const partial = DIRECTORY_CATEGORIES.find(
    (c) => key.includes(normalize(c)) || normalize(c).includes(key),
  );
  return partial ?? null;
}

/** URL do diretório já posicionada na categoria informada. */
export function directoryPathForCategory(category?: string | null): string {
  const resolved = resolveDirectoryCategory(category);
  const dedicated = dedicatedDirectoryRoute(resolved);
  if (dedicated) return dedicated;
  return resolved ? `${DIRECTORY_ROOT}?categoria=${encodeURIComponent(resolved)}` : DIRECTORY_ROOT;
}

/**
 * Categorias com experiência dedicada própria (listagem especializada).
 * Centraliza a decisão de rota: "Cruzeiros" NUNCA volta a ser uma categoria
 * genérica da grade do Mapa do Turismo.
 */
const DEDICATED_ROUTES: Record<string, string> = {
  Cruzeiros: CRUISES_ROOT,
};

/** Rota dedicada da categoria, quando existir (ex.: Cruzeiros → /mapa-turismo/cruzeiros). */
export function dedicatedDirectoryRoute(category?: string | null): string | null {
  const resolved = resolveDirectoryCategory(category);
  return resolved ? DEDICATED_ROUTES[resolved] ?? null : null;
}

/** true quando a categoria tem listagem dedicada (não deve aparecer na grade genérica). */
export function hasDedicatedDirectoryRoute(category?: string | null): boolean {
  return dedicatedDirectoryRoute(category) !== null;
}

/**
 * Aceita apenas caminhos internos do Mapa do Turismo (evita open redirect e
 * prefixos parecidos como "/mapa-turismo-malicioso").
 */
export function isDirectoryPath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  if (path === DIRECTORY_ROOT) return true;
  const next = path.charAt(DIRECTORY_ROOT.length);
  return path.startsWith(DIRECTORY_ROOT) && (next === "?" || next === "/");
}

/** Só o caminho (sem query) de um retorno do diretório. */
function pathnameOf(path: string): string {
  const [pathname] = path.split("?");
  return pathname.replace(/\/+$/, "") || DIRECTORY_ROOT;
}

/** true quando o caminho é a listagem específica de cruzeiros. */
export function isCruisesListingPath(path: unknown): boolean {
  return isDirectoryPath(path) && pathnameOf(path) === CRUISES_ROOT;
}

/** true apenas para as listagens do diretório (nunca perfis). */
export function isDirectoryListingPath(path: unknown): boolean {
  if (!isDirectoryPath(path)) return false;
  const pathname = pathnameOf(path);
  return pathname === DIRECTORY_ROOT || pathname === CRUISES_ROOT;
}

/**
 * true para qualquer rota de PERFIL do Mapa do Turismo:
 * /mapa-turismo/:id, /mapa-turismo/operadora/:id, /mapa-turismo/guia/:id
 * e /mapa-turismo/cruzeiros/:id.
 */
export function isDirectoryDetailPath(path: unknown): boolean {
  if (!isDirectoryPath(path)) return false;
  return !isDirectoryListingPath(path);
}

/** Extrai e normaliza a categoria embutida na URL do diretório. */
export function categoryFromDirectoryPath(path: unknown): string | null {
  if (!isDirectoryPath(path)) return null;
  if (isCruisesListingPath(path)) return "Cruzeiros";
  const query = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
  const raw = new URLSearchParams(query).get("categoria");
  return resolveDirectoryCategory(raw);
}

/**
 * Um retorno armazenado só pode ser reutilizado se pertencer ao contexto do
 * perfil atual. Evita retorno cruzado obsoleto (ex.: storage de Consolidadoras
 * aplicado a um link direto de Parques).
 */
function isStoredReturnCompatible(
  stored: DirectoryReturn,
  fallback: { category?: string | null; path?: string },
): boolean {
  // Página de detalhe de cruzeiros: só aceita a listagem específica.
  if (isCruisesListingPath(fallback.path)) return isCruisesListingPath(stored.path);

  const realCategory = resolveDirectoryCategory(fallback.category);
  if (realCategory) return categoryFromDirectoryPath(stored.path) === realCategory;

  // Sem categoria e sem rota específica não há como validar: usa o fallback.
  return !fallback.path;
}

function getScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Chamado pelo diretório (ou pela listagem de cruzeiros) antes de abrir um perfil.
 * Retorna o objeto de opções para `navigate(to, options)`.
 */
export function captureDirectoryReturn(): { state: { directoryReturn: DirectoryReturn } } {
  const path =
    typeof window === "undefined"
      ? DIRECTORY_ROOT
      : `${window.location.pathname}${window.location.search}`;
  const value: DirectoryReturn = { path, scrollY: getScrollY() };
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(value));
  } catch {
    /* storage indisponível */
  }
  return { state: { directoryReturn: value } };
}

function readStoredReturn(): DirectoryReturn | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DirectoryReturn;
    return isDirectoryPath(parsed?.path) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Resolve o destino do botão "Voltar ao diretório".
 * Ordem: state da navegação → sessionStorage → fallback pela categoria real.
 */
export function resolveDirectoryReturn(
  locationState: unknown,
  fallback: { category?: string | null; path?: string } = {},
): DirectoryReturn {
  const fromState = (locationState as { directoryReturn?: DirectoryReturn } | null)?.directoryReturn;
  if (fromState && isDirectoryPath(fromState.path)) return fromState;

  const stored = readStoredReturn();
  if (stored && isStoredReturnCompatible(stored, fallback)) return stored;

  const fallbackPath = isDirectoryPath(fallback.path)
    ? fallback.path
    : directoryPathForCategory(fallback.category);
  return { path: fallbackPath };
}

/** Marca a rolagem a ser restaurada pelo diretório no próximo mount. */
export function markDirectoryScrollRestore(scrollY?: number) {
  if (typeof scrollY !== "number" || scrollY <= 0) return;
  try {
    sessionStorage.setItem(SCROLL_KEY, String(Math.round(scrollY)));
  } catch {
    /* noop */
  }
}

/** Lê (e limpa) a rolagem pendente. Usado pelo diretório ao montar. */
export function consumeDirectoryScrollRestore(): number | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    sessionStorage.removeItem(SCROLL_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
