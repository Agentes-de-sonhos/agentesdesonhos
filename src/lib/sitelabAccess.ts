/**
 * Autorização de sessão do SiteLab (por caminho, não por domínio).
 *
 * Regras de segurança (mesmo padrão do preview white label):
 * - a senha NUNCA é gravada nem trafega para o storage; só o resultado (ok)
 *   validado pela Edge Function `verify-sitelab-access`;
 * - a autorização vive em `sessionStorage`, escopada pelo slug do modelo, e
 *   expira em no máximo 8 horas;
 * - uma única autorização libera as três áreas (site, área do cliente, gestão);
 * - bloqueio progressivo no cliente, com resposta sempre genérica.
 */
import { supabase } from "@/integrations/supabase/client";

export const SITELAB_MAX_TTL_MS = 8 * 60 * 60 * 1000;

export { lockoutMsForAttempts } from "@/lib/agencyPreviewAccess";

interface StoredGrant {
  s: string;
  exp: number;
}

export function sitelabStorageKey(slug: string): string {
  return `ads.sitelab.${(slug || "").trim().toLowerCase()}`;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function isSitelabGrantValid(raw: string | null, slug: string, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as StoredGrant;
    if (!parsed || typeof parsed.exp !== "number") return false;
    if (parsed.s !== (slug || "").trim().toLowerCase()) return false;
    if (parsed.exp <= now) return false;
    return parsed.exp - now <= SITELAB_MAX_TTL_MS;
  } catch {
    return false;
  }
}

export function buildSitelabGrant(slug: string, now = Date.now(), ttlMs = SITELAB_MAX_TTL_MS): string {
  const ttl = Math.min(Math.max(ttlMs, 0), SITELAB_MAX_TTL_MS);
  return JSON.stringify({ s: (slug || "").trim().toLowerCase(), exp: now + ttl } satisfies StoredGrant);
}

export function hasSitelabAccess(slug: string): boolean {
  const store = storage();
  if (!store) return false;
  const key = sitelabStorageKey(slug);
  const valid = isSitelabGrantValid(store.getItem(key), slug);
  if (!valid) store.removeItem(key);
  return valid;
}

export function sitelabAccessRemainingMs(slug: string, now = Date.now()): number {
  const store = storage();
  if (!store) return 0;
  const raw = store.getItem(sitelabStorageKey(slug));
  if (!isSitelabGrantValid(raw, slug, now)) return 0;
  try {
    return Math.max(0, (JSON.parse(raw as string) as StoredGrant).exp - now);
  } catch {
    return 0;
  }
}

export function grantSitelabAccess(slug: string, ttlMs = SITELAB_MAX_TTL_MS): void {
  storage()?.setItem(sitelabStorageKey(slug), buildSitelabGrant(slug, Date.now(), ttlMs));
}

export function revokeSitelabAccess(slug: string): void {
  storage()?.removeItem(sitelabStorageKey(slug));
}

/** Chama a Edge Function; a senha só existe em memória nesta requisição. */
export async function verifySitelabPassword(
  slug: string,
  password: string,
): Promise<{ ok: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-sitelab-access", {
      body: { slug: (slug || "").trim().toLowerCase(), password },
    });
    if (error) return { ok: false };
    return { ok: (data as { ok?: boolean } | null)?.ok === true };
  } catch {
    return { ok: false };
  }
}
