/**
 * CUSTOMIZAÇÃO INDIVIDUAL TEMPORÁRIA
 * ----------------------------------
 * Regra exclusiva de UM usuário, identificado SOMENTE pelo UUID abaixo
 * (nunca por nome, e-mail, agência ou plano).
 *
 * Comportamento: a cada nova sessão autenticada, além da aba original com o
 * Dashboard, abre-se uma segunda aba do navegador direto no CRM > Oportunidades.
 * Nada aqui altera rotas, login ou a experiência de qualquer outro usuário.
 *
 * Como remover: apagar este arquivo e os dois pontos de uso
 * (src/pages/Auth.tsx e src/components/personal/PersonalCrmTabLauncher.tsx).
 */

/** UUID único autorizado para esta customização. */
export const PERSONAL_CRM_TAB_USER_ID = "be17e92f-03d7-4f17-acf2-e2ab4d135edb";

/** CRM > Oportunidades (rota padrão do app). */
export const PERSONAL_CRM_TAB_PATH = "/gestao-clientes/funil";

/** Marca por SESSÃO da aba (sessionStorage): não reabre em refresh/navegação. */
const SESSION_KEY = "personal-crm-tab:opened";

export type PersonalCrmTabResult = "skipped" | "already-opened" | "opened" | "blocked";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isPersonalCrmTabUser(userId?: string | null): boolean {
  if (typeof userId !== "string") return false;
  return userId.trim().toLowerCase() === PERSONAL_CRM_TAB_USER_ID;
}

export function hasOpenedPersonalCrmTab(storage: StorageLike | null | undefined): boolean {
  try {
    return storage?.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPersonalCrmTabOpened(storage: StorageLike | null | undefined): void {
  try {
    storage?.setItem(SESSION_KEY, "1");
  } catch {
    /* ignora storage indisponível */
  }
}

/** Já estamos no CRM? Então não faz sentido abrir uma segunda aba. */
export function isOnPersonalCrmPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const clean = pathname.replace(/\/+$/, "").toLowerCase();
  return clean.startsWith("/gestao-clientes") || clean.startsWith("/gestao/crm");
}

/**
 * Tenta abrir a segunda aba (uma única vez por sessão, sem duplicar).
 * Retorna "blocked" quando o navegador barrou o pop-up, para que a UI possa
 * oferecer uma ação discreta — sem loop e sem toast repetitivo.
 */
export function openPersonalCrmTab(params: {
  userId?: string | null;
  storage: StorageLike | null | undefined;
  pathname?: string | null;
  open: (url: string, target: string, features: string) => Window | null;
}): PersonalCrmTabResult {
  const { userId, storage, pathname, open } = params;

  if (!isPersonalCrmTabUser(userId)) return "skipped";
  if (isOnPersonalCrmPath(pathname)) return "skipped";
  if (hasOpenedPersonalCrmTab(storage)) return "already-opened";

  // Marca antes de abrir: evita corrida/duplicidade entre login e montagem da área logada.
  markPersonalCrmTabOpened(storage);

  let win: Window | null = null;
  try {
    win = open(PERSONAL_CRM_TAB_PATH, "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }

  return win ? "opened" : "blocked";
}
