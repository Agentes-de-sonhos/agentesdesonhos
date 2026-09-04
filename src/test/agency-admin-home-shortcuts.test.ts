import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { CREATE_ITEMS } from "@/lib/agencyAdminMenu";

const read = (p: string) => readFileSync(p, "utf8");
const home = read("src/pages/whitelabel/admin/AgencyAdminHome.tsx");
const quick = read("src/components/crm/QuickAddClientDialog.tsx");
const dialogs = read("src/components/whitelabel/admin/quickstart/QuickCreateDialogs.tsx");
const kanban = read("src/components/crm/KanbanBoard.tsx");
const operations = read("src/components/crm/operations/OperationsModule.tsx");
const area = read("src/components/whitelabel/admin/AgencyAdminArea.tsx");

describe("atalhos da página inicial do painel da agência", () => {
  it("mantém somente Cliente, Orçamento, Roteiro e Carteira Digital nesta ordem", () => {
    const order = ["Criar cliente", "Criar orçamento", "Criar roteiro", "Criar carteira digital"];
    const positions = order.map((l) => home.indexOf(`label: "${l}"`));
    positions.forEach((p) => expect(p).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(home).not.toContain('label: "Criar oportunidade"');
    expect(home).not.toContain('label: "Criar operação"');
  });

  it("remove o dropdown financeiro do cabeçalho, preservando os cards financeiros", () => {
    expect(home).not.toContain("DropdownMenuTrigger");
    expect(home).not.toContain("financialMenu");
    expect(home).toContain("canFinancial");
  });

  it("cada atalho abre um pop-up e navega para o registro criado", () => {
    expect(home).toContain("QuickCreateQuoteDialog");
    expect(home).toContain("QuickCreateItineraryDialog");
    expect(home).toContain("QuickCreateWalletDialog");
    expect(home).toContain('openTab(`${nav.crm("clientes")}?client=${client.id}`');
    expect(home).toContain("openTab(nav.quote(id)");
    expect(home).toContain("openTab(nav.itinerary(id)");
    expect(home).toContain("openTab(nav.wallet(id)");
  });

  it("pop-ups reutilizam os formulários e hooks reais, sem duplicar regras", () => {
    expect(dialogs).toContain("QuoteClientForm");
    expect(dialogs).toContain("ItineraryForm");
    expect(dialogs).toContain("TripForm");
    expect(dialogs).toContain("createQuote");
    expect(dialogs).toContain("createItineraryWithAI");
    expect(dialogs).toContain("createTrip");
  });
});

describe("QuickAddClientDialog cria apenas o cliente", () => {
  it("não cria oportunidade nem card no funil", () => {
    expect(quick).not.toContain("createOpportunity");
    expect(quick).not.toContain("useOpportunities");
    expect(quick).not.toContain("adicionado ao funil");
    expect(quick).toContain("Cadastrar cliente");
    expect(quick).toContain("onCreated");
    expect(quick).toContain("findDuplicate");
  });
});

describe("comandos de URL ?new=1", () => {
  it("Oportunidade e Operação usam ?new=1 com permissão de criação", () => {
    const opp = CREATE_ITEMS.find((i) => i.label === "Oportunidade");
    const ope = CREATE_ITEMS.find((i) => i.label === "Operação");
    expect(opp?.to).toBe("/gestao/crm/funil?new=1");
    expect(opp?.permission).toBe("opportunities.create");
    expect(ope?.to).toBe("/gestao/crm/operacoes?new=1");
    expect(ope?.permission).toBe("operations.create");
  });

  it("Kanban e Operações consomem o parâmetro e respeitam a permissão", () => {
    for (const src of [kanban, operations]) {
      expect(src).toContain('searchParams.get("new") !== "1"');
      expect(src).toContain('next.delete("new")');
      expect(src).toContain("{ replace: true }");
    }
    expect(kanban).toContain("canCreateOppRef.current");
    expect(operations).toContain("canCreateRef.current");
  });
});

describe("rotas do CRM no white label", () => {
  it("registra visão geral e metas", () => {
    expect(area).toContain('["crm/dashboard", GestaoClientes]');
    expect(area).toContain('["crm/metas", GestaoClientes]');
    expect(area).toContain('["/gestao-clientes/dashboard", GestaoClientes]');
    expect(area).toContain('["/gestao-clientes/metas", GestaoClientes]');
  });
});
