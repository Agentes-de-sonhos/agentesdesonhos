import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TravelFile, TravelFileService } from "@/types/travelFile";
import {
  displayServiceSupplier,
  resolveServiceProductName,
  serviceOptionLabel,
  travelFileServiceTitle,
} from "@/lib/travelFileServiceIdentity";
import {
  assessTravelFileReadiness,
  describeStatusTransitionBlock,
  summarizeReconfirmation,
  SUPPLIER_REQUIRED_MESSAGE,
} from "@/lib/travelFileConversion";
import { summarizeServiceFinancials } from "@/lib/travelFileWorkflow";

const service = (patch: Partial<TravelFileService> = {}): TravelFileService =>
  ({
    id: patch.id ?? "s1",
    file_id: "f1",
    agency_id: "a1",
    service_type: "flight",
    product_name: "Melhor custo-benefício",
    quantity: 1,
    currency: "BRL",
    requested_amount: 14000,
    status: "requested",
    is_required: true,
    financial_rule_status: "pending",
    snapshot: {},
    ...patch,
  }) as TravelFileService;

const file = (patch: Partial<TravelFile> = {}): TravelFile =>
  ({
    id: "f1",
    agency_id: "a1",
    status: "awaiting_client",
    client_id: "c1",
    opportunity_id: "o1",
    pricing_mode: "itemized",
    currency: "BRL",
    workflow_version: 2,
    operation_id: null,
    ...patch,
  }) as TravelFile;

describe("identidade do serviço na Central de Reservas", () => {
  it("a etiqueta da opção nunca é o título do aéreo", () => {
    const flight = service({
      snapshot: {
        option_label: "Melhor custo-benefício",
        service_data: { airline: "LATAM Airlines", supplier_name: "Sakura Consolidadora" },
      },
    });
    expect(travelFileServiceTitle(flight)).toBe("Passagem aérea — LATAM Airlines");
    expect(resolveServiceProductName(flight)).toBe("LATAM Airlines");
    expect(serviceOptionLabel(flight)).toBe("Melhor custo-benefício");
  });

  it("hotel genérico passa a exibir o nome real da hospedagem", () => {
    const hotel = service({
      service_type: "hotel",
      product_name: "hotel",
      snapshot: { service_data: { hotel_name: "Hôtel Belgrand", supplier_name: "HOTELDO" } },
    });
    expect(travelFileServiceTitle(hotel)).toBe("Hospedagem — Hôtel Belgrand");
    expect(displayServiceSupplier(hotel)).toBe("HOTELDO");
  });

  it("sem dado estruturado cai no rótulo do tipo, sem inventar nome", () => {
    const empty = service({ service_type: "hotel", product_name: "hotel", snapshot: {} });
    expect(travelFileServiceTitle(empty)).toBe("Hospedagem");
    expect(displayServiceSupplier(empty)).toBeNull();
  });

  it("código IATA da companhia vira o nome comercial", () => {
    const flight = service({ snapshot: { service_data: { airline: "G3" } } });
    expect(travelFileServiceTitle(flight)).toBe("Passagem aérea — GOL Linhas Aéreas");
  });

  it("fornecedor do orçamento aparece mesmo se o serviço ainda não tiver um", () => {
    const s = service({
      supplier_name: null,
      snapshot: { service_data: { supplier_name: "Sakura Consolidadora" } },
    });
    expect(displayServiceSupplier(s)).toBe("Sakura Consolidadora");
  });
});

describe("regras operacionais de situação do serviço", () => {
  it("Disponível não exige fornecedor", () => {
    const s = service({ supplier_name: null, operator_id: null });
    expect(describeStatusTransitionBlock(s, "available")).toBeNull();
  });

  it("Reservado e Emitido exigem fornecedor, com mensagem humana", () => {
    const s = service({ supplier_name: null, operator_id: null });
    expect(describeStatusTransitionBlock(s, "booked")).toBe(SUPPLIER_REQUIRED_MESSAGE);
    expect(describeStatusTransitionBlock(s, "issued")).toBe(SUPPLIER_REQUIRED_MESSAGE);
    expect(SUPPLIER_REQUIRED_MESSAGE).not.toMatch(/[A-Z_]{6,}/);
    const withSupplier = service({ supplier_name: "HOTELDO" });
    expect(describeStatusTransitionBlock(withSupplier, "booked")).toBeNull();
  });

  it("Valor alterado exige valor reconfirmado", () => {
    expect(describeStatusTransitionBlock(service(), "amount_changed")).toMatch(/reconfirmado/i);
    expect(
      describeStatusTransitionBlock(service({ reconfirmed_amount: 15000 }), "amount_changed"),
    ).toBeNull();
  });
});

describe("venda não depende de custo, comissão nem regra financeira", () => {
  const eligible = service({
    status: "available",
    reconfirmed_amount: 14000,
    sold_amount: 14200,
    supplier_name: null,
    operator_id: null,
    financial_rule_status: "pending",
  });

  it("processo fica pronto mesmo sem financeiro configurado", () => {
    const readiness = assessTravelFileReadiness(file(), [eligible]);
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.total).toBe(14200);
  });

  it("nenhum bloqueio nem aviso expõe código técnico", () => {
    const readiness = assessTravelFileReadiness(file(), [eligible]);
    for (const message of [...readiness.blockers, ...readiness.warnings]) {
      expect(message).not.toMatch(/[A-Z_]{6,}/);
    }
  });

  it("disponibilidade pendente continua bloqueando", () => {
    const readiness = assessTravelFileReadiness(file(), [service()]);
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.join(" ")).toMatch(/reconfirmação/i);
  });
});

describe("consistência de valores do resumo operacional", () => {
  it("vendido pode diferir do reconfirmado e os totais seguem corretos", () => {
    const summary = summarizeReconfirmation([
      service({ id: "a", requested_amount: 14000, reconfirmed_amount: 14500, sold_amount: 15000 }),
      service({ id: "b", service_type: "hotel", requested_amount: 15000 }),
    ]);
    expect(summary.requested).toBe(29000);
    expect(summary.reconfirmed).toBe(14500);
    expect(summary.sold).toBe(15000);
    expect(summary.variation).toBe(500);
  });

  it("margem é desconhecida enquanto o custo não for informado", () => {
    const unknown = summarizeServiceFinancials([
      service({ status: "available", sold_amount: 29000 }),
    ]);
    expect(unknown.costKnown).toBe(false);

    const known = summarizeServiceFinancials([
      service({ status: "available", sold_amount: 29000, cost_amount: 20000 }),
    ]);
    expect(known.costKnown).toBe(true);
    expect(known.margin).toBe(9000);
  });
});

describe("migration 0026 (teste estático de SQL)", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "drizzle/migrations/0026_travel_file_service_identity_and_presale_rules.sql",
    ),
    "utf8",
  );

  it("materializa nome real e fornecedor a partir do snapshot", () => {
    expect(sql).toContain("FUNCTION public.travel_file_service_display_name");
    expect(sql).toContain("FUNCTION public.travel_file_service_supplier_name");
    expect(sql).toContain("public.travel_file_service_operator_id(i.snapshot)");
    expect(sql).toContain("ON CONFLICT (request_item_id) DO NOTHING");
  });

  it("remove somente os dois bloqueios pré-venda da confirmação", () => {
    expect(sql).toContain("FINANCIAL_RULE_PENDING");
    expect(sql).toContain("SUPPLIER_MISSING");
    expect(sql).toContain("pg_get_functiondef");
    expect(sql).not.toContain("DROP FUNCTION");
  });

  it("o reparo de identidade é idempotente, auditado e restrito ao service_role", () => {
    expect(sql).toContain("FUNCTION public.travel_file_service_refresh_identity");
    expect(sql).toContain("file_already_converted");
    expect(sql).toContain("'file_services_identity_refreshed'");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.travel_file_service_refresh_identity(uuid) TO service_role",
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.travel_file_service_refresh_identity(uuid) FROM authenticated",
    );
  });

  it("não cria venda nem operação em nenhum caminho", () => {
    expect(sql).not.toContain("INSERT INTO public.sales");
    expect(sql).not.toContain("INSERT INTO public.operations");
  });
});
