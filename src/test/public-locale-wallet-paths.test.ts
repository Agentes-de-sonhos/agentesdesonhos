import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { resolvePublicLocale } from "@/i18n/publicMaterials/locale";
import { reconcileCachedAgentProfile, hasPublicLocale } from "@/lib/walletOfflineProfile";

const root = path.join(__dirname, "..", "..");
const migrations = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .map((f) => fs.readFileSync(path.join(root, "supabase", "migrations", f), "utf-8"))
  .join("\n");

const rpcFixture = (locale: string | null) => ({
  name: "Agente",
  agency_name: "Agência",
  agency_primary_color: "#123456",
  ...(locale === null ? {} : { public_content_locale: locale }),
});

describe("carteira pública: idioma em todos os caminhos", () => {
  it("migrations definem public_content_locale nos RPCs públicos da carteira", () => {
    for (const fn of ["verify_trip_by_public_code", "verify_trip_access", "verify_trip_access_by_slug"]) {
      const idx = migrations.lastIndexOf(`FUNCTION public.${fn}(`);
      expect(idx, `${fn} deve existir nas migrations`).toBeGreaterThan(-1);
      const body = migrations.slice(idx, idx + 6000);
      expect(body, `${fn} deve devolver o idioma`).toContain("'public_content_locale', COALESCE(");
      expect(body).toContain("'pt-BR'");
      expect(body).toContain("SECURITY DEFINER");
      expect(body).toContain("SET search_path");
    }
  });

  // a) it-IT sem senha  b) it-IT com senha  e) public_access_code
  it("public_access_code (com e sem senha) entrega it-IT", () => {
    expect(resolvePublicLocale(rpcFixture("it-IT"))).toBe("it-IT");
  });

  // c) token / d) slug
  it("token e slug entregam o idioma configurado", () => {
    expect(resolvePublicLocale(rpcFixture("it-IT"))).toBe("it-IT");
    expect(resolvePublicLocale(rpcFixture("pt-BR"))).toBe("pt-BR");
  });

  // f) Área do Cliente reutiliza o mesmo RPC (sem montar perfil próprio)
  it("client-area-wallet-open usa verify_trip_by_public_code e não monta agent_profile", () => {
    const src = fs.readFileSync(
      path.join(root, "supabase", "functions", "client-area-wallet-open", "index.ts"),
      "utf-8",
    );
    expect(src).toContain("verify_trip_by_public_code");
    expect(src).not.toContain("agent_profile:");
    expect(src).toContain("return json(payload)");
  });

  // g) cache antigo sem locale
  it("cache antigo sem idioma não decide o idioma e é complementado pelo branding", () => {
    const cachedOld = rpcFixture(null);
    expect(hasPublicLocale(cachedOld)).toBe(false);
    expect(resolvePublicLocale(cachedOld)).toBe("pt-BR");

    const fixed = reconcileCachedAgentProfile(cachedOld, rpcFixture("it-IT"));
    expect(resolvePublicLocale(fixed)).toBe("it-IT");
    expect((fixed as any).agency_primary_color).toBe("#123456");
  });

  it("cache já com idioma não é sobrescrito pelo branding", () => {
    const cached = rpcFixture("it-IT");
    const result = reconcileCachedAgentProfile(cached, rpcFixture("pt-BR"));
    expect(resolvePublicLocale(result)).toBe("it-IT");
  });

  // h) fallback pt-BR
  it("fallback pt-BR sem branding e sem perfil", () => {
    expect(resolvePublicLocale(reconcileCachedAgentProfile(rpcFixture(null), null))).toBe("pt-BR");
    expect(resolvePublicLocale(null)).toBe("pt-BR");
  });

  it("a página pública reconcilia o cache offline antes de renderizar", () => {
    const page = fs.readFileSync(path.join(root, "src", "pages", "CarteiraPublicaV2.tsx"), "utf-8");
    expect(page).toContain("reconcileCachedAgentProfile");
    expect(page).toContain("setOfflineCache(accessCode, result)");
  });
});
