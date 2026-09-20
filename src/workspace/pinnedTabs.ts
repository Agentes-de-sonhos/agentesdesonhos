/**
 * Abas fixadas (favoritas) do gerenciador de abas internas.
 *
 * Persistência: `localStorage`, SEM banco de dados. A chave é namespaced por
 * produto (plataforma / Site Lab Base / white label), tenant (hostname do
 * painel da agência) e usuário autenticado, de modo que preferências nunca
 * vazem entre contas ou entre agências. Guardamos apenas caminhos canônicos de
 * rota (IDs estáveis), nunca títulos efêmeros nem dados sensíveis.
 */
import { hasCanonicalRouteTitle } from "./routeTitle";
import { isMultiInstanceRoute } from "./multiInstanceRoutes";
import { isHomeAliasPath } from "./homeAliases";

/** Máximo de abas fixadas ADICIONAIS (a aba Inicial não conta). */
export const MAX_PINNED_TABS = 4;

const STORAGE_PREFIX = "workspace_pinned_tabs:v1";

export interface PinnedScope {
  /** Produto/gerenciador: "agentes" | "wl" (white label / Site Lab Base). */
  product: string;
  /** Tenant do white label (hostname + prefixo de montagem). Vazio na plataforma. */
  tenant?: string | null;
  /** Usuário autenticado. Sem usuário não há persistência. */
  userId?: string | null;
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._:-]/g, "_");
}

/** Chave de armazenamento, ou `null` quando não há usuário autenticado. */
export function buildPinnedStorageKey(scope: PinnedScope): string | null {
  if (!scope.userId) return null;
  const tenant = scope.tenant ? slug(scope.tenant) : "-";
  return `${STORAGE_PREFIX}:${slug(scope.product)}:${tenant}:${slug(scope.userId)}`;
}

/** Normaliza o caminho (sem query, hash ou barra final). */
export function normalizePinnedPath(path: string): string {
  return (path || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

/**
 * Uma aba é elegível a fixar quando aponta para uma rota estável e conhecida do
 * gerenciador: caminho interno absoluto, com título canônico de módulo, que não
 * seja janela de criação múltipla nem detalhe/edição com id temporário.
 */
export function isPinnablePath(path: string, homePath: string): boolean {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  const clean = normalizePinnedPath(path);
  // Inicial e seus aliases (ex.: /dashboard-start) nunca são fixáveis:
  // preferências legadas com esses caminhos são descartadas silenciosamente.
  if (isHomeAliasPath(clean, homePath)) return false;
  if (isMultiInstanceRoute(clean)) return false;
  return hasCanonicalRouteTitle(clean);
}

/** Descarta entradas inválidas, duplicadas ou acima do limite. */
export function sanitizePinnedPaths(raw: unknown, homePath: string): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const clean = normalizePinnedPath(entry);
    if (!isPinnablePath(clean, homePath)) continue;
    if (out.includes(clean)) continue;
    out.push(clean);
    if (out.length >= MAX_PINNED_TABS) break;
  }
  return out;
}

export function readPinnedPaths(key: string | null, homePath: string): string[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return sanitizePinnedPaths(JSON.parse(raw), homePath);
  } catch {
    // Preferência corrompida nunca impede o carregamento da aplicação.
    return [];
  }
}

export function writePinnedPaths(key: string | null, paths: string[]) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(paths.slice(0, MAX_PINNED_TABS)));
  } catch {
    /* quota/modo privado: ignorar */
  }
}

export type TogglePinnedResult =
  | { ok: true; paths: string[]; pinned: boolean }
  | { ok: false; reason: "not-pinnable" | "limit" };

/** Alterna a fixação de um caminho respeitando o limite de 4 abas fixadas. */
export function togglePinnedPath(
  paths: string[],
  path: string,
  homePath: string,
): TogglePinnedResult {
  const clean = normalizePinnedPath(path);
  if (!isPinnablePath(clean, homePath)) return { ok: false, reason: "not-pinnable" };
  if (paths.includes(clean)) {
    return { ok: true, paths: paths.filter((p) => p !== clean), pinned: false };
  }
  if (paths.length >= MAX_PINNED_TABS) return { ok: false, reason: "limit" };
  return { ok: true, paths: [...paths, clean], pinned: true };
}

/**
 * Caminhos que podem ser restaurados agora: elegíveis, existentes no contexto
 * atual, liberados pelos guards vigentes e ainda não abertos.
 */
export function restorablePinnedPaths(
  paths: string[],
  options: {
    homePath: string;
    openPaths: string[];
    canRestore?: (path: string) => boolean;
  },
): string[] {
  const open = new Set(options.openPaths.map(normalizePinnedPath));
  const out: string[] = [];
  for (const path of paths) {
    const clean = normalizePinnedPath(path);
    if (!isPinnablePath(clean, options.homePath)) continue;
    if (open.has(clean) || out.includes(clean)) continue;
    if (options.canRestore && !options.canRestore(clean)) continue;
    out.push(clean);
  }
  return out;
}
