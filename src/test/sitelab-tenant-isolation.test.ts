import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITELAB_BASE, SITELAB_BASE_PATH } from "@/lib/sitelabModels";

const root = readFileSync("src/pages/sitelab/SiteLabRoot.tsx", "utf8");
const adminEntry = readFileSync("src/pages/sitelab/SiteLabAdminEntry.tsx", "utf8");
const adminArea = readFileSync(
  "src/components/whitelabel/admin/AgencyAdminArea.tsx",
  "utf8",
);
const shell = readFileSync(
  "src/components/whitelabel/admin/AgencyAdminShell.tsx",
  "utf8",
);
const provision = readFileSync("supabase/functions/sitelab-provision/index.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260825220502_b41eab45-749e-4906-ae67-c82ed5a5932c.sql",
  "utf8",
);

describe("isolamento do tenant técnico do Site Lab", () => {
  it("1) a gestão do laboratório usa o painel real montado no hostname técnico", () => {
    expect(adminEntry).toContain("<AgencyAdminArea");
    expect(adminEntry).toContain("hostname={model.adminHostname}");
    expect(adminEntry).toContain(`basePath={SITELAB_BASE_PATH}`);
  });

  it("2) o escopo de dados vem do guard real, não de identidade visual", () => {
    // O guard resolve a agência pelo hostname e confirma o vínculo no servidor.
    expect(shell).toContain("fetchAgencyAdminPortal(hostname)");
    expect(shell).toContain("checkAgencyAdminAccess(hostname)");
    expect(shell).toContain("void signOut()");
    expect(adminArea).not.toContain("identity");
    expect(root).not.toMatch(/identity=\{\{/);
    expect(adminEntry).not.toMatch(/identity=\{\{/);
  });

  it("3) tenants reais mantêm exatamente a resolução anterior de acesso", () => {
    expect(migration).toContain("v_allowed := v_agency = v_uid");
    expect(migration).toContain("FROM public.agency_membership m");
    expect(adminArea).toContain("AgencyAdminShell");
    expect(adminArea).toContain("TeamSessionProvider");
  });

  it("4) a conta técnica é exclusiva do laboratório e master apenas de si mesma", () => {
    expect(provision).toContain("sitelab.base@agentesdesonhos.com.br");
    expect(provision).toContain("agency_id: labId");
    expect(provision).toContain('role: "master"');
    // Nunca reutiliza conta/dados de agência real e nunca toca auth por SQL.
    expect(provision).not.toMatch(/destinoscomaju|paraiso|100limites/i);
    expect(provision).toContain('.eq("hostname", LAB_HOSTNAME)');
  });

  it("5) nenhuma rota do laboratório escapa do prefixo", () => {
    expect(SITELAB_BASE_PATH).toBe("/sitelab-base");
    expect(root).toContain(`${"${SITELAB_BASE_PATH}"}/area-do-cliente`);
    expect(root).not.toMatch(/"\/gestao"/);
    expect(adminEntry).not.toMatch(/"\/gestao"/);
    expect(SITELAB_BASE.adminHostname).toBe("sitelab.local");
  });
});
