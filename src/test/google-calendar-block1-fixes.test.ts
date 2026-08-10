import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildTokenColumns,
  decryptToken,
  isCiphertext,
  readTokenField,
} from "../../supabase/functions/_shared/googleTokenCrypto";

const KEY = "unit-test-token-key";
const fn = (p: string) => readFileSync(resolve(process.cwd(), "supabase/functions", p), "utf8");

describe("legacy row encryption migration", () => {
  it("encrypts access AND refresh token when migrating a legacy row", async () => {
    const legacy = {
      access_token: "old-access",
      refresh_token: "legacy-refresh",
      access_token_enc: null,
      refresh_token_enc: null,
      token_enc_version: 0,
    };
    const cols = await buildTokenColumns(
      { access_token: "new-access", refresh_token: legacy.refresh_token },
      KEY,
      legacy,
    );
    expect(isCiphertext(cols.access_token_enc)).toBe(true);
    expect(isCiphertext(cols.refresh_token_enc)).toBe(true);
    expect(cols.token_enc_version).toBe(1);
    expect(await decryptToken(cols.refresh_token_enc as string, KEY)).toBe("legacy-refresh");
  });

  it("never claims version 1 when refresh_token_enc would be missing", async () => {
    const legacy = { refresh_token: "legacy-refresh", refresh_token_enc: null, token_enc_version: 0 };
    const cols = await buildTokenColumns({ access_token: "new-access" }, KEY, legacy);
    expect(isCiphertext(cols.access_token_enc)).toBe(true);
    expect(cols.refresh_token_enc).toBeUndefined();
    expect(cols.token_enc_version).toBe(0);
  });

  it("keeps version 1 when the refresh token is already ciphertext", async () => {
    const already = {
      refresh_token_enc: await (await import("../../supabase/functions/_shared/googleTokenCrypto")).encryptToken("r", KEY),
      token_enc_version: 1,
    };
    const cols = await buildTokenColumns({ access_token: "a" }, KEY, already);
    expect(cols.token_enc_version).toBe(1);
  });

  it("stays at version 0 with no key and never writes plaintext into *_enc", async () => {
    const cols = await buildTokenColumns({ access_token: "a", refresh_token: "r" }, null);
    expect(cols.token_enc_version).toBe(0);
    expect(cols.access_token_enc).toBeUndefined();
    expect(cols.refresh_token_enc).toBeUndefined();
  });

  // Superseded contract: refresh persistence is now fail-closed and only ever
  // goes through the verified round-trip builder (buildTokenColumns is banned
  // from production paths).
  it("persists refreshed credentials only through the verified builder", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).not.toContain("buildTokenColumns");
    expect(src).toMatch(/buildVerifiedEncryptedColumns\(/);
    expect(src).toMatch(/existing\?: any,\s*\n\s*refreshTokenPlain\?: string \| null,/);
  });
});

describe("callback reconnect dual-read", () => {
  it("selects both plaintext and encrypted refresh columns", () => {
    const src = fn("google-calendar-callback/index.ts");
    expect(src).toMatch(/refresh_token, refresh_token_enc, access_token_enc, token_enc_version/);
    expect(src).toMatch(/readTokenField\(existing, "refresh_token", encKey\)/);
  });

  it("reads the encrypted refresh token when plaintext is already cleared", async () => {
    const { encryptToken } = await import("../../supabase/functions/_shared/googleTokenCrypto");
    const record = {
      refresh_token: null,
      refresh_token_enc: await encryptToken("encrypted-refresh", KEY),
      token_enc_version: 1,
    };
    expect(await readTokenField(record, "refresh_token", KEY)).toBe("encrypted-refresh");
  });
});

describe("disconnect failure handling", () => {
  it("only reports success when the token row was really deleted", () => {
    const src = fn("google-calendar-sync/index.ts");
    expect(src).toMatch(/const \{ error: deleteError \} = await supabase\s*\n\s*\.from\("google_calendar_tokens"\)/);
    expect(src).toMatch(/if \(deleteError\)/);
    expect(src).toMatch(/Não foi possível desconectar agora/);
  });

  it("returns a generic error without leaking secrets and only purges local copies on request", () => {
    const src = fn("google-calendar-sync/index.ts");
    const block = src.slice(src.indexOf('action === "disconnect"'), src.indexOf('action === "status"'));
    // Local copies are only touched behind the explicit opt-in flag.
    expect(block).toContain("const purgeLocal = body.purge_local === true;");
    expect(block).toMatch(/if \(purgeLocal\) \{/);
    // The purge is delegated to a transactional RPC scoped to the requesting user.
    expect(block).toMatch(/purge_google_calendar_local_copies[\s\S]{0,120}?p_user_id: userId/);
    expect(block).not.toMatch(/refresh_token:|token=\$\{/);
  });
});

describe("cron logging hygiene", () => {
  it("never logs user identifiers per invocation", () => {
    const src = fn("google-calendar-cron/index.ts");
    const logs = src.match(/console\.(log|warn|error)\([^\n]*\)/g) || [];
    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) expect(line).not.toMatch(/user=|t\.user_id/);
  });

  it("returns only aggregated counters", () => {
    const src = fn("google-calendar-cron/index.ts");
    const body = src.slice(src.lastIndexOf("JSON.stringify({"));
    expect(body).not.toMatch(/user_id/);
    expect(body).toMatch(/status_counts/);
    expect(body).toMatch(/skip_counts/);
  });
});
