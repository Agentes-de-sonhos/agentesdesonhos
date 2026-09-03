/**
 * Paridade contínua do Site Lab com o núcleo compartilhado das agências.
 *
 * Estes testes falham se a Gestão ou a Área do Cliente do laboratório
 * divergirem do menu/navegação reais, se surgirem cores fixas ou se alguma
 * superfície demonstrativa consultar/gravar dados reais.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CREATE_ITEMS,
  MANAGEMENT_ITEMS,
  PROJECTS_ITEMS,
  USER_ITEMS,
  filterMenuByPermission,
} from "@/lib/agencyAdminMenu";
import { CLIENT_AREA_NAV } from "@/lib/clientAreaNav";

const read = (p: string) => readFileSync(p, "utf8");
const adminDemo = read("src/pages/sitelab/SiteLabAdminDemo.tsx");
const clientDemo = read("src/pages/sitelab/SiteLabClientAreaDemo.tsx");
const realSidebar = read("src/components/whitelabel/admin/AgencyAdminSidebar.tsx");
const root = read("src/pages/sitelab/SiteLabRoot.tsx");

describe("Site Lab — paridade da Gestão", () => {
  it("consome a mesma fonte única de menu usada pela sidebar real", () => {
    for (const file of [adminDemo, realSidebar]) {
      expect(file).toContain('from "@/lib/agencyAdminMenu"');
      expect(file).toContain("CREATE_ITEMS");
      expect(file).toContain("MANAGEMENT_ITEMS");
      expect(file).toContain("PROJECTS_ITEMS");
      expect(file).toContain("USER_ITEMS");
    }
    // A sidebar real não redeclara os itens localmente.
    expect(realSidebar).not.toMatch(/const managementItems: MenuItemDef\[\] = \[/);
  });

  it("mantém ordem e rótulos declarados na configuração compartilhada", () => {
    expect(CREATE_ITEMS.map((i) => i.label)).toEqual([
      "Novo orçamento",
      "Novo roteiro",
      "Nova carteira digital",
      "Nova oportunidade",
      "Nova operação",
    ]);
    expect(MANAGEMENT_ITEMS.map((i) => i.label)).toEqual([
      "Oportunidades",
      "Operações",
      "Clientes",
      "Reservas",
      "Financeiro",
    ]);
    expect(PROJECTS_ITEMS.map((i) => i.label)).toEqual([
      "Orçamentos",
      "Roteiros",
      "Carteiras digitais",
      "Modelos",
    ]);
    expect(USER_ITEMS.map((i) => i.label)).toEqual(["Meu perfil", "Minha conta", "Suporte"]);
  });

  it("preserva a lógica de permissões do painel real", () => {
    const none = filterMenuByPermission(MANAGEMENT_ITEMS, () => false).map((i) => i.label);
    expect(none).toEqual(["Reservas"]);
    expect(filterMenuByPermission(MANAGEMENT_ITEMS, () => true)).toHaveLength(5);
  });
});

describe("Site Lab — paridade da Área do Cliente", () => {
  it("reutiliza a casca e as seções compartilhadas", () => {
    expect(clientDemo).toContain("clientarea/ClientAreaShell");
    expect(clientDemo).toContain("clientarea/ClientAreaSections");
    expect(clientDemo).toContain("clientarea/ClientAreaTripsView");
  });

  it("cobre todas as seções da navegação central", () => {
    for (const item of CLIENT_AREA_NAV) {
      expect(clientDemo).toContain(`view === "${item.view}"`);
    }
  });
});

describe("Site Lab — identidade e segurança", () => {
  it("usa somente tokens dinâmicos de marca (sem hex hardcoded)", () => {
    for (const file of [adminDemo, clientDemo]) {
      expect(file).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
    expect(adminDemo).toContain("var(--brand-primary)");
  });

  it("não consulta nem grava dados reais nas superfícies demonstrativas", () => {
    for (const file of [adminDemo, clientDemo]) {
      expect(file).not.toContain("integrations/supabase/client");
      expect(file).not.toContain("supabase.");
    }
  });

  it("mantém as três rotas do laboratório protegidas pela mesma senha de sessão", () => {
    expect(root).toContain("hasSitelabAccess");
    expect(root).toContain("PasswordGate");
    const app = read("src/App.tsx");
    for (const path of ["/sitelab-base", "/sitelab-base/area-do-cliente", "/sitelab-base/gestao"]) {
      expect(app).toContain(`path="${path}"`);
    }
  });

  it("não exibe o modal global de nova versão nas áreas do laboratório", () => {
    const hook = read("src/hooks/useAppUpdateModal.ts");
    expect(hook).toContain("/sitelab-base");
  });
});
