import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveDirectoryCategory,
  directoryPathForCategory,
  isDirectoryPath,
  resolveDirectoryReturn,
  dedicatedDirectoryRoute,
  hasDedicatedDirectoryRoute,
  isDirectoryDetailPath,
  isDirectoryListingPath,
  categoryListingRoute,
  categoryFromDirectoryPath,
  directoryServiceTitle,
  isSpecializedDirectoryCategory,
  DIRECTORY_SERVICES,
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
  it("usa rotas canônicas por serviço", () => {
    expect(directoryPathForCategory("Seguros viagem")).toBe("/mapa-turismo/seguros");
    expect(directoryPathForCategory("Parques")).toBe("/mapa-turismo/parques");
    expect(directoryPathForCategory(null)).toBe("/mapa-turismo");
    expect(directoryPathForCategory("Categoria inexistente")).toBe("/mapa-turismo");
  });
});

describe("rotas canônicas de listagem", () => {
  it("cada um dos 10 serviços tem rota própria e título amigável", () => {
    expect(DIRECTORY_SERVICES).toHaveLength(10);
    expect(categoryListingRoute("Operadoras de turismo")).toBe("/mapa-turismo/operadoras");
    expect(categoryListingRoute("Consolidadoras")).toBe("/mapa-turismo/consolidadoras");
    expect(categoryListingRoute("Companhias aéreas")).toBe("/mapa-turismo/companhias-aereas");
    expect(categoryListingRoute("Hospedagem")).toBe("/mapa-turismo/hospedagem");
    expect(categoryListingRoute("Locadoras de veículos")).toBe("/mapa-turismo/locadoras");
    expect(categoryListingRoute("Cruzeiros")).toBe("/mapa-turismo/cruzeiros");
    expect(categoryListingRoute("Seguros viagem")).toBe("/mapa-turismo/seguros");
    expect(categoryListingRoute("Parques e atrações")).toBe("/mapa-turismo/parques");
    expect(categoryListingRoute("Receptivos")).toBe("/mapa-turismo/receptivos");
    expect(categoryListingRoute("Guias")).toBe("/mapa-turismo/guias");
    expect(categoryListingRoute("nada")).toBeNull();
    expect(directoryServiceTitle("Companhias aéreas")).toBe("Companhias Aéreas");
    expect(directoryServiceTitle("Locadoras de veículos")).toBe("Locadoras");
  });

  it("categoryFromDirectoryPath reconhece slugs e legado", () => {
    expect(categoryFromDirectoryPath("/mapa-turismo/parques?q=kennedy")).toBe("Parques e atrações");
    expect(categoryFromDirectoryPath("/mapa-turismo/cruzeiros?tipo=Fluvial")).toBe("Cruzeiros");
    expect(categoryFromDirectoryPath("/mapa-turismo?categoria=Hotel")).toBe("Hospedagem");
    expect(categoryFromDirectoryPath("/mapa-turismo")).toBeNull();
  });

  it("todas as rotas canônicas são listagens, nunca detalhes", () => {
    for (const service of DIRECTORY_SERVICES) {
      const path = `/mapa-turismo/${service.slug}`;
      expect(isDirectoryListingPath(path)).toBe(true);
      expect(isDirectoryDetailPath(path)).toBe(false);
      expect(isDirectoryListingPath(`${path}?q=abc`)).toBe(true);
      expect(isDirectoryDetailPath(`${path}/abc`)).toBe(true);
    }
  });

  it("apenas Cruzeiros é fonte especializada", () => {
    expect(isSpecializedDirectoryCategory("Cruzeiros")).toBe(true);
    expect(isSpecializedDirectoryCategory("Companhias Marítimas")).toBe(true);
    expect(isSpecializedDirectoryCategory("Hospedagem")).toBe(false);
    expect(isSpecializedDirectoryCategory("Guias")).toBe(false);
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
      "/mapa-turismo/parques",
    );
    expect(resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros" }).path).toBe("/mapa-turismo/cruzeiros");
  });

  it("ignores unsafe external state", () => {
    expect(resolveDirectoryReturn({ directoryReturn: { path: "https://evil.com" } }, { category: "Guias" }).path).toBe(
      "/mapa-turismo/guias",
    );
  });
});

describe("resolveDirectoryReturn — compatibilidade do contexto armazenado", () => {
  beforeEach(() => sessionStorage.clear());

  const store = (path: string, scrollY?: number) =>
    sessionStorage.setItem("mapaTurismo:return", JSON.stringify({ path, scrollY }));

  it("1) storage de Consolidadoras + acesso direto a um Parque volta para Parques", () => {
    store("/mapa-turismo/consolidadoras?q=cvc", 900);
    const r = resolveDirectoryReturn(null, { category: "Parques e atrações" });
    expect(r.path).toBe("/mapa-turismo/parques");
    expect(r.scrollY).toBeUndefined();
  });

  it("2) storage de Cruzeiros + detalhe de Cruzeiros preserva filtros", () => {
    store("/mapa-turismo/cruzeiros?tipo=Fluvial&porte=Navio%20Grande", 420);
    const r = resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros", category: "Cruzeiros" });
    expect(r.path).toBe("/mapa-turismo/cruzeiros?tipo=Fluvial&porte=Navio%20Grande");
    expect(r.scrollY).toBe(420);
  });

  it("2b) storage de outra categoria não vaza para o detalhe de Cruzeiros", () => {
    store("/mapa-turismo/consolidadoras");
    const r = resolveDirectoryReturn(null, { path: "/mapa-turismo/cruzeiros", category: "Cruzeiros" });
    expect(r.path).toBe("/mapa-turismo/cruzeiros");
  });

  it("3) storage de Parques + detalhe de Parque preserva busca e filtros", () => {
    const path = "/mapa-turismo/parques?q=kennedy&ordenar=likes";
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
    expect(resolveDirectoryReturn(null, { category: "Guias" }).path).toBe("/mapa-turismo/guias");
  });
});

describe("Cruzeiros: listagem dedicada única", () => {
  it("detecta rotas de detalhe (scroll ao topo) sem afetar listagens", () => {
    expect(isDirectoryDetailPath("/mapa-turismo/abc")).toBe(true);
    expect(isDirectoryDetailPath("/mapa-turismo/operadora/abc")).toBe(true);
    expect(isDirectoryDetailPath("/mapa-turismo/guia/abc")).toBe(true);
    expect(isDirectoryDetailPath("/mapa-turismo/cruzeiros/abc")).toBe(true);
    expect(isDirectoryDetailPath("/mapa-turismo")).toBe(false);
    expect(isDirectoryDetailPath("/mapa-turismo?categoria=Guias")).toBe(false);
    expect(isDirectoryDetailPath("/mapa-turismo/cruzeiros")).toBe(false);
    expect(isDirectoryDetailPath("/mapa-turismo/cruzeiros?tipo=Fluvial")).toBe(false);
    expect(isDirectoryDetailPath("/dashboard")).toBe(false);
    expect(isDirectoryListingPath("/mapa-turismo/cruzeiros")).toBe(true);
    expect(isDirectoryListingPath("/mapa-turismo/cruzeiros/abc")).toBe(false);
  });

  it("a rota da categoria Cruzeiros é sempre a experiência dedicada", () => {
    expect(dedicatedDirectoryRoute("Cruzeiros")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("Companhias Marítimas")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("cruzeiro")).toBe("/mapa-turismo/cruzeiros");
    expect(dedicatedDirectoryRoute("Consolidadoras")).toBeNull();
    expect(dedicatedDirectoryRoute(null)).toBeNull();
  });

  it("clicar na aba Cruzeiros / URL antiga => /mapa-turismo/cruzeiros", () => {
    expect(directoryPathForCategory("Cruzeiros")).toBe("/mapa-turismo/cruzeiros");
    expect(hasDedicatedDirectoryRoute("Cruzeiros")).toBe(true);
  });

  it("nenhuma companhia marítima entra na listagem genérica", () => {
    const items = [
      { name: "MSC Cruzeiros", category: "Cruzeiros" },
      { name: "Costa", category: "Companhias Marítimas" },
      { name: "CVC", category: "Operadoras de turismo" },
      { name: "Kennedy Space Center", category: "Parques e atrações" },
    ];
    const generic = items.filter((i) => !isSpecializedDirectoryCategory(i.category));
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
