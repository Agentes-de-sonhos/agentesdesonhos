import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_PINNED_TABS,
  buildPinnedStorageKey,
  isPinnablePath,
  readPinnedPaths,
  restorablePinnedPaths,
  sanitizePinnedPaths,
  togglePinnedPath,
  writePinnedPaths,
} from "@/workspace/pinnedTabs";
import {
  HOME_TAB_ID,
  MAX_TABS,
  countContentTabs,
  makeHomeTab,
  normalizeTabs,
  workspaceReducer,
  type WorkspaceTab,
} from "@/workspace/WorkspaceProvider";
import {
  AGENCY_ADMIN_PINNABLE,
  buildAgencyAdminPinnedGuard,
  buildPlatformPinnedGuard,
} from "@/workspace/pinnedRestoreGuard";

const HOME = "/dashboard";
const base = (tabs: WorkspaceTab[] = [], pinnedPaths: string[] = []) => ({
  tabs: normalizeTabs(tabs, HOME),
  activeId: HOME_TAB_ID,
  homePath: HOME,
  pinnedPaths,
});

describe("elegibilidade de fixação", () => {
  it("aceita rotas estáveis de módulo", () => {
    for (const path of [
      "/gestao-clientes/funil",
      "/gestao-clientes/operacoes",
      "/gestao-clientes/clientes",
      "/reservas",
      "/financeiro",
      "/noticias",
      "/educa-academy",
      "/mapa-turismo",
      "/agenda",
    ]) {
      expect(isPinnablePath(path, HOME)).toBe(true);
    }
  });

  it("recusa a Inicial, criação múltipla, detalhes com id e caminhos externos", () => {
    expect(isPinnablePath(HOME, HOME)).toBe(false);
    expect(isPinnablePath("/ferramentas-ia/gerar-orcamento", HOME)).toBe(false);
    expect(isPinnablePath("/ferramentas-ia/gerar-orcamento/abc-123", HOME)).toBe(false);
    expect(isPinnablePath("/reservas/42", HOME)).toBe(false);
    expect(isPinnablePath("https://example.com", HOME)).toBe(false);
    expect(isPinnablePath("//evil.com", HOME)).toBe(false);
  });

  it("ignora query e hash ao normalizar a preferência", () => {
    const result = togglePinnedPath([], "/financeiro?tab=dashboard", HOME);
    expect(result).toEqual({ ok: true, paths: ["/financeiro"], pinned: true });
  });
});

describe("limite de 4 abas fixadas", () => {
  it("bloqueia a quinta fixação sem desfixar outra", () => {
    const four = ["/agenda", "/reservas", "/financeiro", "/noticias"];
    expect(four).toHaveLength(MAX_PINNED_TABS);
    const result = togglePinnedPath(four, "/mapa-turismo", HOME);
    expect(result).toEqual({ ok: false, reason: "limit" });
  });

  it("alterna fixar e desfixar preservando as demais", () => {
    const pinned = togglePinnedPath(["/agenda"], "/reservas", HOME);
    expect(pinned).toMatchObject({ ok: true, pinned: true });
    const unpinned = togglePinnedPath(["/agenda", "/reservas"], "/agenda", HOME);
    expect(unpinned).toEqual({ ok: true, paths: ["/reservas"], pinned: false });
  });
});

describe("persistência isolada por usuário e tenant", () => {
  beforeEach(() => window.localStorage.clear());

  it("gera chaves distintas por produto, tenant e usuário", () => {
    const a = buildPinnedStorageKey({ product: "agentes", userId: "u1" });
    const b = buildPinnedStorageKey({ product: "agentes", userId: "u2" });
    const c = buildPinnedStorageKey({ product: "wl", tenant: "casa.tur.br", userId: "u1" });
    const d = buildPinnedStorageKey({ product: "wl", tenant: "outra.tur.br", userId: "u1" });
    expect(new Set([a, b, c, d]).size).toBe(4);
    expect(buildPinnedStorageKey({ product: "agentes", userId: null })).toBeNull();
  });

  it("não vaza preferências entre dois usuários", () => {
    const k1 = buildPinnedStorageKey({ product: "agentes", userId: "u1" });
    const k2 = buildPinnedStorageKey({ product: "agentes", userId: "u2" });
    writePinnedPaths(k1, ["/agenda", "/financeiro"]);
    expect(readPinnedPaths(k1, HOME)).toEqual(["/agenda", "/financeiro"]);
    expect(readPinnedPaths(k2, HOME)).toEqual([]);
  });

  it("falha com segurança em preferência corrompida ou legada", () => {
    const key = buildPinnedStorageKey({ product: "agentes", userId: "u1" })!;
    window.localStorage.setItem(key, "{não é json");
    expect(readPinnedPaths(key, HOME)).toEqual([]);
    window.localStorage.setItem(key, JSON.stringify(["/rota-que-nao-existe", 42, "/agenda"]));
    expect(readPinnedPaths(key, HOME)).toEqual(["/agenda"]);
  });

  it("sanitiza duplicados e corta acima do limite", () => {
    const raw = ["/agenda", "/agenda", "/reservas", "/financeiro", "/noticias", "/mapa-turismo"];
    expect(sanitizePinnedPaths(raw, HOME)).toEqual([
      "/agenda",
      "/reservas",
      "/financeiro",
      "/noticias",
    ]);
  });
});

describe("restauração das abas fixadas", () => {
  it("restaura de 1 a 4 abas na ordem salva, logo após Inicial", () => {
    const paths = ["/agenda", "/reservas", "/financeiro", "/noticias"];
    const state = workspaceReducer(base(), { type: "RESTORE_PINNED", paths });
    expect(state.tabs[0].id).toBe(HOME_TAB_ID);
    expect(state.tabs.slice(1).map((t) => t.path)).toEqual(paths);
    expect(state.tabs[1].title).toBe("Minha Agenda");
  });

  it("não duplica uma aba já aberta", () => {
    const state = workspaceReducer(
      base([{ id: "a", path: "/agenda", title: "Minha Agenda" }]),
      { type: "RESTORE_PINNED", paths: ["/agenda", "/reservas"] },
    );
    expect(state.tabs.filter((t) => t.path === "/agenda")).toHaveLength(1);
    expect(countContentTabs(state.tabs)).toBe(2);
  });

  it("respeita o limite geral de 10 abas", () => {
    let state = base();
    for (let i = 0; i < MAX_TABS; i++) {
      state = workspaceReducer(state, { type: "OPEN", path: `/p${i}`, title: `Página ${i}` });
    }
    state = workspaceReducer(state, { type: "RESTORE_PINNED", paths: ["/agenda"] });
    expect(countContentTabs(state.tabs)).toBe(MAX_TABS);
  });

  it("descarta rotas sem permissão, inexistentes ou de outro contexto", () => {
    const allowed = restorablePinnedPaths(["/agenda", "/financeiro", "/gestao/reservas"], {
      homePath: HOME,
      openPaths: [],
      canRestore: (path) => path !== "/financeiro",
    });
    expect(allowed).toEqual(["/agenda", "/gestao/reservas"]);
  });

  it("fechar uma aba fixada não remove a preferência", () => {
    let state = workspaceReducer(base([], ["/agenda"]), {
      type: "RESTORE_PINNED",
      paths: ["/agenda"],
    });
    const tab = state.tabs.find((t) => t.path === "/agenda")!;
    state = workspaceReducer(state, { type: "CLOSE", id: tab.id });
    expect(state.tabs.some((t) => t.path === "/agenda")).toBe(false);
    expect(state.pinnedPaths).toEqual(["/agenda"]);
  });

  it("desfixar não fecha a aba aberta", () => {
    let state = workspaceReducer(base([], ["/agenda"]), {
      type: "RESTORE_PINNED",
      paths: ["/agenda"],
    });
    state = workspaceReducer(state, { type: "SET_PINNED_PATHS", paths: [] });
    expect(state.tabs.some((t) => t.path === "/agenda")).toBe(true);
    expect(state.pinnedPaths).toEqual([]);
  });

  it("mantém a Inicial fixa, primeira e fora do limite adicional", () => {
    const state = workspaceReducer(base(), {
      type: "RESTORE_PINNED",
      paths: ["/agenda", "/reservas"],
    });
    expect(state.tabs[0]).toMatchObject({ id: HOME_TAB_ID, pinned: true });
    expect(makeHomeTab(HOME).pinned).toBe(true);
    const closed = workspaceReducer(state, { type: "CLOSE", id: HOME_TAB_ID });
    expect(closed.tabs[0].id).toBe(HOME_TAB_ID);
  });
});

describe("guards de restauração por produto", () => {
  it("plataforma: respeita plano e permissão de equipe", () => {
    const guard = buildPlatformPinnedGuard({
      can: (key) => key !== "financial.access",
      hasFeature: (f) => f !== "news",
    });
    expect(guard("/agenda")).toBe(true);
    expect(guard("/financeiro")).toBe(false);
    expect(guard("/noticias")).toBe(false);
  });

  it("white label: só rotas do próprio painel", () => {
    const guard = buildAgencyAdminPinnedGuard({ can: () => true });
    expect(guard("/gestao/reservas")).toBe(true);
    expect(guard("/agenda")).toBe(false);
    expect(guard("/gestao/rota-inexistente")).toBe(false);
    expect(Object.keys(AGENCY_ADMIN_PINNABLE).every((p) => p.startsWith("/gestao"))).toBe(true);
  });

  it("white label: permissão revogada impede a restauração", () => {
    const guard = buildAgencyAdminPinnedGuard({ can: (key) => key !== "financial.access" });
    expect(guard("/gestao/financeiro")).toBe(false);
  });
});
