import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveDirectoryCategory,
  directoryPathForCategory,
  isDirectoryPath,
  resolveDirectoryReturn,
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
