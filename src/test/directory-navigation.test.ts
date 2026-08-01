import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveDirectoryCategory,
  directoryPathForCategory,
  isDirectoryPath,
  resolveDirectoryReturn,
  dedicatedDirectoryRoute,
  hasDedicatedDirectoryRoute,
} from "@/lib/directoryNavigation";

describe("resolveDirectoryCategory", () => {
  it("maps exact and aliased categories", () => {
    expect(resolveDirectoryCategory("Consolidadoras")).toBe("Consolidadoras");
    expect(resolveDirectoryCategory("Parques e atrações")).toBe("Parques e atrações");
    expect(resolveDirectoryCategory("Parques")).toBe("Parques e atrações");
    expect(resolveDirectoryCategory("seguro viagem")).toBe("Seguros viagem");
    expect(resolveDirectoryCategory("Hotel")).toBe("Hospedagem");
    expect(resolveDirectoryCategory("Companhias Marítimas")).toBe("Cruzeiros");
    expect(resolveDirectoryCategory(null)).toBeNull();
  });
});

describe("directoryPathForCategory", () => {
  it("never falls back to Operadoras for another category", () => {
    expect(directoryPathForCategory("Seguros viagem")).toBe("/mapa-turismo?categoria=Seguros%20viagem");
    expect(directoryPathForCategory("Parques")).toBe("/mapa-turismo?categoria=Parques%20e%20atra%C3%A7%C3%B5es");
  });
});

describe("isDirectoryPath", () => {
  it("rejects external paths", () => {
    expect(isDirectoryPath("https://evil.com")).toBe(false);
    expect(isDirectoryPath("/mapa-turismo?categoria=Guias")).toBe(true);
  });
});

describe("resolveDirectoryReturn", () => {
  beforeEach(() => sessionStorage.clear());

  it("prefers navigation state", () => {
    const r = resolveDirectoryReturn(
      { directoryReturn: { path: "/mapa-turismo?categoria=Consolidadoras", scrollY: 320 } },
      { category: "Hospedagem" },
    );
    expect(r.path).toBe("/mapa-turismo?categoria=Consolidadoras");
    expect(r.scrollY).toBe(320);
  });

  it("falls back to sessionStorage", () => {
    sessionStorage.setItem("mapaTurismo:return", JSON.stringify({ path: "/mapa-turismo/cruzeiros?tipo=Fluvial" }));
    expect(resolveDirectoryReturn(null).path).toBe("/mapa-turismo/cruzeiros?tipo=Fluvial");
  });

  it("falls back to the real category on direct access", () => {
    expect(resolveDirectoryReturn(null, { category: "Parques e atrações" }).path).toBe(
      "/mapa-turismo?categoria=Parques%20e%20atra%C3%A7%C3%B5es",
    );
    expect(resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros" }).path).toBe("/mapa-turismo/cruzeiros");
  });

  it("ignores unsafe external state", () => {
    expect(resolveDirectoryReturn({ directoryReturn: { path: "https://evil.com" } }, { category: "Guias" }).path).toBe(
      "/mapa-turismo?categoria=Guias",
    );
  });
});

describe("resolveDirectoryReturn — compatibilidade do contexto armazenado", () => {
  beforeEach(() => sessionStorage.clear());

  const store = (path: string, scrollY?: number) =>
    sessionStorage.setItem("mapaTurismo:return", JSON.stringify({ path, scrollY }));

  it("1) storage de Consolidadoras + acesso direto a um Parque volta para Parques", () => {
    store("/mapa-turismo?categoria=Consolidadoras&busca=cvc", 900);
    const r = resolveDirectoryReturn(null, { category: "Parques e atrações" });
    expect(r.path).toBe("/mapa-turismo?categoria=Parques%20e%20atra%C3%A7%C3%B5es");
    expect(r.scrollY).toBeUndefined();
  });

  it("2) storage de Cruzeiros + detalhe de Cruzeiros preserva filtros", () => {
    store("/mapa-turismo/cruzeiros?tipo=Fluvial&porte=Navio%20Grande", 420);
    const r = resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros", category: "Cruzeiros" });
    expect(r.path).toBe("/mapa-turismo/cruzeiros?tipo=Fluvial&porte=Navio%20Grande");
    expect(r.scrollY).toBe(420);
  });

  it("2b) storage de outra categoria não vaza para o detalhe de Cruzeiros", () => {
    store("/mapa-turismo?categoria=Consolidadoras");
    const r = resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros", category: "Cruzeiros" });
    expect(r.path).toBe("/mapa-turismo/cruzeiros");
  });

  it("3) storage de Parques + detalhe de Parque preserva busca e filtros", () => {
    const path = "/mapa-turismo?categoria=Parques%20e%20atra%C3%A7%C3%B5es&busca=kennedy&ordenar=nome";
    store(path, 250);
    const r = resolveDirectoryReturn(null, { category: "Parques" });
    expect(r.path).toBe(path);
    expect(r.scrollY).toBe(250);
  });

  it("4) rejeita prefixos parecidos como /mapa-turismo-malicioso", () => {
    expect(isDirectoryPath("/mapa-turismo-malicioso")).toBe(false);
    expect(isDirectoryPath("/mapa-turismo-malicioso?categoria=Guias")).toBe(false);
    expect(isDirectoryPath("/mapa-turismo")).toBe(true);
    expect(isDirectoryPath("/mapa-turismo/cruzeiros")).toBe(true);
    store("/mapa-turismo-malicioso?categoria=Guias");
    expect(resolveDirectoryReturn(null, { category: "Guias" }).path).toBe("/mapa-turismo?categoria=Guias");
  });
});

describe("Cruzeiros: listagem dedicada única", () => {
  it("a rota da categoria Cruzeiros é sempre a experiência dedicada", () => {
    expect(dedicatedDirectoryRoute("Cruzeiros")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("Companhias Marítimas")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("cruzeiro")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("Consolidadoras")).toBeNull();
    expect(dedicatedDirectoryRoute(null)).toBeNull();
  });

  it("clicar na aba Cruzeiros / URL antiga => /mapa-turismo/cruzeiros", () => {
    // aba do diretório e redirect de ?categoria=Cruzeiros usam o mesmo helper
    expect(directoryPathForCategory("Cruzeiros")).toBe("/mapa-turismo/cruzeiros");
    expect(hasDedicatedDirectoryRoute("Cruzeiros")).toBe(true);
  });

  it("nenhuma companhia marítima entra na grade genérica", () => {
    const items = [
      { name: "MSC Cruzeiros", category: "Cruzeiros" },
      { name: "Costa", category: "Companhias Marítimas" },
      { name: "CVC", category: "Operadoras de turismo" },
      { name: "Kennedy Space Center", category: "Parques e atrações" },
    ];
    const generic = items.filter((i) => !hasDedicatedDirectoryRoute(i.category));
    expect(generic.map((i) => i.name)).toEqual(["CVC", "Kennedy Space Center"]);
  });

  it("perfil de cruzeiro => voltar => listagem dedicada com filtros", () => {
    sessionStorage.clear();
    sessionStorage.setItem(
      "mapaTurismo:return",
      JSON.stringify({ path: "/mapa-turismo/cruzeiros?tipo=Fluvial&perfis=abc", scrollY: 640 }),
    );
    const r = resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros", category: "Cruzeiros" });
    expect(r.path).toBe("/mapa-turismo/cruzeiros?tipo=Fluvial&perfis=abc");
    expect(r.scrollY).toBe(640);
  });

  it("fallback direto de um perfil de cruzeiro nunca cai na grade genérica", () => {
    sessionStorage.clear();
    expect(resolveDirectoryReturn(null, { category: "Companhias Marítimas" }).path).toBe("/mapa-turismo/cruzeiros");
  });
});
