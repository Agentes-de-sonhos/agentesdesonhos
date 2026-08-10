// Fail-closed authentication for the internal calendar cron path.
//
// The expected secret lives in the database vault and is fetched through the
// `get_calendar_cron_secret` SECURITY DEFINER function (service_role only).
// It is never inlined in code, migrations, cron SQL or HTTP responses.

export const CRON_SECRET_HEADER = "x-cron-secret";

/** Length-safe, non-short-circuiting string comparison. */
export function timingSafeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Decides whether an incoming request is an authenticated internal call.
 * Fail-closed: with no expected secret configured, nothing is authorized.
 */
export function isAuthorizedInternalCall(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected) return false;
  return timingSafeEqual(presented, expected);
}

/** Reads the expected cron secret from the vault. Returns null on any failure. */
export async function fetchCronSecret(
  supabase: { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_calendar_cron_secret");
    if (error) return null;
    return typeof data === "string" && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}