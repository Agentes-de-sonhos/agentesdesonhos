import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  APP_AGENDA_ITEM,
  APP_CREATE_GROUP,
  APP_MANAGEMENT_ITEMS,
  APP_MORE_GROUP,
  APP_OTHER_ITEMS,
  APP_PROJECTS_GROUP,
  APP_SIDEBAR_SECTION_ORDER,
} from "@/lib/appSidebarMenu";

const desktop = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
const mobile = readFileSync("src/components/layout/MobileDrawerMenu.tsx", "utf8");
const whiteLabel = readFileSync("src/components/whitelabel/admin/AgencyAdminSidebarView.tsx", "utf8");

describe("menu lateral Agentes de Sonhos", () => {
  it("mantém a hierarquia e a ordem fixa solicitadas", () => {
    expect(APP_SIDEBAR_SECTION_ORDER).toEqual(["MEU TRABALHO", "GESTÃO", "OUTRAS"]);
    expect(APP_CREATE_GROUP.title).toBe("Criar novo");
    expect(APP_PROJECTS_GROUP.items.map((item) => item.title)).toEqual([
      "Orçamentos",
      "Roteiros",
      "Carteiras digitais",
    ]);
    expect(APP_AGENDA_ITEM.title).toBe("Agenda");
    expect(APP_MANAGEMENT_ITEMS.map((item) => item.title)).toEqual([
      "Clientes",
      "Oportunidades",
      "Operações",
      "Reservas",
      "Financeiro",
    ]);
    expect(APP_OTHER_ITEMS.map((item) => item.title)).toEqual([
      "Notícias do Trade",
      "EducaTravel Academy",
      "Mapa do Turismo",
    ]);
  });

  it('mantém exatamente os nove itens dentro de "Mais…"', () => {
    expect(APP_MORE_GROUP.title).toBe("Mais…");
    expect(APP_MORE_GROUP.items.map((item) => item.title)).toEqual([
      "Raio-X do Hotel",
      "Benefícios e Descontos",
      "Páginas de Vendas",
      "Formulário Conversacional",
      "Cartão de Visitas",
      "Vitrine de Ofertas",
      "Legendas, Stories e WhatsApp",
      "Personalizador de Lâminas",
      "Central de Requisitos",
    ]);
  });

  it("preserva rotas, abas de projetos e metadados de permissão/plano", () => {
    expect(APP_PROJECTS_GROUP.items.map((item) => item.url)).toEqual([
      "/meus-projetos?tab=orcamentos",
      "/meus-projetos?tab=roteiros",
      "/meus-projetos?tab=carteiras",
    ]);
    expect(APP_MANAGEMENT_ITEMS.find((item) => item.title === "Clientes")?.requiredPermission).toBe("clients.view");
    expect(APP_MANAGEMENT_ITEMS.find((item) => item.title === "Financeiro")?.requiredFeature).toBe("financial");
    expect(APP_MORE_GROUP.items.find((item) => item.title === "Central de Requisitos")?.requiredFeature).toBe("travel_requirements");
  });

  it("usa a mesma fonte no desktop e mobile e mantém grupos acessíveis", () => {
    for (const source of [desktop, mobile]) {
      expect(source).toContain("APP_CREATE_GROUP");
      expect(source).toContain("APP_PROJECTS_GROUP");
      expect(source).toContain("APP_MORE_GROUP");
      expect(source).toContain("aria-expanded");
      expect(source).toContain("aria-controls");
      expect(source).toContain("aria-current");
      expect(source).toContain("isPermitted");
      expect(source).toContain("isLocked");
    }
  });

  it("mantém hover automático e protege o dropdown da conta no desktop", () => {
    expect(desktop).toContain("onMouseEnter={handleSidebarMouseEnter}");
    expect(desktop).toContain("onMouseLeave={handleSidebarMouseLeave}");
    expect(desktop).toContain("onFocusCapture={expandNow}");
    expect(desktop).toContain("onBlurCapture");
    expect(desktop).toContain("if (!accountOpen)");
    expect(desktop).toContain("handleAccountOpenChange");
  });

  it("remove perfil, suporte e comunidade do corpo sem remover as rotas da conta", () => {
    expect(desktop).not.toContain("comunidadeItem");
    expect(mobile).not.toContain("comunidadeItem");
    const account = readFileSync("src/components/layout/AppSidebarAccount.tsx", "utf8");
    expect(account).toContain('{ label: "Meu perfil", to: "/perfil"');
    expect(account).toContain('{ label: "Minha conta", to: "/minha-conta"');
    expect(account).toContain('{ label: "Suporte", to: "/suporte"');
    expect(account.indexOf("Meu perfil")).toBeLessThan(account.indexOf("Minha conta"));
    expect(account.indexOf("Minha conta")).toBeLessThan(account.indexOf("Suporte"));
    expect(account).toContain("DropdownMenuSeparator");
    expect(account).toContain("onSelect={onSignOut}");
  });

  it("preserva o cabeçalho original e navegação em abas internas", () => {
    expect(desktop).toContain("Agentes de Sonhos");
    expect(desktop).toContain("gradient-primary");
    expect(mobile).toContain("useOpenInternalWindow");
    expect(desktop).toContain("data-workspace-title");
  });

  it("não altera a implementação do menu Site Lab/white-label", () => {
    expect(whiteLabel).toContain("data-agency-admin-sidebar");
    expect(whiteLabel).toContain("createMenuOpen");
    expect(whiteLabel).toContain("projectsOpen");
    expect(whiteLabel).toContain("userMenuOpen");
    expect(whiteLabel).not.toContain("APP_MORE_GROUP");
  });
});