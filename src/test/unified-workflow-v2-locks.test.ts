import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardas estruturais da migration 0018 (2ª rodada corretiva). O comportamento
 * concorrente real é autoridade do banco; aqui garantimos que a função aplicada
 * mantém a ordem de locks (processo -> oportunidade) e revalida os vínculos
 * depois dos dois locks, antes de qualquer escrita.
 */
const sql = readFileSync(
  join(process.cwd(), "drizzle/migrations/0018_unified_workflow_v2_opportunity_lock.sql"),
  "utf-8",
);

describe("Fase 1A — migration 0018 (locks e linhagem)", () => {
  it("ordem determinística: lock do processo, depois da oportunidade", () => {
    const fileLock = sql.indexOf("FROM public.travel_files WHERE id = p_file_id FOR UPDATE");
    const oppLock = sql.indexOf("FROM public.opportunities WHERE id = _file.opportunity_id FOR UPDATE");
    expect(fileLock).toBeGreaterThan(0);
    expect(oppLock).toBeGreaterThan(fileLock);
  });

  it("checagens de vínculo e ambiguidade acontecem DEPOIS do lock da oportunidade", () => {
    const oppLock = sql.indexOf("FROM public.opportunities WHERE id = _file.opportunity_id FOR UPDATE");
    const reread = sql.indexOf("SELECT id INTO _operation_id FROM public.operations WHERE travel_file_id = p_file_id");
    const conflict = sql.indexOf("Esta oportunidade já está vinculada a outro processo de reserva");
    const ambiguous = sql.indexOf("LEGACY_AMBIGUOUS_LINK");
    expect(reread).toBeGreaterThan(oppLock);
    expect(conflict).toBeGreaterThan(reread);
    expect(ambiguous).toBeGreaterThan(conflict);
  });

  it("nenhuma escrita antes das checagens de vínculo", () => {
    const conflict = sql.indexOf("Esta oportunidade já está vinculada a outro processo de reserva");
    const firstOperationWrite = sql.indexOf("INSERT INTO public.operations");
    const firstSaleWrite = sql.indexOf("INSERT INTO public.sales");
    const firstServiceWrite = sql.indexOf("INSERT INTO public.operation_services");
    expect(firstOperationWrite).toBeGreaterThan(conflict);
    expect(firstSaleWrite).toBeGreaterThan(conflict);
    expect(firstServiceWrite).toBeGreaterThan(conflict);
  });

  it("valida agência e cliente compatíveis da oportunidade", () => {
    expect(sql).toContain("_opp.user_id <> _file.agency_id");
    expect(sql).toContain("_opp.client_id <> _file.client_id");
  });

  it("idempotência e tipo canônico de 0017 permanecem", () => {
    expect(sql).toContain("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
    expect(sql).toContain("ON CONFLICT (file_id, command, idempotency_key) DO NOTHING");
    expect(sql).toContain("public.canonical_sale_product_type(_service.service_type)");
    expect(sql).toContain("public.canonical_sale_product_type('pacote')");
  });

  it("recebimento do cliente no V2 não soma vendas por oportunidade", () => {
    const fn = sql.slice(
      sql.indexOf("compute_operation_customer_payment_status"),
      sql.indexOf("confirm_travel_file_sale"),
    );
    expect(fn).toContain("_v2 := _op.travel_file_id IS NOT NULL");
    expect(fn).toContain("NOT _v2 AND s.opportunity_id IS NOT NULL");
    // Pagamento vindo de fatura não pode ser contado duas vezes.
    expect(fn).toContain("_invoiced > 0 AND COALESCE(cp.source, 'manual') = 'invoice'");
  });
});
