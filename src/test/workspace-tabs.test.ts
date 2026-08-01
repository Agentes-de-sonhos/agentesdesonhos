import { describe, it, expect } from "vitest";
import {
  HOME_TAB_ID, MAX_TABS, makeHomeTab, normalizeTabs, countContentTabs, workspaceReducer,
  type WorkspaceTab,
} from "@/workspace/WorkspaceProvider";
import { toTabTitleCase } from "@/lib/tabTitle";

const HOME = "/dashboard";
const base = (tabs: WorkspaceTab[], activeId = HOME_TAB_ID) => ({
  tabs: normalizeTabs(tabs, HOME), activeId, homePath: HOME,
});

describe("pinned home tab", () => {
  it("is always first, unique and pinned", () => {
    const tabs = normalizeTabs(
      [{ id: "a", path: "/agenda", title: "agenda" }, makeHomeTab(HOME), { id: "b", path: HOME, title: "Inicial" }],
      HOME,
    );
    expect(tabs[0].id).toBe(HOME_TAB_ID);
    expect(tabs[0].pinned).toBe(true);
    expect(tabs.filter((t) => t.path === HOME)).toHaveLength(1);
    expect(tabs.map((t) => t.path)).toEqual([HOME, "/agenda"]);
  });

  it("cannot be closed by any mechanism", () => {
    let state = base([{ id: "a", path: "/agenda", title: "Agenda" }]);
    state = workspaceReducer(state, { type: "CLOSE", id: HOME_TAB_ID });
    expect(state.tabs[0].id).toBe(HOME_TAB_ID);
    state = workspaceReducer(state, { type: "CLOSE_OTHERS", id: "a" });
    expect(state.tabs.some((t) => t.id === HOME_TAB_ID)).toBe(true);
    state = workspaceReducer(state, { type: "CLOSE_ALL" });
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].id).toBe(HOME_TAB_ID);
    expect(state.activeId).toBe(HOME_TAB_ID);
  });

  it("does not consume the 10 content-window capacity", () => {
    let state = base([]);
    for (let i = 0; i < MAX_TABS; i++) {
      state = workspaceReducer(state, { type: "OPEN", path: `/p${i}`, title: `Página ${i}` });
    }
    expect(countContentTabs(state.tabs)).toBe(MAX_TABS);
    expect(state.tabs).toHaveLength(MAX_TABS + 1);
  });

  it("activates home instead of duplicating when home path is opened", () => {
    const state = workspaceReducer(base([]), { type: "OPEN_OR_ACTIVATE", path: HOME, title: "Dashboard" });
    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe(HOME_TAB_ID);
  });

  it("does not duplicate a tab for an already open route", () => {
    let state = workspaceReducer(base([]), { type: "OPEN_OR_ACTIVATE", path: "/agenda", title: "Agenda" });
    state = workspaceReducer(state, { type: "OPEN_OR_ACTIVATE", path: "/agenda", title: "AGENDA" });
    expect(countContentTabs(state.tabs)).toBe(1);
  });
});

describe("toTabTitleCase", () => {
  it("applies Portuguese title case", () => {
    expect(toTabTitleCase("gestão financeira")).toBe("Gestão Financeira");
    expect(toTabTitleCase("MAPA DO TURISMO")).toBe("Mapa do Turismo");
    expect(toTabTitleCase("proximas viagens")).toBe("Proximas Viagens");
    expect(toTabTitleCase("meu perfil")).toBe("Meu Perfil");
    expect(toTabTitleCase("de olho no mercado")).toBe("De Olho no Mercado");
  });

  it("preserves brands and acronyms", () => {
    expect(toTabTitleCase("crm")).toBe("CRM");
    expect(toTabTitleCase("ferramentas de ia")).toBe("Ferramentas de IA");
    expect(toTabTitleCase("legendas, stories e whatsapp")).toBe("Legendas, Stories e WhatsApp");
    expect(toTabTitleCase("educatravel academy")).toBe("EducaTravel Academy");
  });

  it("normalizes titles when tabs are created", () => {
    const state = workspaceReducer(base([]), { type: "OPEN", path: "/crm", title: "crm" });
    expect(state.tabs[1].title).toBe("CRM");
  });
});
