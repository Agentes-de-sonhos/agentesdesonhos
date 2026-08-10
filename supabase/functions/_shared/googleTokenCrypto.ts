// AES-GCM token protection for google_calendar_tokens.
//
// Design rules (Block 1 — inert preparation):
//  * When GOOGLE_TOKEN_ENC_KEY is absent, encryption is NOT active: tokens keep
//    being written to the legacy plaintext columns and the `*_enc` columns stay
//    NULL with token_enc_version = 0. There is never a fallback that writes
//    plaintext into a column named `*_enc`.
//  * When the key is present, tokens are written encrypted into `*_enc` with
//    token_enc_version = 1 while the legacy plaintext columns are kept in place
//    (dual-write) so a rollback cannot break the live connections. Clearing the
//    plaintext columns is a later, separately verified step.
//  * Reads always prefer `*_enc` when it holds a real ciphertext and the key is
//    available, falling back to the legacy plaintext column (dual-read).

export const ENC_PREFIX = "v1:";

export interface TokenRecordLike {
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_enc?: string | null;
  refresh_token_enc?: string | null;
  token_enc_version?: number | null;
}

export interface TokenColumnUpdate {
  access_token?: string;
  refresh_token?: string;
  access_token_enc?: string | null;
  refresh_token_enc?: string | null;
  token_enc_version?: number;
}

export function isCiphertext(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX) && value.split(":").length === 3;
}

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out);
}

function fromBase64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Derives a stable 256-bit AES-GCM key from an arbitrary-length secret. */
export async function importTokenKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string, secret: string): Promise<string> {
  if (!secret) throw new Error("encryptToken called without a key");
  const key = await importTokenKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return `${ENC_PREFIX}${toBase64(iv)}:${toBase64(cipher)}`;
}

export async function decryptToken(value: string, secret: string): Promise<string> {
  if (!isCiphertext(value)) throw new Error("decryptToken called with a non-ciphertext value");
  if (!secret) throw new Error("decryptToken called without a key");
  const [, ivB64, cipherB64] = value.split(":");
  const key = await importTokenKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(cipherB64),
  );
  return new TextDecoder().decode(plain);
}

/**
 * Dual-read: encrypted column first (when readable), legacy plaintext otherwise.
 * Returns null when neither side holds a usable value.
 */
export async function readTokenField(
  record: TokenRecordLike,
  field: "access_token" | "refresh_token",
  secret: string | null | undefined,
): Promise<string | null> {
  const encValue = record[`${field}_enc` as "access_token_enc" | "refresh_token_enc"];
  if (isCiphertext(encValue) && secret) {
    try {
      return await decryptToken(encValue as string, secret);
    } catch {
      // Fall through to the legacy column instead of breaking a live connection.
    }
  }
  const plain = record[field];
  return typeof plain === "string" && plain.length > 0 ? plain : null;
}

/**
 * Builds the column payload for storing tokens.
 * Without a key: plaintext columns only, `*_enc` untouched, version 0.
 * With a key: encrypted `*_enc` + version 1, plaintext kept for safe rollback.
 */
export async function buildTokenColumns(
  tokens: { access_token?: string; refresh_token?: string },
  secret: string | null | undefined,
): Promise<TokenColumnUpdate> {
  const update: TokenColumnUpdate = {};
  if (typeof tokens.access_token === "string") update.access_token = tokens.access_token;
  if (typeof tokens.refresh_token === "string") update.refresh_token = tokens.refresh_token;

  if (!secret) {
    update.token_enc_version = 0;
    return update;
  }

  if (typeof tokens.access_token === "string") {
    update.access_token_enc = await encryptToken(tokens.access_token, secret);
  }
  if (typeof tokens.refresh_token === "string") {
    update.refresh_token_enc = await encryptToken(tokens.refresh_token, secret);
  }
  update.token_enc_version = 1;
  return update;
}

export function getTokenEncKey(): string | null {
  const raw = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    "GOOGLE_TOKEN_ENC_KEY",
  );
  return raw && raw.length > 0 ? raw : null;
}