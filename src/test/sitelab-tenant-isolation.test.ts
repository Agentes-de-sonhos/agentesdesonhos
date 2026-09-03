import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITELAB_BASE, SITELAB_BASE_PATH } from "@/lib/sitelabModels";

const root = readFileSync("src/pages/sitelab/SiteLabRoot.tsx", "utf8");
const adminArea = readFileSync(
  "src/components/whitelabel/admin/AgencyAdminArea.tsx",
  "utf8",
);
const ownerHook = readFileSync("src/hooks/useAgencyOwnerId.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260825220502_b41eab45-749e-4906-ae67-c82ed5a5932c.sql",
  "utf8",
);

describe("isolamento do tenant técnico do Site Lab", () => {
  it("1) o laboratório não monta o painel autenticado — agencyOwnerId nunca vira o auth.uid() do admin", () => {
    // O painel real só resolve o contexto por auth.uid()/agency_membership;
    // por isso o laboratório não o monta enquanto não houver conta técnica.
    expect(ownerHook).toContain("agency_membership");
    expect(root).not.toContain("<AgencyAdminArea");
    expect(root).not.toContain("admin/AgencyAdminArea");
    expect(root).toContain("SiteLabAdminUnavailable");
  });

  it("2) a gestão do laboratório não faz nenhuma consulta autenticada", () => {
    const surface = root.slice(root.indexOf("function SiteLabAdminUnavailable"));
    const body = surface.slice(0, surface.indexOf("function demoInfo"));
    expect(body).not.toMatch(/supabase|useAuth|useQuery|useAgencyOwnerId|from\(/);
    // Providers autenticados não aparecem em nenhum ponto do laboratório.
    expect(root).not.toContain("TeamSessionProvider");
    expect(root).not.toContain("AuthProvider");
  });

  it("3) tenants reais mantêm exatamente a resolução anterior de acesso", () => {
    // A função foi revertida à lógica original: dono do domínio ou vínculo real.
    expect(migration).toContain("v_allowed := v_agency = v_uid");
    expect(migration).toContain("FROM public.agency_membership m");
    expect(adminArea).toContain("AgencyAdminShell");
    expect(adminArea).toContain("TeamSessionProvider");
  });

  it("4) identidade visual não altera escopo de dados", () => {
    // Nenhuma sobreposição de identidade é injetada no painel real.
    expect(adminArea).not.toContain("identity");
    expect(root).not.toMatch(/identity=\{\{/);
  });

  it("5) nenhuma rota do laboratório escapa do prefixo", () => {
    expect(SITELAB_BASE_PATH).toBe("/sitelab-base");
    expect(root).toContain(`${"${SITELAB_BASE_PATH}"}/area-do-cliente`);
    expect(root).not.toMatch(/"\/gestao"/);
    expect(SITELAB_BASE.adminHostname).toBe("sitelab.local");
  });
});
