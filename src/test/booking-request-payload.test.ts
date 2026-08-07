import { describe, it, expect } from "vitest";
import {
  MAX_SELECTED_SERVICES,
  validateBookingRequestPayload,
} from "../../supabase/functions/submit-booking-request/validate";

const base = {
  agency_slug: "minha-agencia",
  code: "abcdefghijkl1234",
  selected_service_ids: ["11111111-1111-4111-8111-111111111111"],
  client_name: "Maria Souza",
  client_email: "Maria@Exemplo.com ",
  client_whatsapp: "(11) 98888-7777",
  disclaimer_accepted: true,
  idempotency_key: "req-2026-08-07-abc12345",
};

describe("validateBookingRequestPayload", () => {
  it("aceita payload válido e normaliza", () => {
    const r = validateBookingRequestPayload({ ...base });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.client_email).toBe("maria@exemplo.com");
      expect(r.data.agency_slug).toBe("minha-agencia");
      expect(r.data.client_notes).toBeNull();
    }
  });

  it("exige aceite do disclaimer", () => {
    const r = validateBookingRequestPayload({ ...base, disclaimer_accepted: false });
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/não confirma a reserva/i);
  });

  it("rejeita e-mail e whatsapp inválidos", () => {
    expect(validateBookingRequestPayload({ ...base, client_email: "nao-email" }).ok).toBe(false);
    expect(validateBookingRequestPayload({ ...base, client_whatsapp: "123" }).ok).toBe(false);
  });

  it("rejeita link inválido", () => {
    expect(validateBookingRequestPayload({ ...base, code: "curto" }).ok).toBe(false);
    expect(validateBookingRequestPayload({ ...base, agency_slug: "Slug Inválido!" }).ok).toBe(false);
  });

  it("rejeita ids não-uuid e limita a quantidade", () => {
    expect(validateBookingRequestPayload({ ...base, selected_service_ids: ["x"] }).ok).toBe(false);
    const many = Array.from({ length: MAX_SELECTED_SERVICES + 1 }, () => base.selected_service_ids[0]);
    const r = validateBookingRequestPayload({ ...base, selected_service_ids: many });
    expect(r.ok).toBe(false);
  });

  it("aceita seleção vazia (serviços obrigatórios entram no servidor)", () => {
    const r = validateBookingRequestPayload({ ...base, selected_service_ids: [] });
    expect(r.ok).toBe(true);
  });

  it("exige idempotency_key em formato seguro", () => {
    expect(validateBookingRequestPayload({ ...base, idempotency_key: "abc" }).ok).toBe(false);
    expect(validateBookingRequestPayload({ ...base, idempotency_key: "a b/c;drop" }).ok).toBe(false);
  });

  it("limita notas a 2000 caracteres", () => {
    const r = validateBookingRequestPayload({ ...base, client_notes: "a".repeat(5000) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.client_notes?.length).toBe(2000);
  });
});
