import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  quoteHasLinkedClient,
  validateBookingContact,
} from "@/lib/quoteBookingSelection";
import {
  buildRequestedServicesView,
  pickActiveBookingRequest,
} from "@/lib/bookingRequestCrmView";

const MIGRATION = "supabase/migrations/20260818202614_ac60f7fe-813c-4463-92d0-4ffcc6614f92.sql";
const sql = readFileSync(MIGRATION, "utf8");
const edge = readFileSync("supabase/functions/submit-booking-request/validate.ts", "utf8");

describe("identidade do cliente no orçamento nominal", () => {
  it("não exige nome nem contato quando a quote tem cliente vinculado", () => {
    expect(quoteHasLinkedClient({ has_linked_client: true })).toBe(true);
    expect(
      validateBookingContact({
        name: "",
        whatsapp: "",
        email: "",
        disclaimerAccepted: true,
        hasLinkedClient: true,
      }),
    ).toBeNull();
  });

  it("ainda exige o aviso aceito mesmo com cliente vinculado", () => {
    expect(
      validateBookingContact({
        name: "",
        whatsapp: "",
        email: "",
        disclaimerAccepted: false,
        hasLinkedClient: true,
      }),
    ).toMatch(/aviso/i);
  });

  it("mantém o fallback exigindo contato quando não há cliente vinculado", () => {
    expect(quoteHasLinkedClient({})).toBe(false);
    expect(
      validateBookingContact({ name: "Ana Souza", whatsapp: "", email: "", disclaimerAccepted: true }),
    ).toMatch(/WhatsApp ou e-mail/i);
    expect(
      validateBookingContact({
        name: "Ana Souza",
        whatsapp: "(11) 99999-9999",
        email: "",
        disclaimerAccepted: true,
      }),
    ).toBeNull();
  });

  it("o endpoint público não bloqueia payload sem contato (o banco decide)", () => {
    expect(edge).not.toContain('Informe WhatsApp ou e-mail para a agência entrar em contato.');
    expect(edge).toContain("Informe um e-mail válido.");
  });

  it("o banco usa o cliente da quote e ignora o contato do navegador", () => {
    expect(sql).toMatch(/v_client_id := v_quote\.client_id/);
    expect(sql).toMatch(/FROM public\.clients WHERE id = v_client_id/);
    // fora do fallback nunca chamamos o dedupe de leads
    const fallback = sql.split("fallback legado")[1] || "";
    expect(fallback).toContain("ensure_client_and_opportunity_for_lead");
    expect(sql.match(/ensure_client_and_opportunity_for_lead\(/g) || []).toHaveLength(1);
  });

  it("contato só é obrigatório sem cliente vinculado (constraint)", () => {
    expect(sql).toMatch(/CHECK \(\s*client_id IS NOT NULL/);
  });
});

describe("oportunidade única e correta", () => {
  it("reaproveita quote.opportunity_id, depois pedido anterior, e só então cria", () => {
    const fn = sql.split("sync_booking_request_opportunity")[1];
    expect(fn).toContain("v_opp := v_quote.opportunity_id");
    expect(fn).toContain("WHERE r.quote_id = v_quote.id AND r.opportunity_id IS NOT NULL");
    expect(fn).toContain("INSERT INTO public.opportunities");
  });

  it("usa a etapa negotiation com fallback comercial e não regride closed/lost", () => {
    expect(sql).toContain("legacy_key = 'negotiation'");
    expect(sql).toContain("NOT IN ('closed', 'lost')");
    expect(sql).toMatch(/IN \('closed', 'lost'\)\s*\n\s*THEN o\.stage_id/);
  });

  it("vincula quote e request à mesma oportunidade e grava o valor dos itens", () => {
    expect(sql).toContain("UPDATE public.quotes SET opportunity_id = v_opp");
    expect(sql).toMatch(/UPDATE public\.quote_booking_requests\s*\n\s*SET opportunity_id = v_opp/);
    expect(sql).toContain("estimated_value = GREATEST(COALESCE(v_total");
  });

  it("cria histórico/follow-up apenas uma vez por pedido", () => {
    expect(sql).toContain("event_type = 'crm_opportunity_linked'");
    expect(sql).toContain("IF NOT v_already THEN");
  });
});

describe("conversão para Operação", () => {
  it("copia somente o pedido ativo mais recente, sem duplicar", () => {
    const fn = sql.split("import_booking_request_into_operation")[2] || sql;
    expect(fn).toContain("NOT IN ('superseded', 'cancelled', 'expired')");
    expect(fn).toContain("os.source_quote_service_id = v_item.source_quote_service_id");
    expect(fn).toContain("SET operation_service_id = v_service_id");
    expect(fn).toContain("is_confirmed");
    expect(fn).toMatch(/false, false, false, false, v_pos/);
  });

  it("preenche quote_id e sale_amount da operação", () => {
    expect(sql).toContain("quote_id = COALESCE(quote_id, v_req.quote_id)");
    expect(sql).toContain("sale_amount = GREATEST(COALESCE(NULLIF(v_req.total_estimated, 0)");
  });

  it("nunca cria cobrança, pagamento ou reserva", () => {
    for (const table of [
      "booking_payments",
      "customer_payments",
      "invoices",
      "invoice_payments",
      "bookings",
    ]) {
      expect(new RegExp(`INSERT\\s+INTO\\s+public\\.${table}\\b`, "i").test(sql)).toBe(false);
    }
    expect(sql).not.toMatch(/is_paid\s*=\s*true/);
    expect(sql).not.toMatch(/payment_status\s*=\s*'pago'/);
  });
});

describe("segurança das novas funções", () => {
  it("anon/authenticated não ganham escrita direta", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.sync_booking_request_opportunity(uuid) FROM anon, authenticated",
    );
    expect(sql).toMatch(/submit_quote_booking_request\([^)]*\) FROM anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.sync_booking_request_opportunity\(uuid\) TO service_role/);
  });

  it("payload público não expõe client_id nem contatos do cadastro", () => {
    expect(sql).toContain("(to_jsonb(quote_record) - 'client_id')");
    expect(sql).toContain("'has_linked_client', quote_record.client_id IS NOT NULL");
  });
});

describe("CRM: serviços selecionados e não selecionados", () => {
  const items = [
    {
      id: "i1",
      source_quote_service_id: "s1",
      service_type: "hotel",
      service_name: "Hotel Fasano",
      amount_snapshot: 1500,
      selection_mode_snapshot: "required",
      quantity: 2,
      snapshot: { service_data: { supplier: "Fasano", check_in: "2026-12-23" } },
    },
    {
      id: "i2",
      source_quote_service_id: "s2",
      service_type: "aereo",
      service_name: "GRU → MIA",
      amount_snapshot: 4212.7,
      selection_mode_snapshot: "optional",
      quantity: 1,
      snapshot: {},
    },
  ];
  const quoteServices = [
    { id: "s1", service_type: "hotel", option_label: "Hotel Fasano", amount: 1500 },
    { id: "s2", service_type: "aereo", option_label: "GRU → MIA", amount: 4212.7 },
    { id: "s3", service_type: "seguro", option_label: "Seguro viagem", amount: 300 },
  ];

  it("usa o snapshot do pedido para selecionados e quote_services para o resto", () => {
    const view = buildRequestedServicesView({ items, quoteServices });
    expect(view.selected.map((s) => s.label)).toEqual(["Hotel Fasano", "GRU → MIA"]);
    expect(view.selected[0].amount).toBe(3000); // amount_snapshot x quantidade
    expect(view.selected[0].details.join(" ")).toContain("Fasano");
    expect(view.unselected.map((s) => s.label)).toEqual(["Seguro viagem"]);
    expect(view.selectedTotal).toBeCloseTo(7212.7, 2);
  });

  it("escolhe o pedido ativo mais recente ignorando superseded/cancelled/expired", () => {
    const active = pickActiveBookingRequest([
      { id: "a", status: "superseded", version: 3, created_at: "2026-08-18T20:00:00Z" },
      { id: "b", status: "received", version: 2, created_at: "2026-08-18T19:00:00Z" },
      { id: "c", status: "cancelled", version: 4, created_at: "2026-08-18T21:00:00Z" },
    ]);
    expect(active?.id).toBe("b");
    expect(pickActiveBookingRequest([{ id: "x", status: "expired" }])).toBeNull();
  });
});