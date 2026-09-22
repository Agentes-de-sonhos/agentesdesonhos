import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas dos quatro bloqueadores corrigidos na migration 0017. O comportamento
 * de dados é autoridade do banco; aqui garantimos que o SQL aplicado mantém a
 * ordem e as proteções que a auditoria exigiu.
 */
const sql = readFileSync(
  join(process.cwd(), "drizzle/migrations/0017_unified_workflow_v2_corrections.sql"),
  "utf-8",
);
const kanban = readFileSync(join(process.cwd(), "src/components/crm/KanbanBoard.tsx"), "utf-8");

describe("Fase 1A — correções (migration 0017)", () => {
  it("1) tipos de produto: função canônica e CHECK com 'pacote'", () => {
    expect(sql).toContain("canonical_sale_product_type");
    expect(sql).toMatch(/sale_products_product_type_check[\s\S]*'pacote'/);
    expect(sql).toContain("public.canonical_sale_product_type(_service.service_type)");
    expect(sql).toContain("public.canonical_sale_product_type('pacote')");
    expect(sql).toContain("'travel_file_package'");
  });

  it("2) idempotência: lock do processo ANTES de ler os comandos", () => {
    const lock = sql.indexOf("FROM public.travel_files WHERE id = p_file_id FOR UPDATE");
    const read = sql.indexOf("FROM public.workflow_commands");
    expect(lock).toBeGreaterThan(0);
    expect(read).toBeGreaterThan(lock);
    expect(sql).toContain("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
    expect(sql).toContain("ON CONFLICT (file_id, command, idempotency_key) DO NOTHING");
  });

  it("3) vínculo exclusivo: conflito e ambiguidade antes de qualquer escrita", () => {
    const conflict = sql.indexOf("WORKFLOW_LINK_CONFLICT");
    const ambiguous = sql.indexOf("LEGACY_AMBIGUOUS_LINK");
    const firstWrite = sql.indexOf("INSERT INTO public.operations");
    expect(conflict).toBeGreaterThan(0);
    expect(ambiguous).toBeGreaterThan(conflict);
    expect(firstWrite).toBeGreaterThan(ambiguous);
    expect(sql).toContain("o.travel_file_id IS NOT NULL AND o.travel_file_id <> p_file_id");
    expect(sql).toContain("s.travel_file_id IS NOT NULL AND s.travel_file_id <> p_file_id");
  });

  it("4) pagamentos do cliente: 'operation' aceito e legado preservado", () => {
    expect(sql).toMatch(/customer_payments_source_check[\s\S]*'operation'/);
    expect(sql).toContain("WHEN v_op.travel_file_id IS NULL THEN v_status");
  });

  it("kill switch: regra financeira V2 exige o entitlement", () => {
    const fn = sql.slice(sql.indexOf("travel_file_service_set_financial_rule"));
    expect(fn).toContain("unified_workflow_v2");
    expect(fn).toContain("UNIFIED_WORKFLOW_DISABLED");
  });

  it("funil: falha de consulta ou USE_CONFIRM_SALE não fecha pelo caminho antigo", () => {
    expect(kanban).toContain("error: linkedError");
    expect(kanban).toContain("USE_CONFIRM_SALE");
    expect(kanban).toContain("Nada foi alterado.");
  });
});
