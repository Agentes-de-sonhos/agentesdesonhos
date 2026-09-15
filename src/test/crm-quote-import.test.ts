import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildOpportunityDraftFromQuote,
  mapQuoteServicesToOperationRows,
  missingOpportunityFields,
  quoteLabel,
  searchImportableQuotes,
  splitAlreadyImportedServices,
} from "@/lib/crmQuoteImport";
import { recommendedQuoteId } from "@/components/crm/operations/ImportQuoteServicesDialog";

const quotes = [
  {
    id: "q1",
    trip_title: "Lua de mel em Paris",
    destination: "Paris",
    client_name: "Ana Souza",
    client_id: "c1",
    start_date: "2026-05-01",
    end_date: "2026-05-10",
    adults_count: 2,
    children_count: 1,
    total_amount: 18500,
    opportunity_id: null,
  },
  {
    id: "q2",
    trip_title: null,
    destination: "São Paulo",
    client_name: "Bruno",
    client_id: null,
    total_amount: 900,
    opportunity_id: "op-9",
  },
];

describe("busca de orçamentos importáveis", () => {
  it("filtra por título, destino e cliente ignorando acentos/caixa", () => {
    expect(searchImportableQuotes(quotes, "lua de mel").map((q) => q.id)).toEqual(["q1"]);
    expect(searchImportableQuotes(quotes, "sao paulo").map((q) => q.id)).toEqual(["q2"]);
    expect(searchImportableQuotes(quotes, "ANA").map((q) => q.id)).toEqual(["q1"]);
    expect(searchImportableQuotes(quotes, "")).toHaveLength(2);
  });

  it("respeita o limite e opera só sobre a lista recebida (isolamento na consulta)", () => {
    expect(searchImportableQuotes(quotes, "", 1)).toHaveLength(1);
    expect(searchImportableQuotes([], "paris")).toHaveLength(0);
  });

  it("a consulta lista apenas orçamentos do titular da própria agência", () => {
    const hook = readFileSync("src/hooks/useImportableQuotes.ts", "utf-8");
    expect(hook).toContain('.eq("user_id", agencyOwnerId as string)');
    expect(hook).toContain('queryKey: ["importable-quotes", agencyOwnerId, user?.id]');
  });
});

describe("orçamento → oportunidade", () => {
  it("pré-preenche cliente, destino, datas, viajantes e valor", () => {
    const draft = buildOpportunityDraftFromQuote(quotes[0]);
    expect(draft).toMatchObject({
      client_id: "c1",
      destination: "Paris",
      start_date: "2026-05-01",
      end_date: "2026-05-10",
      adults_count: 2,
      children_count: 1,
      passengers_count: 3,
      estimated_value: 18500,
    });
    expect(missingOpportunityFields(draft)).toEqual([]);
  });

  it("aponta campos obrigatórios ausentes para o usuário completar", () => {
    const draft = buildOpportunityDraftFromQuote({ id: "q3" });
    expect(missingOpportunityFields(draft)).toEqual(["client_id", "destination"]);
    expect(draft.passengers_count).toBe(1);
  });

  it("usa o título quando não há destino e mantém rótulo legível", () => {
    expect(buildOpportunityDraftFromQuote({ id: "q4", trip_title: "Chile" }).destination).toBe("Chile");
    expect(quoteLabel(quotes[1])).toBe("São Paulo");
    expect(quoteLabel({ id: "x" })).toBe("Orçamento");
  });

  it("cria na etapa inicial existente, vincula o orçamento e desfaz em falha", () => {
    const src = readFileSync("src/components/crm/ImportQuoteAsOpportunityDialog.tsx", "utf-8");
    // Reutiliza a criação existente (etapa inicial + histórico + permissões)
    expect(src).toContain("createOpportunity({");
    // Vincula sem duplicar o orçamento
    expect(src).toContain('.from("quotes")');
    expect(src).toContain("opportunity_id: createdId");
    expect(src).not.toContain('.from("quotes").insert');
    // Histórico da origem
    expect(src).toContain("opportunity_history");
    expect(src).toContain("criada a partir do orçamento");
    // Rollback: nada parcial
    expect(src).toContain('.from("opportunities").delete().eq("id", createdId)');
    // Orçamento já vinculado: alerta e abre a existente
    expect(src).toContain("já está vinculado a uma oportunidade");
    expect(src).toContain("onOpenExisting");
  });
});

describe("orçamento → serviços da operação", () => {
  const services = [
    {
      id: "s1",
      service_type: "hotel",
      amount: 1200,
      description: "5 noites",
      order_index: 0,
      service_data: { name: "Hotel Roma", city: "Roma", check_in: "2026-04-01", check_out: "2026-04-06" },
    },
    { id: "s2", service_type: "spaceship", amount: 0, order_index: 1, service_data: {} },
  ];

  it("recomenda o orçamento vinculado à operação", () => {
    expect(recommendedQuoteId({ quote_id: "q1", opportunity_id: null } as any, quotes as any)).toBe("q1");
  });

  it("recomenda o orçamento da oportunidade quando a operação não tem vínculo direto", () => {
    expect(recommendedQuoteId({ quote_id: null, opportunity_id: "op-9" } as any, quotes as any)).toBe("q2");
  });

  it("não recomenda nada quando não há orçamento anterior", () => {
    expect(recommendedQuoteId({ quote_id: null, opportunity_id: null } as any, quotes as any)).toBeNull();
    expect(recommendedQuoteId({ quote_id: null, opportunity_id: "op-inexistente" } as any, quotes as any)).toBeNull();
  });

  it("impede duplicação por serviço já importado", () => {
    const { pending, duplicates } = splitAlreadyImportedServices(services, ["s1", null]);
    expect(pending.map((s) => s.id)).toEqual(["s2"]);
    expect(duplicates.map((s) => s.id)).toEqual(["s1"]);
    const all = splitAlreadyImportedServices(services, ["s1", "s2"]);
    expect(all.pending).toHaveLength(0);
  });

  it("preserva tipo, descrição, ordem, datas e valores, com vínculo rastreável", () => {
    const rows = mapQuoteServicesToOperationRows(services, {
      operationId: "op-1",
      userId: "u-1",
      quoteId: "q1",
      opportunityId: "opp-1",
    });
    expect(rows[0]).toMatchObject({
      operation_id: "op-1",
      user_id: "u-1",
      source_quote_service_id: "s1",
      service_type: "hotel",
      amount: 1200,
      notes: "5 noites",
      position: 0,
    });
    expect(rows[0].service_data.imported_from).toEqual({
      quote_id: "q1",
      quote_service_id: "s1",
      opportunity_id: "opp-1",
      operation_id: "op-1",
    });
    // Tipo fora do catálogo é preservado como veio do orçamento (mapeador atual)
    expect(rows[1].service_type).toBe("spaceship");
    expect(rows[1].position).toBe(1);
  });

  it("não altera o orçamento de origem e mantém a automação de fechamento intacta", () => {
    const dialog = readFileSync("src/components/crm/operations/ImportQuoteServicesDialog.tsx", "utf-8");
    expect(dialog).not.toContain('.from("quote_services").update');
    expect(dialog).not.toContain('.from("quotes").update');
    expect(dialog).toContain("operation_timeline");
    // Rollback dos serviços inseridos em falha intermediária
    expect(dialog).toContain('.delete().in("id", insertedIds)');
    // Nenhuma reserva criada nesta etapa
    expect(dialog).not.toContain("travel_file");
    // A importação automática do orçamento vinculado segue existindo
    const hook = readFileSync("src/hooks/useOperationServices.ts", "utf-8");
    expect(hook).toContain("Idempotent import of the linked quote's services");
  });

  it("o item de menu fica logo após Conferir serviços", () => {
    const card = readFileSync("src/components/crm/operations/OperationCard.tsx", "utf-8");
    const conferir = card.indexOf("Conferir serviços");
    const importar = card.indexOf("Importar serviços");
    const checklist = card.indexOf("Fazer checklist");
    expect(conferir).toBeLessThan(importar);
    expect(importar).toBeLessThan(checklist);
  });
});
