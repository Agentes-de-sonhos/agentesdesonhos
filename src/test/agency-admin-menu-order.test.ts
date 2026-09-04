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

  it('"Cliente" abre o formulário completo da aba Clientes via deep link', () => {
    const cliente = CREATE_ITEMS.find((i) => i.label === "Cliente");
    expect(cliente?.to).toBe("/gestao/crm/clientes?new=1");
    expect(cliente?.permission).toBe("clients.create");
    expect(JSON.stringify(cliente)).not.toContain("new-client");
  });

  it("sidebar não referencia mais o QuickAddClientDialog", () => {
    const sidebar = readFileSync(
      "src/components/whitelabel/admin/AgencyAdminSidebar.tsx",
      "utf8",
    );
    expect(sidebar).not.toContain("QuickAddClientDialog");
    expect(sidebar).not.toContain("new-client");
  });

  it("ClientsModule abre apenas o formulário de cliente com ?new=1 e respeita clients.create", () => {
    const mod = readFileSync("src/components/crm/ClientsModule.tsx", "utf8");
    expect(mod).toContain('searchParams.get("new") === "1"');
    expect(mod).toContain("if (!canCreate) return;");
    expect(mod).toContain("handleOpenDialogRef.current()");
    expect(mod).not.toContain("QuickAddClientDialog");
    // nenhum registro extra (oportunidade/operação) é criado por esse fluxo
    expect(mod).not.toContain("from(\"opportunities\").insert");
  });

});
