import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { CLIENTES_DIRECT_ITEM, FINANCEIRO_DIRECT_ITEM } from "@/config/directNavItems";

const sidebar = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
const drawer = readFileSync("src/components/layout/MobileDrawerMenu.tsx", "utf8");

describe("menu principal: Gestão de Clientes e Gestão Financeira como links diretos", () => {
  it("aponta para as visões gerais corretas", () => {
    expect(CLIENTES_DIRECT_ITEM.url).toBe("/gestao-clientes/dashboard");
    expect(FINANCEIRO_DIRECT_ITEM.url).toBe("/financeiro?tab=dashboard");
    expect(CLIENTES_DIRECT_ITEM.activePrefix).toBe("/gestao-clientes");
    expect(FINANCEIRO_DIRECT_ITEM.activePrefix).toBe("/financeiro");
  });

  it("exibe rótulos em caixa alta", () => {
    expect(CLIENTES_DIRECT_ITEM.title).toBe("GESTÃO DE CLIENTES");
    expect(FINANCEIRO_DIRECT_ITEM.title).toBe("GESTÃO FINANCEIRA");
  });

  it("preserva as cores temáticas das antigas seções", () => {
    expect(CLIENTES_DIRECT_ITEM.theme).toEqual({
      headerBg: "bg-cyan-600 text-white",
      headerHoverBg: "hover:bg-cyan-700",
      hoverColor: "hover:bg-cyan-600 hover:text-white",
    });
    expect(FINANCEIRO_DIRECT_ITEM.theme).toEqual({
      headerBg: "bg-emerald-600 text-white",
      headerHoverBg: "hover:bg-emerald-700",
      hoverColor: "hover:bg-emerald-600 hover:text-white",
    });
  });

  it("aplica o estilo temático de cabeçalho nos dois menus (sem hover cinza)", () => {
    for (const src of [sidebar, drawer]) {
      expect(src).toContain("sectionStyle: CLIENTES_DIRECT_ITEM.theme");
      expect(src).toContain("sectionStyle: FINANCEIRO_DIRECT_ITEM.theme");
      expect(src).toContain("uppercase tracking-wider");
    }
  });

  it("não existem mais seções expansíveis para essas áreas", () => {
    for (const src of [sidebar, drawer]) {
      expect(src).not.toContain("clientesSection");
      expect(src).not.toContain("financeiroSection");
      expect(src).toContain("clientesItem");
      expect(src).toContain("financeiroItem");
    }
  });

  it("não renderiza os filhos antigos no menu principal", () => {
    const oldChildren = [
      "/gestao-clientes/clientes",
      "/gestao-clientes/funil",
      "/gestao-clientes/operacoes",
      "/gestao-clientes/metas",
      "/financeiro?tab=vendas",
      "/financeiro?tab=entradas",
      "/financeiro?tab=despesas",
      "/financeiro?tab=comissoes",
    ];
    for (const src of [sidebar, drawer]) {
      for (const url of oldChildren) expect(src).not.toContain(url);
    }
  });
});
