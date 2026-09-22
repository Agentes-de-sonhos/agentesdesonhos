import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guardas ESTÁTICAS (leitura do SQL aplicado) da migration 0019: o guard do
 * fluxo unificado precisa acontecer ANTES de qualquer reuso/retorno legado em
 * auto_create_operation_on_close, e o caminho legado segue intacto sem
 * entitlement.
 */
const sql = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0019_unified_workflow_v2_funnel_guard.sql"),
  "utf8",
);

describe("migration 0019 — guard do funil no servidor (teste estático de SQL)", () => {
  it("o guard V2 vem antes do reuso da operação legada", () => {
    const guard = sql.indexOf("agency_has_entitlement(NEW.user_id, 'unified_workflow_v2')");
    const legacyReuse = sql.indexOf("SELECT id, travel_file_id INTO existing_op");
    expect(guard).toBeGreaterThan(-1);
    expect(legacyReuse).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(legacyReuse);
  });

  it("só aceita fechamento com operação ligada ao MESMO file e conversion_key canônica", () => {
    expect(sql).toContain("tf.id = o.travel_file_id");
    expect(sql).toContain("o.conversion_key = 'file:' || o.travel_file_id::text");
  });

  it("operação ligada a outro file gera WORKFLOW_LINK_CONFLICT", () => {
    expect(sql).toContain("WORKFLOW_LINK_CONFLICT");
    const conflict = sql.indexOf("WORKFLOW_LINK_CONFLICT");
    const legacyInsert = sql.indexOf("INSERT INTO public.operations");
    expect(conflict).toBeLessThan(legacyInsert);
  });

  it("operação sem vínculo canônico gera USE_CONFIRM_SALE em vez de retorno silencioso", () => {
    expect(sql).toContain("USE_CONFIRM_SALE");
    expect(sql).toMatch(/IF NOT _linked_ok THEN[\s\S]*USE_CONFIRM_SALE/);
  });

  it("predicado de file ativo é apenas status <> cancelled (igual à interface)", () => {
    expect(sql).toContain("tf.status <> 'cancelled'");
    expect(sql).not.toContain("trip_completed");
  });

  it("caminho legado preservado: importação de serviços e criação da operação", () => {
    expect(sql).toContain("import_booking_request_into_operation(existing_op.id)");
    expect(sql).toContain("'opportunity:' || NEW.id::text");
    expect(sql).toContain("'legacy_close'");
  });
});
