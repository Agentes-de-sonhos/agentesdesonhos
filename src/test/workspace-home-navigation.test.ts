import { describe, it, expect } from "vitest";
import {
  resolveHomeNavigation,
  shouldInterceptAnchor,
  isExitRoute,
  buildPath,
} from "@/workspace/homeNavigation";
import { titleForPath } from "@/workspace/routeTitle";
import { workspaceReducer, normalizeTabs, makeHomeTab, MAX_TABS, HOME_TAB_ID } from "@/workspace/WorkspaceProvider";

const HOME = "/dashboard";

function anchor(href: string, attrs: Record<string, string> = {}, target = "") {
  return {
    target,
    getAttribute: (n: string) => (n === "href" ? href : (attrs[n] ?? null)),
    hasAttribute: (n: string) => n in attrs,
  };
}

describe("home tab navigation boundary", () => {
  it("keeps home-route navigation inside the pinned tab", () => {
    expect(resolveHomeNavigation("/dashboard", HOME, HOME)).toEqual({ type: "stay", path: "/dashboard" });
    expect(resolveHomeNavigation({ hash: "#leads" }, HOME, HOME).type).toBe("stay");
  });

  it("opens an internal window for agenda follow-up routes preserving query/hash", () => {
    const d = resolveHomeNavigation("/gestao-clientes/oportunidades?opportunity=42#followup", HOME, HOME);
    expect(d).toEqual({
      type: "open",
      path: "/gestao-clientes/oportunidades?opportunity=42#followup",
      title: "Gestão de Clientes",
    });
  });

  it("opens Mapa do Turismo with the selected category", () => {
    const d = resolveHomeNavigation("/mapa-turismo?categoria=Operadoras%20de%20turismo", HOME, HOME);
    expect(d.type).toBe("open");
    expect(d.path).toContain("categoria=Operadoras");
    expect(d.type === "open" && d.title).toBe("Mapa do Turismo");
  });

  it("opens internal windows for Academy, Comunidade, Próximas Viagens and Radar hub", () => {
    const cases: Array<[string, string]> = [
      ["/educa-academy", "EducaTravel Academy"],
      ["/educa-academy/trilha/9", "EducaTravel Academy"],
      ["/comunidade", "Comunidade"],
      ["/comunidade/perfil/7", "Comunidade"],
      ["/proximas-viagens", "Próximas Viagens"],
      ["/noticias", "Radar do Turismo"],
    ];
    for (const [path, title] of cases) {
      const d = resolveHomeNavigation(path, HOME, HOME);
      expect(d.type).toBe("open");
      expect(d.type === "open" && d.title).toBe(title);
    }
  });

  it("treats guard redirects and auth exits as in-place navigation", () => {
    expect(resolveHomeNavigation("/auth", HOME, HOME).type).toBe("stay");
    expect(resolveHomeNavigation("/onboarding", HOME, HOME).type).toBe("stay");
    expect(resolveHomeNavigation("/crm", HOME, HOME, { replace: true }).type).toBe("stay");
    expect(isExitRoute("/auth")).toBe(true);
    expect(isExitRoute("/crm")).toBe(false);
  });

  it("never intercepts external, _blank, mailto/tel or download links", () => {
    expect(shouldInterceptAnchor(anchor("https://portal.com/news"))).toBe(false);
    expect(shouldInterceptAnchor(anchor("//cdn.com/x"))).toBe(false);
    expect(shouldInterceptAnchor(anchor("mailto:a@b.com"))).toBe(false);
    expect(shouldInterceptAnchor(anchor("tel:+5511999"))).toBe(false);
    expect(shouldInterceptAnchor(anchor("/arquivo.pdf", { download: "" }))).toBe(false);
    expect(shouldInterceptAnchor(anchor("/noticias/1", {}, "_blank"))).toBe(false);
    expect(shouldInterceptAnchor(anchor("/mapa-turismo", { "data-workspace-ignore": "" }))).toBe(false);
    // individual news items are rendered as target=_blank external anchors
    expect(shouldInterceptAnchor(anchor("https://mercadoeeventos.com.br/x", {}, "_blank"))).toBe(false);
    // internal dashboard link is interceptable
    expect(shouldInterceptAnchor(anchor("/mapa-turismo"))).toBe(true);
  });

  it("builds paths and titles consistently", () => {
    expect(buildPath({ pathname: "/x", search: "?a=1", hash: "#b" }, "/dashboard")).toBe("/x?a=1#b");
    expect(titleForPath("/ferramentas-ia/trip-wallet")).toBe("Carteira Digital");
    expect(titleForPath("/mapa-turismo/operadora/1")).toBe("Mapa do Turismo");
    expect(titleForPath("/algo-novo")).toBe("Algo Novo");
  });
});

describe("workspace window identity from the home tab", () => {
  const base = { tabs: normalizeTabs([], HOME), activeId: HOME_TAB_ID, homePath: HOME };

  it("dedupes by route and preserves navigation state", () => {
    const s1 = workspaceReducer(base, { type: "OPEN_OR_ACTIVATE", path: "/crm?id=1", title: "CRM", state: { id: 1 } });
    expect(s1.tabs).toHaveLength(2);
    expect(s1.tabs[1].state).toEqual({ id: 1 });
    const s2 = workspaceReducer(s1, { type: "OPEN_OR_ACTIVATE", path: "/crm?id=1", title: "CRM" });
    expect(s2.tabs).toHaveLength(2);
    expect(s2.activeId).toBe(s1.tabs[1].id);
  });

  it("keeps Inicial pinned at index 0 and never uses it as fallback at the limit", () => {
    let state = base;
    for (let i = 0; i < MAX_TABS; i++) {
      state = workspaceReducer(state, { type: "OPEN_OR_ACTIVATE", path: `/rota-${i}`, title: `Rota ${i}` });
    }
    const blocked = workspaceReducer(state, { type: "OPEN_OR_ACTIVATE", path: "/rota-extra", title: "Extra" });
    expect(blocked).toBe(state);
    expect(blocked.tabs[0]).toMatchObject({ id: HOME_TAB_ID, path: HOME, pinned: true });
    expect(blocked.tabs.find((t) => t.path === "/rota-extra")).toBeUndefined();
    expect(makeHomeTab(HOME).pinned).toBe(true);
  });
});