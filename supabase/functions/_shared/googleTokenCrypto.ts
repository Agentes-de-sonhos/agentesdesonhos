// AES-GCM token protection for google_calendar_tokens.
//
// Design rules (final hardening — encryption at rest is now real):
//  * When GOOGLE_TOKEN_ENC_KEY is absent, encryption is NOT active: tokens keep
//    being written to the legacy plaintext columns and the `*_enc` columns stay
//    NULL with token_enc_version = 0. There is never a fallback that writes
//    plaintext into a column named `*_enc`.
//  * When the key is present, tokens are written encrypted into `*_enc` with
//    token_enc_version = 1 and the legacy plaintext columns are cleared in the
//    SAME write (`access_token: null`, `refresh_token: null`). No readable copy
//    of a Google credential remains at rest.
//  * Reads prefer `*_enc`. A legacy plaintext value is only accepted while the
//    row has not been migrated yet (token_enc_version = 0 / `*_enc` empty) —
//    that is what makes the lazy migration possible. Once a row claims version
//    1, a failed decryption is fail-closed (null) instead of silently falling
//    back, so the connection is flagged for reconnect rather than half-working.

export const ENC_PREFIX = "v1:";

export interface TokenRecordLike {
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_enc?: string | null;
  refresh_token_enc?: string | null;
  token_enc_version?: number | null;
}

export interface TokenColumnUpdate {
  access_token?: string | null;
  refresh_token?: string | null;
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

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
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
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
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
 * Read a credential.
 *
 * A row that claims `token_enc_version >= 1` is strictly fail-closed: the value
 * MUST come from a valid ciphertext in `*_enc`, decrypted with the configured
 * key. A missing/blank/non-ciphertext `*_enc`, a missing key or a decryption
 * error all return null — the legacy plaintext column is never consulted for a
 * migrated row, even if some value is still sitting there.
 *
 * Only an unmigrated row (version 0/null) may fall back to plaintext; that is
 * what makes the one-time lazy migration possible.
 */
export async function readTokenField(
  record: TokenRecordLike,
  field: "access_token" | "refresh_token",
  secret: string | null | undefined,
): Promise<string | null> {
  const encValue = record[`${field}_enc` as "access_token_enc" | "refresh_token_enc"];
  const claimsEncrypted = typeof record.token_enc_version === "number" && record.token_enc_version >= 1;

  if (claimsEncrypted) {
    if (!isCiphertext(encValue) || !secret) return null;
    try {
      return await decryptToken(encValue as string, secret);
    } catch {
      return null;
    }
  }

  if (isCiphertext(encValue)) {
    if (!secret) return null;
    try {
      return await decryptToken(encValue as string, secret);
    } catch {
      return null;
    }
  }
  const plain = record[field];
  return typeof plain === "string" && plain.length > 0 ? plain : null;
}

/**
 * Verified encryption payload — the ONLY way a row is allowed to reach
 * `token_enc_version = 1` with the plaintext columns cleared.
 *
 * Steps, in order, all mandatory:
 *  1. both credentials must be present and non-empty;
 *  2. a key must be configured;
 *  3. each credential is encrypted;
 *  4. each ciphertext is decrypted back;
 *  5. each round-trip result is compared exactly (===) with the original.
 *
 * Any failure returns null and the caller MUST NOT persist anything — no
 * version bump, no plaintext clearing. Idempotent: calling it repeatedly with
 * the same input yields equivalent (freshly-IV'd) payloads and never mutates
 * its arguments.
 */
export async function buildVerifiedEncryptedColumns(
  tokens: { access_token?: string | null; refresh_token?: string | null },
  secret: string | null | undefined,
): Promise<TokenColumnUpdate | null> {
  const access = tokens.access_token;
  const refresh = tokens.refresh_token;
  if (typeof access !== "string" || access.length === 0) return null;
  if (typeof refresh !== "string" || refresh.length === 0) return null;
  if (!secret) return null;

  try {
    const accessEnc = await encryptToken(access, secret);
    const refreshEnc = await encryptToken(refresh, secret);
    if (!isCiphertext(accessEnc) || !isCiphertext(refreshEnc)) return null;

    const accessBack = await decryptToken(accessEnc, secret);
    const refreshBack = await decryptToken(refreshEnc, secret);
    if (accessBack !== access || refreshBack !== refresh) return null;

    return {
      access_token_enc: accessEnc,
      refresh_token_enc: refreshEnc,
      access_token: null,
      refresh_token: null,
      token_enc_version: 1,
    };
  } catch {
    return null;
  }
}

/** True when the row still holds a readable credential that must be migrated. */
export function needsTokenMigration(record: TokenRecordLike | null | undefined): boolean {
  if (!record) return false;
  const hasPlain =
    (typeof record.access_token === "string" && record.access_token.length > 0) ||
    (typeof record.refresh_token === "string" && record.refresh_token.length > 0);
  return hasPlain;
}

/**
 * Builds the column payload for storing tokens.
 * Without a key: plaintext columns only, `*_enc` untouched, version 0.
 * With a key: encrypted `*_enc` + version 1 and the plaintext columns cleared
 * in the same write, so no readable credential is left at rest.
 *
 * Version 1 is only claimed when BOTH access_token_enc and refresh_token_enc
 * end up populated AND every ciphertext this row will rely on has been proven
 * readable: values written now must round-trip back to the exact plaintext, and
 * values inherited from `existing` must decrypt successfully.
 * A partially migrated row stays at version 0, keeps its plaintext value and is
 * retried on the next refresh instead of losing the credential.
 *
 * NOTE: production credential writes go exclusively through
 * `buildVerifiedEncryptedColumns`. This builder is retained for legacy/partial
 * migration paths and tests, and can never promote a row to version 1 (nor
 * clear plaintext) without the verification above.
 */
export async function buildTokenColumns(
  tokens: { access_token?: string; refresh_token?: string },
  secret: string | null | undefined,
  existing?: TokenRecordLike | null,
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

  const accessEncrypted = isCiphertext(update.access_token_enc) || isCiphertext(existing?.access_token_enc);
  const refreshEncrypted = isCiphertext(update.refresh_token_enc) || isCiphertext(existing?.refresh_token_enc);
  const verified = await verifyColumnCiphertexts(update, tokens, existing, secret);
  const fullyEncrypted = accessEncrypted && refreshEncrypted && verified;
  update.token_enc_version = fullyEncrypted ? 1 : 0;
  if (fullyEncrypted) {
    // Encrypted-only at rest: drop every readable copy in the same statement.
    update.access_token = null;
    update.refresh_token = null;
  }
  return update;
}

/**
 * Proves every ciphertext the row will depend on is readable before version 1
 * may be claimed. Freshly written values must decrypt back to the exact source
 * plaintext; inherited values only need to decrypt without error.
 */
async function verifyColumnCiphertexts(
  update: TokenColumnUpdate,
  tokens: { access_token?: string; refresh_token?: string },
  existing: TokenRecordLike | null | undefined,
  secret: string,
): Promise<boolean> {
  const checks: Array<[string | null | undefined, string | undefined]> = [
    [update.access_token_enc ?? existing?.access_token_enc, tokens.access_token],
    [update.refresh_token_enc ?? existing?.refresh_token_enc, tokens.refresh_token],
  ];
  for (const [cipher, expected] of checks) {
    if (!isCiphertext(cipher)) return false;
    try {
      const back = await decryptToken(cipher as string, secret);
      // `expected` is only known when this call is what wrote the ciphertext.
      if (typeof expected === "string" && back !== expected) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function getTokenEncKey(): string | null {
  const raw = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    "GOOGLE_TOKEN_ENC_KEY",
  );
  return raw && raw.length > 0 ? raw : null;
}