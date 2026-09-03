import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildInspirationPayload,
  INSPIRATION_NOTE,
  INSPIRATION_SERVICE_KEY,
  INSPIRATION_SOURCE_LABEL,
  maskBrazilianPhone,
  normalizeBrazilianPhone,
  safeWhatsappGroupUrl,
  validateInspirationLead,
} from "@/lib/agencyInspirationLead";

const dialog = readFileSync("src/components/whitelabel/AgencyInspirationDialog.tsx", "utf8");
const home = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");

describe("captação de inspirações — regras de formulário", () => {
  it("exige os três campos obrigatórios", () => {
    const errors = validateInspirationLead({ first_name: "", phone: "", email: "" });
    expect(errors.first_name).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.email).toBeTruthy();
  });

  it("aceita dados válidos e normaliza o WhatsApp", () => {
    const form = { first_name: "Ana", phone: "(11) 98888-7777", email: "Ana@Email.com" };
    expect(validateInspirationLead(form)).toEqual({});
    expect(normalizeBrazilianPhone(form.phone)).toBe("11988887777");
  });

  it("aplica máscara brasileira progressiva", () => {
    expect(maskBrazilianPhone("11988887777")).toBe("(11) 98888-7777");
    expect(maskBrazilianPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("rejeita e-mail inválido", () => {
    expect(validateInspirationLead({ first_name: "Ana", phone: "11988887777", email: "ana@" }).email).toBeTruthy();
  });
});

describe("segurança da URL do grupo", () => {
  it("aceita apenas convites WhatsApp em http/https", () => {
    expect(safeWhatsappGroupUrl("https://chat.whatsapp.com/ABC123")).toBe("https://chat.whatsapp.com/ABC123");
    expect(safeWhatsappGroupUrl("javascript:alert(1)")).toBeNull();
    expect(safeWhatsappGroupUrl("https://evil.com/grupo")).toBeNull();
    expect(safeWhatsappGroupUrl("")).toBeNull();
    expect(safeWhatsappGroupUrl(null)).toBeNull();
  });
});

describe("payload e origem do lead", () => {
  it("usa a chave de serviço, origem e observação semânticas", () => {
    const payload = buildInspirationPayload({
      first_name: " Ana ",
      phone: "(11) 98888-7777",
      email: " ANA@email.com ",
    });
    expect(payload.service_key).toBe(INSPIRATION_SERVICE_KEY);
    expect(payload.service_label).toBe(INSPIRATION_SOURCE_LABEL);
    expect(payload.summary).toBe(INSPIRATION_NOTE);
    expect(payload.notes).toBe(INSPIRATION_NOTE);
    expect(payload.consent).toBe(true);
    expect(payload.lead_name).toBe("Ana");
    expect(payload.lead_email).toBe("ana@email.com");
    expect(payload.lead_phone).toBe("11988887777");
  });

  it("não envia identificador de agência pelo cliente (tenant resolvido no servidor)", () => {
    const payload = buildInspirationPayload({ first_name: "Ana", phone: "11988887777", email: "a@b.com" });
    expect(Object.keys(payload)).not.toContain("agency_id");
    expect(Object.keys(payload)).not.toContain("user_id");
  });
});

describe("modal e CTA", () => {
  it("grava antes de redirecionar e não redireciona em caso de erro", () => {
    const submitIndex = dialog.indexOf("await submit(buildInspirationPayload");
    const guardIndex = dialog.indexOf('if (!("success" in result) || !result.success)');
    const redirectIndex = dialog.indexOf("window.location.assign(safeUrl)");
    expect(submitIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(submitIndex);
    expect(redirectIndex).toBeGreaterThan(guardIndex);
  });

  it("bloqueia duplo envio", () => {
    expect(dialog).toContain("if (submittingRef.current) return");
  });

  it("mostra confirmação quando não há URL configurada", () => {
    expect(dialog).toContain("Pronto! Você receberá nossas próximas inspirações.");
  });

  it("usa os tokens dinâmicos de cor na ação principal", () => {
    expect(dialog).toContain("bg-[var(--brand-secondary)]");
    expect(dialog).toContain("text-[var(--brand-on-secondary)]");
  });

  it("CTA editorial usa secundária dinâmica e o quadro usa a primária", () => {
    expect(home).toContain("bg-[var(--brand-primary)] px-8 py-12");
    expect(home).toContain("Quero receber inspirações");
    expect(home).toContain("groupUrl={info.whatsapp_group_url}");
  });

  it("modal é acessível (labels e alertas)", () => {
    expect(dialog).toContain('htmlFor="inspiration-phone"');
    expect(dialog).toContain('role="alert"');
    expect(dialog).toContain("<DialogTitle");
  });
});
