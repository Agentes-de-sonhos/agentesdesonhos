/**
 * Contrato do Site Lab Base: as áreas internas usam as PÁGINAS REAIS do white
 * label (as mesmas de Destinos com a Ju, 100 Limites e Paraíso). Não existe
 * tela paralela, fixture, tenant ou dado de demonstração.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const root = read("src/pages/sitelab/SiteLabRoot.tsx");
const adminArea = read("src/components/whitelabel/admin/AgencyAdminArea.tsx");
const app = read("src/App.tsx");

describe("Site Lab Base — áreas internas reais", () => {
  it("gestão monta a árvore real (AgencyAdminArea), não um demo", () => {
    expect(root).toContain('import("@/components/whitelabel/admin/AgencyAdminArea")');
    expect(root).toContain("<AgencyAdminArea");
    expect(root).not.toMatch(/SiteLabAdminDemo|SiteLabAdminSurfaces/);
  });

  it("área do cliente monta a página real (AgencyClientArea)", () => {
    expect(root).toContain('import("@/pages/whitelabel/AgencyClientArea")');
    expect(root).toContain("<AgencyClientArea");
    expect(root).not.toContain("SiteLabClientAreaDemo");
  });

  it("nenhuma fixture, navegação paralela ou dado de demonstração permanece", () => {
    for (const p of [
      "src/pages/sitelab/SiteLabAdminDemo.tsx",
      "src/pages/sitelab/SiteLabAdminSurfaces.tsx",
      "src/pages/sitelab/SiteLabClientAreaDemo.tsx",
      "src/pages/sitelab/sitelabFixtures.ts",
      "src/lib/sitelabAdminNav.ts",
    ]) {
      expect(existsSync(resolve(process.cwd(), p))).toBe(false);
    }
    expect(root).not.toContain("?destino=");
    expect(root).not.toMatch(/DEMO_(KPIS|PROJECTS|KANBAN|CLIENTS|BOOKINGS|FINANCIAL|AGENDA|TRIPS)/);
  });

  it("as áreas internas não exibem badge/texto de demonstração", () => {
    expect(root).not.toContain("Ambiente de demonstração");
    expect(root).not.toContain("nenhum dado é");
  });

  it("a senha externa do laboratório continua antes das áreas", () => {
    expect(root).toContain("PasswordGate");
    expect(root).toContain("verifySitelabPassword");
    expect(root).toContain("hasSitelabAccess");
  });

  it("as rotas reais do painel continuam registradas na árvore compartilhada", () => {
    for (const route of [
      '"meus-projetos"',
      '"agenda"',
      '"crm/funil"',
      '"crm/operacoes"',
      '"crm/clientes"',
      '"reservas"',
      '"financeiro"',
      '"criar/orcamento"',
      '"criar/roteiro"',
      '"criar/carteira"',
      '"criar/modelos-roteiros"',
      '"perfil"',
      '"minha-conta"',
      '"suporte"',
    ]) {
      expect(adminArea).toContain(route);
    }
  });

  it("guard, providers e permissões reais permanecem no caminho dos tenants ativos", () => {
    expect(adminArea).toContain("AgencyAdminShell");
    expect(adminArea).toContain("AuthProvider");
    expect(adminArea).toContain("TeamSessionProvider");
    expect(adminArea).toContain("SubscriptionProvider");
    expect(adminArea).toContain("AgencyAdminNavProvider");
    /* Prefixo opcional: extração mecânica, sem alterar o fluxo atual. */
    expect(adminArea).toContain("entryPath ?? initialWorkspacePath()");
  });

  it("as três rotas do laboratório continuam existindo", () => {
    expect(app).toContain('path="/sitelab-base"');
    expect(app).toContain('path="/sitelab-base/area-do-cliente"');
    expect(app).toContain('path="/sitelab-base/gestao"');
  });

  it("identidade do Site Lab é só nome, logo e paleta, sem cor de agência", () => {
    const models = read("src/lib/sitelabModels.ts");
    expect(models).toContain("primary");
    expect(models).toContain("secondary");
    expect(models).toContain("tertiary");
    expect(root).toContain("useAgencyBrandTheme");
    /* Nenhuma cor de tenant real embutida. */
    expect(root).not.toMatch(/#(?:8B1|A31|0B2|1B2)/i);
  });
});
