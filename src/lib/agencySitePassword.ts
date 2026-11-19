/**
 * Proteção por senha dos sites institucionais white label.
 *
 * - Lista DECLARATIVA e central dos tenants protegidos (por owner user_id,
 *   o que cobre todos os hostnames www/não-www, slug compartilhado e o
 *   preview técnico com `?__agency_host=`).
 * - A senha nunca está no bundle: a validação é feita pela Edge Function
 *   `agency-site-unlock`, que emite um token assinado (7 dias). O navegador
 *   guarda somente esse token.
 */
import { supabase } from "@/integrations/supabase/client";
import { isAgencyPublicToolPath } from "@/lib/agencyPublicToolRoutes";
import { isAgencyAdminPath } from "@/lib/agencyAdmin";

/** Ativar/desativar aqui. owner user_id → rótulo interno. */
export const PASSWORD_PROTECTED_TENANTS: Record<string, string> = {
  "f6a304ca-5f0f-4d3d-8c1b-0cf7e5f9ab77": "Innovati Travel",
  "dd79ad45-c06b-4196-9ef6-53da902f1996": "Shopping Viagens",
  "d5107f83-e137-4f3f-bcd3-9a6a0faed2b5": "Bardelli Viagens",
  "19746f35-d222-4a3f-b9eb-9920d01ab883": "Bagagem na Mão Viagens",
  "2119703a-e00e-4b85-a6b0-e912479eb99a": "IM&M Viagens e Turismo",
  "45af6989-38fd-4446-9a58-f87cc9acea63": "Karibu Viagens e Turismo",
  "0c61893e-0e8c-4d98-a1f5-4d2fd3c357ab": "Pristur Viagens",
};

export const SITE_UNLOCK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isTenantPasswordProtected(userId?: string | null): boolean {
  return !!userId && Object.prototype.hasOwnProperty.call(PASSWORD_PROTECTED_TENANTS, userId);
}

/** Rotas próprias que nunca são bloqueadas (área do cliente, gestão, links individuais). */
export function isPasswordExemptPath(pathname: string): boolean {
  const clean = (pathname.split("?")[0].split("#")[0] || "/").replace(/\/+$/, "") || "/";
  if (clean === "/area-do-cliente" || clean.startsWith("/area-do-cliente/")) return true;
  if (clean === "/gestao" || clean.startsWith("/gestao/") || isAgencyAdminPath(clean)) return true;
  if (clean === "/preview") return true;
  return isAgencyPublicToolPath(clean);
}

export function unlockStorageKey(userId: string): string {
  return `ads.site-unlock.${userId}`;
}

interface StoredUnlock {
  token: string;
  exp: number;
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Token local ainda dentro da validade (a assinatura é conferida no servidor). */
export function readStoredUnlock(userId: string, now = Date.now()): StoredUnlock | null {
  const s = store();
  if (!s) return null;
  const key = unlockStorageKey(userId);
  try {
    const parsed = JSON.parse(s.getItem(key) || "null") as StoredUnlock | null;
    if (
      parsed &&
      typeof parsed.token === "string" &&
      typeof parsed.exp === "number" &&
      parsed.exp > now &&
      parsed.exp - now <= SITE_UNLOCK_TTL_MS + 60_000
    ) {
      return parsed;
    }
  } catch {
    /* ignora */
  }
  s.removeItem(key);
  return null;
}

export function saveUnlock(userId: string, token: string, exp: number): void {
  store()?.setItem(unlockStorageKey(userId), JSON.stringify({ token, exp } satisfies StoredUnlock));
}

export function clearUnlock(userId: string): void {
  store()?.removeItem(unlockStorageKey(userId));
}

export type UnlockResult =
  | { status: "ok"; token: string; exp: number }
  | { status: "invalid" }
  | { status: "unavailable" };

async function call(body: Record<string, unknown>): Promise<UnlockResult> {
  try {
    const { data, error } = await supabase.functions.invoke("agency-site-unlock", { body });
    const d = (data ?? null) as { ok?: boolean; token?: string; exp?: number } | null;
    if (d?.ok === true && typeof d.token === "string" && typeof d.exp === "number") {
      return { status: "ok", token: d.token, exp: d.exp };
    }
    if (error) {
      const status = (error as { context?: { status?: number } })?.context?.status;
      return status === 401 ? { status: "invalid" } : { status: "unavailable" };
    }
    return { status: "invalid" };
  } catch {
    return { status: "unavailable" };
  }
}

export function unlockWithPassword(userId: string, password: string): Promise<UnlockResult> {
  return call({ action: "unlock", tenant: userId, password });
}

export function verifyUnlockToken(userId: string, token: string): Promise<UnlockResult> {
  return call({ action: "verify", tenant: userId, token });
}
