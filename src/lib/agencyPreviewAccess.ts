/**
 * Autorização temporária do preview dos sites white label.
 *
 * Regras de segurança:
 * - A senha NUNCA é gravada nem trafega para o storage; só o resultado (ok)
 *   validado pela Edge Function `verify-agency-preview`.
 * - A autorização vive em `sessionStorage` (desaparece ao fechar a aba),
 *   é escopada pelo hostname e expira em no máximo 8 horas.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeHostname } from "@/lib/agencyDomains";

export const PREVIEW_MAX_TTL_MS = 8 * 60 * 60 * 1000;

export function previewStorageKey(hostname: string): string {
  return `ads.agency-preview.${normalizeHostname(hostname)}`;
}

interface StoredGrant {
  h: string;
  exp: number;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function isGrantValid(raw: string | null, hostname: string, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as StoredGrant;
    if (!parsed || typeof parsed.exp !== "number") return false;
    if (parsed.h !== normalizeHostname(hostname)) return false;
    if (parsed.exp <= now) return false;
    return parsed.exp - now <= PREVIEW_MAX_TTL_MS;
  } catch {
    return false;
  }
}

export function buildGrant(hostname: string, now = Date.now(), ttlMs = PREVIEW_MAX_TTL_MS): string {
  const ttl = Math.min(Math.max(ttlMs, 0), PREVIEW_MAX_TTL_MS);
  return JSON.stringify({ h: normalizeHostname(hostname), exp: now + ttl } satisfies StoredGrant);
}

export function hasPreviewAccess(hostname: string): boolean {
  const store = storage();
  if (!store) return false;
  const key = previewStorageKey(hostname);
  const valid = isGrantValid(store.getItem(key), hostname);
  if (!valid) store.removeItem(key);
  return valid;
}

export function grantPreviewAccess(hostname: string, ttlMs = PREVIEW_MAX_TTL_MS): void {
  storage()?.setItem(previewStorageKey(hostname), buildGrant(hostname, Date.now(), ttlMs));
}

export function revokePreviewAccess(hostname: string): void {
  storage()?.removeItem(previewStorageKey(hostname));
}

/* ------------------------- bloqueio progressivo ---------------------------- */

/** Espera crescente após tentativas inválidas (ms). Nunca revela a causa. */
export function lockoutMsForAttempts(attempts: number): number {
  if (attempts < 3) return 0;
  if (attempts === 3) return 15_000;
  if (attempts === 4) return 60_000;
  if (attempts === 5) return 5 * 60_000;
  return 15 * 60_000;
}

export interface VerifyResult {
  ok: boolean;
}

/** Chama a Edge Function; a senha só é usada em memória nesta requisição. */
export async function verifyPreviewPassword(
  hostname: string,
  password: string,
): Promise<VerifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-agency-preview", {
      body: { hostname: normalizeHostname(hostname), password },
    });
    if (error) return { ok: false };
    return { ok: (data as { ok?: boolean } | null)?.ok === true };
  } catch {
    return { ok: false };
  }
}
