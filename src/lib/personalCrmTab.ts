/**
 * CUSTOMIZAÇÃO INDIVIDUAL TEMPORÁRIA
 * ----------------------------------
 * Regra exclusiva de UM usuário, identificado SOMENTE pelo UUID abaixo
 * (nunca por nome, e-mail, agência ou plano).
 *
 * Comportamento: exclusivamente após login explícito com senha, mantém o
 * Dashboard na aba original e abre/reutiliza uma aba nomeada no CRM.
 *
 * Como remover: apagar este arquivo e seu uso em src/pages/Auth.tsx.
 */

/** UUID único autorizado para esta customização. */
export const PERSONAL_CRM_TAB_USER_ID = "be17e92f-03d7-4f17-acf2-e2ab4d135edb";

/** CRM > Oportunidades (rota padrão do app). */
export const PERSONAL_CRM_TAB_PATH = "/gestao-clientes/funil";

/**
 * URL realmente aberta na segunda aba. Passa por /auth com ?next= para evitar a
 * corrida em que a nova aba ainda não vê a sessão recém-criada e acaba
 * redirecionada para o dashboard (tela principal).
 */
export const PERSONAL_CRM_TAB_URL = `/auth?next=${encodeURIComponent(PERSONAL_CRM_TAB_PATH)}`;

/** Nome fixo reutilizado pelo navegador para impedir várias abas de CRM. */
export const PERSONAL_CRM_TAB_TARGET = "ads-ricardo-crm";


/** Controle compartilhado entre abas; é removido no logout real. */
const LOGIN_CONTROL_KEY = "agentesdesonhos-personal-crm:login-opened";

export type PersonalCrmTabResult = "skipped" | "already-opened" | "opened" | "blocked";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isPersonalCrmTabUser(userId?: string | null): boolean {
  if (typeof userId !== "string") return false;
  return userId.trim().toLowerCase() === PERSONAL_CRM_TAB_USER_ID;
}

export function hasOpenedPersonalCrmTab(storage: StorageLike | null | undefined): boolean {
  try {
    return storage?.getItem(LOGIN_CONTROL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPersonalCrmTabOpened(storage: StorageLike | null | undefined): void {
  try {
    storage?.setItem(LOGIN_CONTROL_KEY, "1");
  } catch {
    /* ignora storage indisponível */
  }
}

export function clearPersonalCrmLoginControl(storage: StorageLike | null | undefined): void {
  try {
    storage?.removeItem(LOGIN_CONTROL_KEY);
  } catch {
    /* ignora storage indisponível */
  }
}

/**
 * Tenta abrir a aba somente como consequência de login explícito com senha.
 * Este helper nunca é chamado por montagem, refresh ou restauração de sessão.
 */
export function openPersonalCrmAfterPasswordLogin(params: {
  userId?: string | null;
  storage: StorageLike | null | undefined;
  isImpersonating: boolean;
  open: (url: string, target: string) => Window | null;
}): PersonalCrmTabResult {
  const { userId, storage, isImpersonating, open } = params;

  if (!isPersonalCrmTabUser(userId)) return "skipped";
  if (isImpersonating) return "skipped";
  if (hasOpenedPersonalCrmTab(storage)) return "already-opened";

  // Marca antes de abrir para que logins concorrentes em abas diferentes não dupliquem.
  markPersonalCrmTabOpened(storage);

  let win: Window | null = null;
  try {
    win = open(PERSONAL_CRM_TAB_PATH, PERSONAL_CRM_TAB_TARGET);
    win?.focus();
  } catch {
    win = null;
  }

  return win ? "opened" : "blocked";
}

/** Ação manual exibida apenas quando o navegador bloqueou a tentativa do login. */
export function openPersonalCrmFromFallback(
  open: (url: string, target: string) => Window | null,
): boolean {
  try {
    const win = open(PERSONAL_CRM_TAB_PATH, PERSONAL_CRM_TAB_TARGET);
    win?.focus();
    return win !== null;
  } catch {
    return false;
  }
}
