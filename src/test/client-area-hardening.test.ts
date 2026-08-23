import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const AUTH = read("supabase/functions/client-area-auth/index.ts");
const ADMIN = read("supabase/functions/client-area-admin/index.ts");
const WALLET = read("supabase/functions/client-area-wallet-open/index.ts");
const PAGE = read("src/pages/whitelabel/AgencyClientArea.tsx");

describe("Área do Cliente — endurecimento final (Etapa 6)", () => {
  it("respostas autenticadas nunca ficam em cache nem inferem tipo", () => {
    for (const src of [AUTH, ADMIN, WALLET]) {
      expect(src).toContain("'Cache-Control': 'no-store");
      expect(src).toContain("'X-Content-Type-Options': 'nosniff'");
      expect(src).toContain("'Referrer-Policy': 'no-referrer'");
      expect(src).toContain("'Vary': 'Origin'");
    }
  });

  it("nenhum endpoint da área do cliente libera CORS para qualquer site", () => {
    for (const src of [AUTH, ADMIN, WALLET]) {
      expect(src).not.toContain("'Access-Control-Allow-Origin': '*'");
    }
  });

  it("abertura da carteira valida a origem contra domínios White Label ativos", () => {
    expect(WALLET).toContain("agency_public_domains");
    expect(WALLET).toContain("isPlatformOriginHost");
    expect(WALLET).toContain("is_active");
  });

  it("autorização da carteira é de uso único, expira na escrita e é da agência emissora", () => {
    expect(WALLET).toContain(".is('used_at', null)");
    expect(WALLET).toContain(".gt('expires_at'");
    expect(WALLET).toContain("trip.user_id !== row.agency_id");
  });

  it("a área autenticada do passageiro não é indexável", () => {
    expect(PAGE).toContain("useNoindex(true)");
  });
});
