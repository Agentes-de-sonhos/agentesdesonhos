import { describe, it, expect } from "vitest";
import {
  isAuthorizedInternalCall,
  timingSafeEqual,
  fetchCronSecret,
  CRON_SECRET_HEADER,
} from "../../supabase/functions/_shared/calendarCronAuth";
import {
  encodeState,
  generateNonce,
  hashNonce,
  parseState,
  stateExpiryIso,
  STATE_TTL_MS,
} from "../../supabase/functions/_shared/googleOAuthState";
import {
  buildTokenColumns,
  decryptToken,
  encryptToken,
  isCiphertext,
  readTokenField,
} from "../../supabase/functions/_shared/googleTokenCrypto";
import {
  isReconnectResponse,
  needsReconnect,
  reconnectMessage,
  resolveStatusKey,
  statusLabel,
} from "@/lib/googleCalendarConnection";

describe("cron authorization", () => {
  it("uses the dedicated secret header", () => {
    expect(CRON_SECRET_HEADER).toBe("x-cron-secret");
  });

  it("fails closed when no secret is configured", () => {
    expect(isAuthorizedInternalCall("anything", null)).toBe(false);
    expect(isAuthorizedInternalCall("anything", undefined)).toBe(false);
    expect(isAuthorizedInternalCall("anything", "")).toBe(false);
  });

  it("rejects a missing, empty or wrong presented secret", () => {
    expect(isAuthorizedInternalCall(null, "s3cret")).toBe(false);
    expect(isAuthorizedInternalCall("", "s3cret")).toBe(false);
    expect(isAuthorizedInternalCall("s3cre", "s3cret")).toBe(false);
    expect(isAuthorizedInternalCall("S3CRET", "s3cret")).toBe(false);
  });

  it("accepts only an exact match", () => {
    expect(isAuthorizedInternalCall("s3cret", "s3cret")).toBe(true);
  });

  it("compares without short-circuiting on length or content", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("", "")).toBe(false);
  });

  it("returns null when the vault lookup errors or is empty", async () => {
    expect(await fetchCronSecret({ rpc: async () => ({ data: null, error: { message: "x" } }) })).toBeNull();
    expect(await fetchCronSecret({ rpc: async () => ({ data: "", error: null }) })).toBeNull();
    expect(await fetchCronSecret({ rpc: async () => { throw new Error("boom"); } })).toBeNull();
    expect(await fetchCronSecret({ rpc: async () => ({ data: "vaulted", error: null }) })).toBe("vaulted");
  });
});

describe("oauth state", () => {
  it("generates a 256-bit hex nonce that is never repeated", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("stores only the hash of the nonce", async () => {
    const nonce = generateNonce();
    const hash = await hashNonce(nonce);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(nonce);
    expect(await hashNonce(nonce)).toBe(hash);
  });

  it("round-trips an opaque state value without carrying the user id", () => {
    const id = "2f1d5c2a-6b3e-4a1f-9c8d-0e1f2a3b4c5d";
    const nonce = generateNonce();
    const raw = encodeState(id, nonce);
    expect(raw).not.toContain("user");
    expect(parseState(raw)).toEqual({ stateId: id, nonce });
  });

  it("rejects legacy base64 states and any malformed value", () => {
    const legacy = btoa(JSON.stringify({ user_id: "2f1d5c2a-6b3e-4a1f-9c8d-0e1f2a3b4c5d" }));
    expect(parseState(legacy)).toBeNull();
    expect(parseState(null)).toBeNull();
    expect(parseState("")).toBeNull();
    expect(parseState("no-dot")).toBeNull();
    expect(parseState("not-a-uuid.abcdef")).toBeNull();
    expect(parseState("2f1d5c2a-6b3e-4a1f-9c8d-0e1f2a3b4c5d.short")).toBeNull();
  });

  it("expires ten minutes after creation", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(STATE_TTL_MS).toBe(600_000);
    expect(new Date(stateExpiryIso(now)).getTime() - now).toBe(600_000);
  });
});

describe("token crypto helpers", () => {
  const KEY = "unit-test-key-material";

  it("encrypts and decrypts round-trip with a fresh iv each time", async () => {
    const a = await encryptToken("ya29.token", KEY);
    const b = await encryptToken("ya29.token", KEY);
    expect(a).not.toBe(b);
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toContain("ya29.token");
    expect(await decryptToken(a, KEY)).toBe("ya29.token");
  });

  it("fails to decrypt with the wrong key", async () => {
    const c = await encryptToken("ya29.token", KEY);
    await expect(decryptToken(c, "other-key")).rejects.toBeTruthy();
  });

  it("recognises ciphertext and refuses plaintext", () => {
    expect(isCiphertext("v1:aaaa:bbbb")).toBe(true);
    expect(isCiphertext("ya29.plain")).toBe(false);
    expect(isCiphertext(null)).toBe(false);
  });

  it("stays inert without a key: no *_enc column is ever written", async () => {
    const cols = await buildTokenColumns({ access_token: "at", refresh_token: "rt" }, null);
    expect(cols).toEqual({ access_token: "at", refresh_token: "rt", token_enc_version: 0 });
    expect(cols).not.toHaveProperty("access_token_enc");
    expect(cols).not.toHaveProperty("refresh_token_enc");
  });

  it("encrypts and drops every readable copy when a key exists", async () => {
    const cols = await buildTokenColumns({ access_token: "at", refresh_token: "rt" }, KEY);
    expect(cols.token_enc_version).toBe(1);
    expect(isCiphertext(cols.access_token_enc)).toBe(true);
    expect(isCiphertext(cols.refresh_token_enc)).toBe(true);
    expect(cols.access_token_enc).not.toContain("at");
    // Encrypted-only at rest: the legacy plaintext columns are cleared.
    expect(cols.access_token).toBeNull();
    expect(cols.refresh_token).toBeNull();
    expect(await decryptToken(cols.refresh_token_enc as string, KEY)).toBe("rt");
  });

  it("reads encrypted first and is fail-closed on a migrated row", async () => {
    const enc = await encryptToken("secret-refresh", KEY);
    expect(await readTokenField({ refresh_token_enc: enc, refresh_token: "stale" }, "refresh_token", KEY)).toBe(
      "secret-refresh",
    );
    expect(await readTokenField({ refresh_token: "legacy" }, "refresh_token", KEY)).toBe("legacy");
    expect(await readTokenField({ refresh_token: "legacy" }, "refresh_token", null)).toBe("legacy");
    // A migrated row never silently degrades back to a plaintext credential.
    expect(
      await readTokenField({ refresh_token_enc: enc, refresh_token: "legacy" }, "refresh_token", "wrong"),
    ).toBeNull();
    expect(await readTokenField({}, "refresh_token", KEY)).toBeNull();
  });
});

describe("connection lifecycle presentation", () => {
  it("flags reconnect only for a connected row in a broken state", () => {
    expect(needsReconnect({ connected: true, connection_state: "reconnect_required" })).toBe(true);
    expect(needsReconnect({ connected: true, connection_state: "revoked" })).toBe(true);
    expect(needsReconnect({ connected: true, connection_state: "connected" })).toBe(false);
    expect(needsReconnect({ connected: false, connection_state: "reconnect_required" })).toBe(false);
    expect(needsReconnect(null)).toBe(false);
  });

  it("prioritises reconnect over sync status", () => {
    expect(resolveStatusKey({ connected: true, connection_state: "reconnect_required", sync_in_progress: true }, true))
      .toBe("reconnect_required");
    expect(resolveStatusKey({ connected: true, connection_state: "connected" }, true)).toBe("syncing");
    expect(resolveStatusKey({ connected: true, last_sync_status: "error" }, false)).toBe("error");
    expect(resolveStatusKey({ connected: true, last_sync_at: "2026-01-01T00:00:00Z" }, false)).toBe("synced");
    expect(resolveStatusKey({ connected: true }, false)).toBe("idle");
    expect(statusLabel("reconnect_required")).toBe("Reconexão necessária");
  });

  it("surfaces the stored auth error, with a safe default", () => {
    expect(reconnectMessage({ connected: true, last_auth_error: "Autorização revogada." })).toBe("Autorização revogada.");
    expect(reconnectMessage({ connected: true, last_auth_error: "  " })).toContain("Reconecte");
    expect(reconnectMessage(null)).toContain("Reconecte");
  });

  it("detects the reconnect signal from both response shapes", () => {
    expect(isReconnectResponse({ code: "reconnect_required" })).toBe(true);
    expect(isReconnectResponse({ success: true, skipped: "reconnect-required" })).toBe(true);
    expect(isReconnectResponse({ success: true, skipped: "rate-limit" })).toBe(false);
    expect(isReconnectResponse(null)).toBe(false);
    expect(isReconnectResponse("reconnect_required")).toBe(false);
  });
});