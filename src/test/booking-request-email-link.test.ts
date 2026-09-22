import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const notify = readFileSync(
  resolve(process.cwd(), "supabase/functions/submit-booking-request/notify.ts"),
  "utf8",
);
const migration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0024_booking_request_alerts_and_deeplinks.sql"),
  "utf8",
);

describe("aviso por e-mail do pedido de reserva", () => {
  it("usa a fila v2, que traz a ficha e o WhatsApp da agência", () => {
    expect(notify).toContain('rpc("pending_booking_request_deliveries_v2"');
  });

  it("aponta o CTA para a ficha da Central de Reservas", () => {
    expect(notify).toContain("/reservas/${row.travel_file_id}");
    expect(notify).toContain("bookingRequestDeepLink");
  });

  it("mantém o WhatsApp preparado e inerte", () => {
    expect(notify).toContain("planWhatsappNotify");
    expect(notify).not.toMatch(/api\.twilio\.com|connector-gateway/);
  });

  it("marca cada entrega por canal, sem desfazer a solicitação", () => {
    for (const status of ["sent", "failed", "skipped"]) {
      expect(notify).toContain(`p_status: "${status}"`);
    }
  });

  it("não registra PII completa nos logs de erro", () => {
    const logs = notify.match(/console\.(error|log)\([^)]*\)/g) ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      expect(line).not.toMatch(/client_email|client_whatsapp|recipient_email|\bto\b/);
    }
  });
});

describe("migração 0024", () => {
  it("publica quote_booking_requests no realtime de forma idempotente", () => {
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_booking_requests");
    expect(migration).toContain("IF NOT EXISTS");
  });

  it("é aditiva: nada é removido ou renomeado", () => {
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|ALTER TABLE .* RENAME/i);
  });

  it("isola o deep link por agência", () => {
    expect(migration).toContain("booking_request_file_link");
    expect(migration).toContain("resolve_agency_id_for_user(auth.uid())");
  });
});
