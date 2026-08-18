import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BOOKING_ITEMS_SELECT,
  bookingItemAmount,
  bookingItemLabel,
} from "@/lib/bookingRequestItems";
import {
  buildBookingDeliveries,
  dedupeBookingDeliveries,
  matchesAgencySlug,
  resolveDeliveryUserId,
} from "@/lib/bookingRequestRecipients";

const AGENCY = "aaaaaaaa-0000-0000-0000-000000000001";
const CONSULTANT = "bbbbbbbb-0000-0000-0000-000000000002";

describe("itens exibidos no CRM (formato real da tabela)", () => {
  it("usa apenas colunas existentes", () => {
    expect(BOOKING_ITEMS_SELECT).toContain("service_name");
    expect(BOOKING_ITEMS_SELECT).toContain("amount_snapshot");
    expect(BOOKING_ITEMS_SELECT).toContain("selection_mode_snapshot");
    expect(BOOKING_ITEMS_SELECT).not.toMatch(/(^|[ ,])title([ ,]|$)/);
    expect(BOOKING_ITEMS_SELECT).not.toMatch(/(^|[ ,])amount([ ,]|$)/);
    expect(BOOKING_ITEMS_SELECT).not.toMatch(/(^|[ ,])selection_mode([ ,]|$)/);
  });

  it("renderiza service_name e cai no fallback por service_type", () => {
    expect(bookingItemLabel({ service_name: "Hotel Fasano", service_type: "hotel" })).toBe("Hotel Fasano");
    expect(bookingItemLabel({ service_name: "  ", service_type: "hotel" })).not.toBe("");
    expect(bookingItemLabel({ service_type: "hotel" }).length).toBeGreaterThan(0);
  });

  it("calcula valor por amount_snapshot x quantidade", () => {
    expect(bookingItemAmount({ amount_snapshot: 1500.5, quantity: 2 })).toBe(3001);
    expect(bookingItemAmount({ amount_snapshot: null })).toBe(0);
    expect(bookingItemAmount({ amount_snapshot: "990", quantity: null })).toBe(990);
  });
});

describe("destinatários de aviso", () => {
  it("avisa a agência titular e o consultor quando são distintos", () => {
    const rows = buildBookingDeliveries({ agencyId: AGENCY, quoteUserId: CONSULTANT, clientEmail: "cli@ex.com" });
    const emails = rows.filter((r) => r.channel === "email");
    expect(emails.map((r) => r.recipient_kind)).toEqual(["agency", "consultant", "client"]);
    expect(resolveDeliveryUserId("agency", { agency_id: AGENCY, user_id: CONSULTANT })).toBe(AGENCY);
    expect(resolveDeliveryUserId("consultant", { agency_id: AGENCY, user_id: CONSULTANT })).toBe(CONSULTANT);
    expect(resolveDeliveryUserId("client", { agency_id: AGENCY, user_id: CONSULTANT })).toBeNull();
  });

  it("não cria consultor quando o autor é o próprio titular", () => {
    const rows = buildBookingDeliveries({ agencyId: AGENCY, quoteUserId: AGENCY });
    expect(rows.some((r) => r.recipient_kind === "consultant")).toBe(false);
  });

  it("não duplica avisos ao reprocessar", () => {
    const rows = buildBookingDeliveries({ agencyId: AGENCY, quoteUserId: CONSULTANT, clientEmail: "cli@ex.com" });
    expect(dedupeBookingDeliveries([...rows, ...rows])).toHaveLength(rows.length);
  });

  it("WhatsApp skipped não guarda o telefone do cliente", () => {
    const rows = buildBookingDeliveries({ agencyId: AGENCY, quoteUserId: AGENCY, clientWhatsapp: "+5511999999999" });
    const wa = rows.find((r) => r.channel === "whatsapp")!;
    expect(wa.status).toBe("skipped");
    expect(wa.recipient_phone).toBeNull();
  });
});

describe("slug white label", () => {
  const domains = [
    { agency_slug: "100-limites", is_active: true, agency_id: AGENCY },
    { agency_slug: "antigo", is_active: false, agency_id: AGENCY },
    { agency_slug: "outra-agencia", is_active: true, agency_id: "cccccccc-0000-0000-0000-000000000003" },
  ];

  it("aceita slug de agency_public_domains ativo da agência", () => {
    expect(matchesAgencySlug("100-limites", { agencyId: AGENCY, domains })).toBe(true);
    expect(matchesAgencySlug("100-Limites", { agencyId: AGENCY, domains })).toBe(true);
  });

  it("rejeita domínio inativo ou de outra agência e slug vazio", () => {
    expect(matchesAgencySlug("antigo", { agencyId: AGENCY, domains })).toBe(false);
    expect(matchesAgencySlug("outra-agencia", { agencyId: AGENCY, domains })).toBe(false);
    expect(matchesAgencySlug("", { agencyId: AGENCY, domains })).toBe(false);
    expect(matchesAgencySlug(null, { agencyId: AGENCY, domains })).toBe(false);
  });

  it("mantém fallback do slug derivado para links antigos", () => {
    expect(matchesAgencySlug("paraiso-viagens", { agencyId: AGENCY, domains, derivedSlugs: ["paraiso-viagens"] })).toBe(true);
    expect(matchesAgencySlug("qualquer", { agencyId: AGENCY, domains, derivedSlugs: [""] })).toBe(false);
  });
});

describe("nenhum fluxo cria operação, reserva, cobrança ou pagamento", () => {
  const sql = readFileSync(
    "supabase/migrations/20260818192238_47f73c2e-cb17-46f6-954f-74009b8fa8e6.sql",
    "utf8",
  );
  const files = [sql, readFileSync("supabase/functions/submit-booking-request/index.ts", "utf8")];

  it.each(["operations", "operation_services", "booking_payments", "customer_payments", "invoices", "bookings"])(
    "não insere em %s",
    (table) => {
      for (const content of files) {
        expect(new RegExp(`INSERT\\s+INTO\\s+public\\.${table}\\b`, "i").test(content)).toBe(false);
        expect(new RegExp(`from\\(["']${table}["']\\)`).test(content)).toBe(false);
      }
    },
  );
});
