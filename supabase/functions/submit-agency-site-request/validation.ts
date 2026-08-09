// Pure, testable validation helpers for the white-label site request endpoint.
// Kept in the function folder (deploys with it) and imported by index.ts and tests.

/** Only these service keys exist in the Central de Solicitações (mirrors the SQL allowlist). */
export const ALLOWED_SERVICE_KEYS = [
  "aereo",
  "hospedagem",
  "carro",
  "transfer",
  "ingressos",
  "seguro",
  "cruzeiros",
  "pacotes",
] as const;

export function isAllowedServiceKey(key: string): boolean {
  return (ALLOWED_SERVICE_KEYS as readonly string[]).includes(key);
}

/** Platform hosts used by the Lovable preview/dev environment. */
export const PREVIEW_HOST_SUFFIXES = [
  "lovable.app",
  "lovableproject.com",
  "lovableproject-dev.com",
  "localhost",
];

/** Lowercase, portless, root/www-insensitive hostname. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

export function hostOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return normalizeHost(new URL(raw).hostname);
  } catch {
    return null;
  }
}

export function isPreviewHost(host: string): boolean {
  return PREVIEW_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

/**
 * Second barrier against cross-tenant submissions. The tenant is ALWAYS resolved
 * from the hostname against active agency_public_domains (never from the payload);
 * here we additionally require the page Origin/Referer to match the submitted
 * hostname, so a page served by agency A can never post a lead to agency B.
 * Root and www are treated as the same site.
 *
 * DOCUMENTED EXCEPTION: on Lovable preview/dev hosts (`*.lovable.app`,
 * `*.lovableproject.com`, `localhost`) the white-label site is reached through
 * `?__agency_host=...`, so the Origin can never match the agency domain. Only in
 * that case the comparison is skipped. This is NOT a general production bypass:
 * every other Origin mismatch (and a missing Origin/Referer) is rejected.
 */
export function originAllowed(
  headers: { origin: string | null; referer: string | null },
  hostname: string,
): boolean {
  const origin = hostOf(headers.origin) ?? hostOf(headers.referer);
  if (!origin) return false;
  if (isPreviewHost(origin)) return true;
  return origin === normalizeHost(hostname);
}
