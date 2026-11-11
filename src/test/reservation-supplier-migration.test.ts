import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("drizzle/migrations/0065_reservation_service_supplier.sql", "utf8");

describe("fornecedor operacional separado da regra financeira", () => {
  it("mantém isolamento, permissões e gates comerciais sem liberar RPC anônima", () => {
    expect(migration).toContain("private.assert_travel_file_access(_service.file_id, 'reservations.manage')");
    expect(migration).toContain("private.assert_travel_file_access(_service.file_id, 'reservations.financial.manage')");
    expect(migration).toContain("private.assert_manual_file_gate(_file.origin)");
    expect(migration).toContain("agency_has_entitlement(_file.agency_id, 'unified_workflow_v2')");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated");
  });
  it("valida a agência do fornecedor antes de vincular um UUID recebido do cliente", () => {
    expect(migration).toMatch(/NOT private\.reservations_supplier_allowed\(\s*_operator_id, ARRAY\[_file\.agency_id\]\s*\)/);
    expect(migration).toContain("Fornecedor não disponível para esta agência.");
    expect(migration.indexOf("private.reservations_supplier_allowed")).toBeLessThan(
      migration.indexOf("UPDATE public.travel_file_services"),
    );
    const sharedGate = readFileSync(
      "supabase/migrations/20260910134125_05c03245-a001-46b1-83e0-9608a866005b.sql", "utf8",
    ).split("-- Sanitização financeira recursiva")[0];
    expect(sharedGate).toContain("o.owner_agency_id IS NULL");
    expect(sharedGate).toContain("COALESCE(o.is_active, true)");
    expect(sharedGate).toContain("COALESCE(o.approval_status, 'approved') = 'approved'");
    expect(sharedGate).toContain("o.owner_agency_id = ANY(_agencies)");
    expect(sharedGate).toContain("o.user_id = ANY(_agencies)");
  });
  it("não altera valores ou snapshots financeiros depois da conversão", () => {
    expect(migration).not.toMatch(/UPDATE public\.(sale_products|operation_services|sales)/i);
    expect(migration).not.toMatch(/SET (cost_amount|commission_amount|financial_rule_snapshot)/i);
    expect(migration).not.toContain("ALREADY_CONVERTED");
    expect(migration).toContain("'service_supplier_set'");
  });
});
