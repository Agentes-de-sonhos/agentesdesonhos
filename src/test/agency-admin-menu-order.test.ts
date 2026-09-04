import { describe, expect, it } from "vitest";
import { CREATE_ITEMS, MANAGEMENT_ITEMS, PROJECTS_ITEMS } from "@/lib/agencyAdminMenu";
import { readFileSync } from "fs";

describe("menu lateral da gestão (compartilhado)", () => {
  it('Meus projetos sem "Modelos"', () => {
    expect(PROJECTS_ITEMS.map((i) => i.label)).toEqual([
      "Orçamentos",
      "Roteiros",
      "Carteiras digitais",
    ]);
  });

  it("ordem da seção Gestão", () => {
    expect(MANAGEMENT_ITEMS.map((i) => i.label)).toEqual([
      "Clientes",
      "Oportunidades",
      "Operações",
      "Reservas",
      "Financeiro",
    ]);
    expect(MANAGEMENT_ITEMS.find((i) => i.label === "Financeiro")?.permission).toBe(
      "financial.access",
    );
  });

  it("rótulos e ordem do Criar novo", () => {
    expect(CREATE_ITEMS.map((i) => i.label)).toEqual([
      "Orçamento",
      "Roteiro",
      "Carteira Digital",
      "Cliente",
      "Oportunidade",
      "Operação",
    ]);
  });

  it('"Cliente" aciona o fluxo existente de criação de cliente', () => {
    const cliente = CREATE_ITEMS.find((i) => i.label === "Cliente");
    expect(cliente?.action).toBe("new-client");
    const sidebar = readFileSync(
      "src/components/whitelabel/admin/AgencyAdminSidebar.tsx",
      "utf8",
    );
    expect(sidebar).toContain("QuickAddClientDialog");
    expect(sidebar).toContain('item.action === "new-client"');
  });
});
