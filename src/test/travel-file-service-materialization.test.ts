import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TravelFileService } from "@/types/travelFile";
import {
  describeServicePendingReasons,
  summarizeReconfirmation,
  isServiceEligible,
} from "@/lib/travelFileConversion";

/**
 * Migration 0025 — materialização dos serviços da solicitação no processo.
 *
 * Causa raiz coberta aqui: o trigger por linha em `quote_booking_requests`
 * roda ANTES dos itens existirem, então os serviços nunca eram criados. A
 * correção é um trigger por comando em `quote_booking_request_items`.
 */
const sql = readFileSync(
  resolve(
    process.cwd(),
    "drizzle/migrations/0025_materialize_request_services_into_travel_file.sql",
  ),
  "utf8",
);

const ensureFileSql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260819133022_9a3b2535-8ddd-4ba4-8c33-b4e40b51a97f.sql",
  ),
  "utf8",
);


describe("migration 0025 — materialização dos serviços (teste estático de SQL)", () => {
  it("cria trigger por comando nos itens da solicitação", () => {
    expect(sql).toContain("AFTER INSERT ON public.quote_booking_request_items");
    expect(sql).toContain("REFERENCING NEW TABLE AS new_items");
    expect(sql).toContain("FOR EACH STATEMENT");
    expect(sql).toContain("public.trg_materialize_request_item_services");
  });

  it("reexecuta a orquestração canônica (ensure_travel_file), sem duplicar lógica", () => {
    expect(sql).toContain("PERFORM public.ensure_travel_file(v_request_id)");
    expect(sql).not.toContain("INSERT INTO public.travel_file_services");
  });

  it("uma linha por solicitação afetada, mesmo com vários itens no mesmo comando", () => {
    expect(sql).toMatch(/SELECT DISTINCT request_id FROM new_items/);
  });

  it("falha de materialização não desfaz a solicitação do cliente", () => {
    expect(sql).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(sql).toContain("public.booking_request_issues");
  });

  it("não cria operação nem venda em nenhum caminho", () => {
    expect(sql).not.toContain("INSERT INTO public.operations");
    expect(sql).not.toContain("INSERT INTO public.sales");
    expect(sql).not.toContain("confirm_travel_file_sale");
  });

  it("o reparo pontual é idempotente, auditado e bloqueado em processo convertido", () => {
    expect(sql).toContain("FUNCTION public.travel_file_backfill_services");
    expect(sql).toContain("file_already_converted");
    expect(sql).toContain("'file_services_backfilled'");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.travel_file_backfill_services(uuid) TO service_role");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.travel_file_backfill_services(uuid) FROM authenticated",
    );
  });

  it("a chave idempotente por item da solicitação continua valendo", () => {
    expect(ensureFileSql).toContain("ON CONFLICT (request_item_id) DO NOTHING");
    // status inicial canônico: nada é marcado como disponível automaticamente
    expect(ensureFileSql).not.toMatch(/travel_file_services[\s\S]{0,4000}'available'/);
  });

  it("apenas os itens da solicitação entram (escolha do cliente é a fonte)", () => {
    expect(ensureFileSql).toContain(
      "FROM public.quote_booking_request_items i\n  WHERE i.request_id = v_req.id",
    );
  });
});

const service = (patch: Partial<TravelFileService> = {}): TravelFileService =>
  ({
    id: patch.id ?? "s1",
    file_id: "f1",
    agency_id: "a1",
    service_type: "flight",
    product_name: "Aéreo",
    quantity: 1,
    currency: "BRL",
    requested_amount: 14000,
    status: "requested",
    is_required: true,
    financial_rule_status: "pending",
    snapshot: {},
    ...patch,
  }) as TravelFileService;

describe("serviços para reconfirmar — resumo e pendências", () => {
  it("serviço recém-solicitado tem pendências e não é elegível", () => {
    const s = service();
    expect(isServiceEligible(s)).toBe(false);
    const reasons = describeServicePendingReasons(s);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/disponibilidade/i);
    expect(reasons.join(" ")).not.toMatch(/[A-Z_]{6,}/); // nenhum código técnico
  });

  it("resumo soma solicitado e reconfirmado e conta elegíveis x pendentes", () => {
    const flight = service({ id: "f", requested_amount: 14000 });
    const hotel = service({
      id: "h",
      service_type: "hotel",
      product_name: "Hotel",
      requested_amount: 15000,
      reconfirmed_amount: 15500,
      status: "available",
      financial_rule_status: "confirmed",
      supplier_name: "Operadora X",
    });
    const summary = summarizeReconfirmation([flight, hotel]);
    expect(summary.requested).toBe(29000);
    expect(summary.reconfirmed).toBe(15500);
    expect(summary.eligibleCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
  });

  it("serviço totalmente reconfirmado deixa de ter pendências", () => {
    const s = service({
      status: "available",
      reconfirmed_amount: 14200,
      financial_rule_status: "confirmed",
      supplier_name: "Operadora X",
    });
    expect(describeServicePendingReasons(s)).toEqual([]);
    expect(isServiceEligible(s)).toBe(true);
  });

  it("exceção de fornecedor justificada resolve a pendência de fornecedor", () => {
    const s = service({
      status: "available",
      reconfirmed_amount: 100,
      financial_rule_status: "confirmed",
    });
    expect(describeServicePendingReasons(s).join(" ")).toMatch(/fornecedor/i);
    expect(describeServicePendingReasons(s, { s1: "Compra direta" })).toEqual([]);
  });

  it("opcional indisponível avisa que fica fora, sem bloquear", () => {
    const s = service({ status: "unavailable", is_required: false });
    expect(describeServicePendingReasons(s)).toEqual([
      "Serviço indisponível/cancelado: ficará fora da venda.",
    ]);
  });
});
