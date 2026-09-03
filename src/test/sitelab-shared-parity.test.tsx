/**
 * Paridade contínua do Site Lab com o núcleo compartilhado das agências.
 *
 * Estes testes falham se a Gestão ou a Área do Cliente do laboratório
 * divergirem do menu/navegação reais, se surgirem cores fixas ou se alguma
 * superfície demonstrativa consultar/gravar dados reais.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import SiteLabAdminDemo from "@/pages/sitelab/SiteLabAdminDemo";
import { sitelabAdminHref } from "@/lib/sitelabAdminNav";
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
const realLayout = read("src/components/whitelabel/admin/AgencyAdminLayout.tsx");
const surfaces = read("src/pages/sitelab/SiteLabAdminSurfaces.tsx");

const DEMO_INFO = {
  agency_slug: "sitelab-base",
  agency_name: "Site Lab Base",
  user_id: "00000000-0000-0000-0000-000000000000",
  logo_url: null,
} as never;

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function renderDemo(initial = "/sitelab-base/gestao") {
  /* BrowserRouter para exercitar voltar/avançar e "recarregar" de verdade. */
  window.history.pushState({}, "", initial);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/sitelab-base/gestao" element={<SiteLabAdminDemo info={DEMO_INFO} />} />
      </Routes>
    </BrowserRouter>,
  );
}

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

  it("renderiza a MESMA camada presentacional da gestão real (View + Shell)", () => {
    for (const file of [adminDemo, realSidebar]) {
      expect(file).toContain("AgencyAdminSidebarView");
    }
    for (const file of [adminDemo, realLayout]) {
      expect(file).toContain("AgencyAdminShellView");
    }
    // Sem markup duplicado no laboratório.
    expect(adminDemo).not.toContain("SidebarNav");
    expect(adminDemo).not.toContain("DemoSurface");
    expect(adminDemo).not.toContain('from "@/components/ui/sheet"');
  });

  it("cada categoria tem superfície demonstrativa própria, não uma única tela genérica", () => {
    for (const kind of ["projects", "kanban", "clients", "bookings", "financial", "agenda", "editor", "account"]) {
      expect(surfaces).toContain(`data-demo-surface="${kind}"`);
    }
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
    for (const file of [adminDemo, clientDemo, surfaces]) {
      expect(file).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
    expect(surfaces).toContain("var(--agency-primary)");
  });

  it("não consulta nem grava dados reais nas superfícies demonstrativas", () => {
    for (const file of [adminDemo, clientDemo, surfaces]) {
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
    const hook = read("src/hooks/useAppVersion.ts");
    expect(hook).toContain("/sitelab-base");
  });
});

describe("Site Lab — navegação interna da Gestão", () => {
  it("reflete a seleção na URL protegida do laboratório e nunca em /gestao real", async () => {
    const user = userEvent.setup();
    renderDemo();
    expect(sitelabAdminHref(MANAGEMENT_ITEMS[2])).toBe(
      "/sitelab-base/gestao?destino=gestao-crm-clientes",
    );

    const nav = document.querySelector("[data-agency-admin-sidebar]") as HTMLElement;
    for (const link of Array.from(nav.querySelectorAll("a[href]"))) {
      const href = link.getAttribute("href") ?? "";
      expect(href.startsWith("/sitelab-base")).toBe(true);
    }

    const clickHref = async (href: string) => {
      const link = nav.querySelector(`a[href="${href}"]`) as HTMLElement;
      expect(link).toBeTruthy();
      await user.click(link);
    };

    await clickHref("/sitelab-base/gestao?destino=gestao-crm-clientes");
    expect(window.location.pathname).toBe("/sitelab-base/gestao");
    expect(document.querySelector('[data-demo-surface="clients"]')).toBeTruthy();

    await clickHref(sitelabAdminHref(MANAGEMENT_ITEMS[4]));
    expect(document.querySelector('[data-demo-surface="financial"]')).toBeTruthy();

    // Voltar preserva a seleção anterior.
    window.history.back();
    await new Promise((r) => setTimeout(r, 120));
    expect(document.querySelector('[data-demo-surface="clients"]')).toBeTruthy();
  });

  it("preserva a seleção ao recarregar uma subrota", () => {
    renderDemo("/sitelab-base/gestao?destino=gestao-financeiro");
    expect(document.querySelector('[data-demo-surface="financial"]')).toBeTruthy();
    expect(screen.getAllByText(/Demonstração/).length).toBeGreaterThan(0);
  });

  it("cai para o monograma quando o logo falha, sem marca de terceiros", () => {
    const view = read("src/components/whitelabel/admin/AgencyAdminSidebarView.tsx");
    expect(view).toContain("onError");
    expect(view).toContain("var(--agency-primary)");
    expect(view).not.toMatch(/Agentes de Sonhos/);
    expect(root).toContain("setLogoOk(false)");
  });
});
