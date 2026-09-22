import { describe, expect, it } from "vitest";
import type { TravelFile, TravelFileService } from "@/types/travelFile";
import {
  assessTravelFileReadiness,
  describeServiceCommission,
  effectiveServiceAmount,
  isConvertedV2,
  isPackageFile,
  isServiceEligible,
} from "@/lib/travelFileConversion";

const baseService = (overrides: Partial<TravelFileService> = {}): TravelFileService => ({
  id: overrides.id ?? crypto.randomUUID(),
  file_id: "file-1",
  service_type: "hotel",
  product_name: "Hotel Exemplo",
  supplier_name: "Fornecedor X",
  city: null,
  destination: null,
  country: null,
  start_date: null,
  end_date: null,
  quantity: 1,
  passengers_count: null,
  currency: "BRL",
  requested_amount: 1000,
  reconfirmed_amount: null,
  sold_amount: null,
  cost_amount: null,
  commission_amount: null,
  responsible_team_member_id: null,
  is_required: false,
  status: "available",
  snapshot: {},
  created_at: "2026-01-01T00:00:00Z",
  financial_rule_status: "confirmed",
  ...overrides,
});

const baseFile = (
  overrides: Partial<TravelFile> = {},
): Pick<
  TravelFile,
  "status" | "client_id" | "opportunity_id" | "pricing_mode" | "workflow_version" | "operation_id"
> => ({
  status: "awaiting_client",
  client_id: "client-1",
  opportunity_id: "opp-1",
  pricing_mode: "itemized",
  workflow_version: 1,
  operation_id: null,
  ...overrides,
});

describe("travelFileConversion — regras puras do fluxo unificado V2", () => {
  it("valor efetivo prioriza vendido > reconfirmado > solicitado", () => {
    expect(
      effectiveServiceAmount({ sold_amount: 1500, reconfirmed_amount: 1200, requested_amount: 1000 }),
    ).toBe(1500);
    expect(
      effectiveServiceAmount({ sold_amount: null, reconfirmed_amount: 1200, requested_amount: 1000 }),
    ).toBe(1200);
    expect(
      effectiveServiceAmount({ sold_amount: null, reconfirmed_amount: null, requested_amount: 1000 }),
    ).toBe(1000);
  });

  it("serviço elegível exige status pós-reconfirmação e preço final positivo", () => {
    expect(isServiceEligible(baseService({ status: "available" }))).toBe(true);
    expect(isServiceEligible(baseService({ status: "booked" }))).toBe(true);
    expect(isServiceEligible(baseService({ status: "delivered" }))).toBe(true);
    expect(isServiceEligible(baseService({ status: "requested" }))).toBe(false);
    expect(isServiceEligible(baseService({ status: "unavailable" }))).toBe(false);
    expect(isServiceEligible(baseService({ requested_amount: 0 }))).toBe(false);
  });

  it("file fora de 'Aguardando cliente' bloqueia a primeira confirmação", () => {
    const r = assessTravelFileReadiness(baseFile({ status: "awaiting_reconfirmation" }), [
      baseService(),
    ]);
    expect(r.ready).toBe(false);
    expect(r.blockers.join(" ")).toContain("Aguardando cliente");
  });

  it("exige cliente e oportunidade vinculados", () => {
    const r = assessTravelFileReadiness(baseFile({ client_id: null, opportunity_id: null }), [
      baseService(),
    ]);
    expect(r.blockers.join(" ")).toContain("cliente");
    expect(r.blockers.join(" ")).toContain("oportunidade");
  });

  it("serviços em reconfirmação bloqueiam", () => {
    const r = assessTravelFileReadiness(baseFile(), [
      baseService(),
      baseService({ status: "reconfirming" }),
      baseService({ status: "amount_changed" }),
    ]);
    expect(r.ready).toBe(false);
    expect(r.blockers.join(" ")).toContain("2 serviço(s) aguardando reconfirmação");
  });

  it("obrigatório indisponível bloqueia; opcional indisponível é excluído com aviso", () => {
    const blocked = assessTravelFileReadiness(baseFile(), [
      baseService(),
      baseService({ status: "unavailable", is_required: true, product_name: "Voo ida" }),
    ]);
    expect(blocked.ready).toBe(false);
    expect(blocked.blockers.join(" ")).toContain("Voo ida");

    const ok = assessTravelFileReadiness(baseFile(), [
      baseService(),
      baseService({ status: "unavailable", is_required: false }),
      baseService({ status: "cancelled", is_required: false }),
    ]);
    expect(ok.ready).toBe(true);
    expect(ok.excludedCount).toBe(2);
    expect(ok.warnings.join(" ")).toContain("2 serviço(s) opcional(is)");
    expect(ok.eligible).toHaveLength(1);
  });

  it("sem serviço elegível bloqueia", () => {
    const r = assessTravelFileReadiness(baseFile(), [
      baseService({ status: "unavailable", is_required: false }),
    ]);
    expect(r.ready).toBe(false);
    expect(r.blockers.join(" ")).toContain("Nenhum serviço elegível");
  });

  it("moedas mistas entre elegíveis bloqueiam", () => {
    const r = assessTravelFileReadiness(baseFile(), [
      baseService({ currency: "BRL" }),
      baseService({ currency: "USD" }),
    ]);
    expect(r.ready).toBe(false);
    expect(r.mixedCurrencies).toBe(true);
    expect(r.blockers.join(" ")).toContain("BRL, USD");
  });

  it("regra financeira pendente bloqueia e aparece como pendência", () => {
    const pending = baseService({ financial_rule_status: "pending" });
    const r = assessTravelFileReadiness(baseFile(), [pending]);
    expect(r.ready).toBe(false);
    expect(r.blockers.join(" ")).toContain("regra financeira");
    expect(r.pendingServices.map((s) => s.id)).toContain(pending.id);
  });

  it("fornecedor ausente bloqueia, exceto com justificativa explícita", () => {
    const noSupplier = baseService({ id: "svc-1", supplier_name: null, operator_id: null });
    const blocked = assessTravelFileReadiness(baseFile(), [noSupplier]);
    expect(blocked.ready).toBe(false);
    expect(blocked.missingSupplierIds).toEqual(["svc-1"]);

    const withException = assessTravelFileReadiness(baseFile(), [noSupplier], {
      "svc-1": "Fornecedor indicado pelo cliente, sem cadastro.",
    });
    expect(withException.ready).toBe(true);
  });

  it("total usa o valor efetivo dos elegíveis e moeda única", () => {
    const r = assessTravelFileReadiness(baseFile(), [
      baseService({ sold_amount: 2000 }),
      baseService({ reconfirmed_amount: 800 }),
    ]);
    expect(r.total).toBe(2800);
    expect(r.currency).toBe("BRL");
  });

  it("reconhece pacote fechado e processo já convertido", () => {
    expect(isPackageFile(baseFile({ pricing_mode: "package" }))).toBe(true);
    expect(isPackageFile(baseFile({ pricing_mode: "itemized" }))).toBe(false);
    expect(
      isConvertedV2({ workflow_version: 2, operation_id: "op-1", status: "in_operation" }),
    ).toBe(true);
    expect(isConvertedV2({ workflow_version: 1, operation_id: null, status: "awaiting_client" })).toBe(false);

    const converted = assessTravelFileReadiness(
      baseFile({ status: "in_operation", workflow_version: 2, operation_id: "op-1" }),
      [baseService()],
    );
    expect(converted.alreadyConverted).toBe(true);
    expect(converted.ready).toBe(false);
  });

  it("nunca inventa comissão: ausente vira descrição neutra", () => {
    expect(describeServiceCommission(baseService({ financial_rule_status: "pending" }))).toContain(
      "pendente",
    );
    expect(
      describeServiceCommission(baseService({ financial_rule_status: "not_applicable" })),
    ).toContain("não se aplica");
    expect(
      describeServiceCommission(
        baseService({ financial_rule_status: "confirmed", commission_type: null }),
      ),
    ).toContain("não informada");
    expect(
      describeServiceCommission(
        baseService({ financial_rule_status: "confirmed", commission_type: "percentage", commission_percent: 12 }),
      ),
    ).toContain("12%");
  });
});
