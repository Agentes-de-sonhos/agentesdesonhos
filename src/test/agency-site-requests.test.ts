import { describe, it, expect } from "vitest";
import {
  REQUEST_SERVICES, EMPTY_CONTACT, buildDetailsPayload, buildRequestSummary,
  initialServiceValues, resolveDestination, serviceByKey,
  validateContactStep, validateServiceStep,
} from "@/lib/agencySiteRequests";
import { resolveModules, resolveSections } from "@/lib/agencySiteConfig";

describe("central de solicitações — catálogo", () => {
  it("expõe exatamente os oito serviços aprovados", () => {
    expect(REQUEST_SERVICES.map((s) => s.key)).toEqual([
      "aereo", "hospedagem", "carro", "transfer", "ingressos", "seguro", "cruzeiros", "pacotes",
    ]);
  });

  it("todo serviço tem pelo menos um campo obrigatório e nomes únicos", () => {
    for (const service of REQUEST_SERVICES) {
      const names = service.fields.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
      expect(service.fields.some((f) => f.required)).toBe(true);
    }
  });
});

describe("validação da etapa 1", () => {
  it("acusa campos obrigatórios vazios", () => {
    const service = serviceByKey("aereo");
    const errors = validateServiceStep(service, initialServiceValues(service));
    expect(errors.origem).toBeTruthy();
    expect(errors.destino).toBeTruthy();
    expect(errors.data_ida).toBeTruthy();
    // adultos já vem pré-preenchido
    expect(errors.adultos).toBeUndefined();
  });

  it("passa quando os obrigatórios estão preenchidos", () => {
    const service = serviceByKey("aereo");
    const values = {
      ...initialServiceValues(service),
      origem: "São Paulo",
      destino: "Lisboa",
      data_ida: "2026-10-01",
    };
    expect(validateServiceStep(service, values)).toEqual({});
  });
});

describe("validação da etapa 2 (contato)", () => {
  it("exige nome, consentimento e ao menos WhatsApp ou e-mail", () => {
    const errors = validateContactStep(EMPTY_CONTACT);
    expect(errors.lead_name).toBeTruthy();
    expect(errors.consent).toBeTruthy();
    expect(errors.lead_phone).toBeTruthy();
    expect(errors.lead_email).toBeTruthy();
  });

  it("aceita somente e-mail", () => {
    expect(
      validateContactStep({ ...EMPTY_CONTACT, lead_name: "Ana Souza", lead_email: "ana@teste.com", consent: true }),
    ).toEqual({});
  });

  it("aceita somente WhatsApp", () => {
    expect(
      validateContactStep({ ...EMPTY_CONTACT, lead_name: "Ana Souza", lead_phone: "(11) 98888-7777", consent: true }),
    ).toEqual({});
  });

  it("rejeita telefone curto e e-mail inválido", () => {
    const errors = validateContactStep({
      ...EMPTY_CONTACT, lead_name: "Ana", lead_phone: "1198", lead_email: "ana@", consent: true,
    });
    expect(errors.lead_phone).toBeTruthy();
    expect(errors.lead_email).toBeTruthy();
  });
});

describe("payload enviado ao servidor", () => {
  const service = serviceByKey("hospedagem");
  const values = {
    ...initialServiceValues(service),
    destino: "Porto Seguro",
    check_in: "2026-12-01",
    check_out: "2026-12-08",
    quartos: "2",
  };

  it("resolve destino e resumo legível", () => {
    expect(resolveDestination(values)).toBe("Porto Seguro");
    const summary = buildRequestSummary(service, values);
    expect(summary).toContain("Serviço: Hospedagem");
    expect(summary).toContain("Porto Seguro");
  });

  it("não envia campos vazios e nunca carrega identificadores de agência", () => {
    const details = buildDetailsPayload(service, values);
    expect(details.destino).toBe("Porto Seguro");
    expect(details.necessidades_especiais).toBeUndefined();
    const keys = Object.keys(details);
    expect(keys.some((k) => /user_id|agency|tenant/i.test(k))).toBe(false);
  });
});

describe("configuração de seções", () => {
  it("mantém a ordem aprovada e oculta opcionais por padrão", () => {
    const keys = resolveSections().map((s) => s.key);
    expect(keys).toEqual([
      "highlights", "modules", "offers", "about", "differentials", "concierge", "faq", "newsletter",
    ]);
  });

  it("permite ocultar e ativar seções por agência", () => {
    const keys = resolveSections({ offers: false, team: true }).map((s) => s.key);
    expect(keys).not.toContain("offers");
    expect(keys).toContain("team");
  });

  it("módulos temáticos apontam para serviços válidos", () => {
    const valid = new Set(REQUEST_SERVICES.map((s) => s.key));
    for (const m of resolveModules()) expect(valid.has(m.service)).toBe(true);
  });
});
