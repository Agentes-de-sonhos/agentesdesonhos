// Cryptographic OAuth state for the Google Calendar connect flow.
//
// The value sent to Google is opaque: "<state_id>.<nonce>". Only the SHA-256
// hash of the nonce is stored, the row has a 10 minute TTL and it is consumed
// atomically exactly once by the callback.

export const STATE_TTL_MS = 10 * 60 * 1000;

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function encodeState(stateId: string, nonce: string): string {
  return `${stateId}.${nonce}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE_RE = /^[0-9a-f]{64}$/i;

/** Parses an incoming state value. Returns null for anything malformed. */
export function parseState(raw: string | null | undefined): { stateId: string; nonce: string } | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [stateId, nonce] = parts;
  if (!UUID_RE.test(stateId) || !NONCE_RE.test(nonce)) return null;
  return { stateId, nonce };
}

export function stateExpiryIso(now: number = Date.now()): string {
  return new Date(now + STATE_TTL_MS).toISOString();
}