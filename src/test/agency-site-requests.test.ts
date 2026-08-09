import { describe, it, expect } from "vitest";
import {
  REQUEST_SERVICES, EMPTY_CONTACT, buildDetailsPayload, buildRequestSummary,
  initialServiceValues, resolveDestination, serviceByKey,
  validateContactStep, validateServiceStep,
  ALLOWED_SERVICE_KEYS, isAllowedServiceKey, validateServiceDates,
} from "@/lib/agencySiteRequests";
import {
  resolveModules, resolveSections, resolveHeroSlides,
  HERO_MAX_SLIDES, HERO_MIN_SLIDES, DEFAULT_HERO_SLIDES,
} from "@/lib/agencySiteConfig";

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

// ---------------------------------------------------------------------------
// Revisão corretiva: allowlist, datas, idempotência por tenant e origem
// ---------------------------------------------------------------------------
describe("revisão corretiva da home white label", () => {
  it("allowlist cobre exatamente os 8 serviços do catálogo", () => {
    expect([...ALLOWED_SERVICE_KEYS].sort()).toEqual(
      REQUEST_SERVICES.map((s) => s.key).sort(),
    );
    expect(isAllowedServiceKey("aereo")).toBe(true);
    expect(isAllowedServiceKey("newsletter")).toBe(false);
    expect(isAllowedServiceKey("../admin")).toBe(false);
  });

  it("bloqueia check-out anterior ou igual ao check-in", () => {
    const svc = serviceByKey("hospedagem");
    const base = { ...initialServiceValues(svc), destino: "Salvador", quartos: "1", adultos: "2" };
    expect(validateServiceDates(svc, { ...base, check_in: "2026-10-10", check_out: "2026-10-09" }).check_out).toBeTruthy();
    expect(validateServiceDates(svc, { ...base, check_in: "2026-10-10", check_out: "2026-10-10" }).check_out).toBeTruthy();
    expect(validateServiceDates(svc, { ...base, check_in: "2026-10-10", check_out: "2026-10-14" }).check_out).toBeUndefined();
  });

  it("bloqueia devolução antes da retirada (data e hora no mesmo dia)", () => {
    const svc = serviceByKey("carro");
    const base = initialServiceValues(svc);
    expect(validateServiceDates(svc, { ...base, retirada_data: "2026-05-10", devolucao_data: "2026-05-09" }).devolucao_data).toBeTruthy();
    expect(
      validateServiceDates(svc, {
        ...base,
        retirada_data: "2026-05-10",
        devolucao_data: "2026-05-10",
        retirada_hora: "14:00",
        devolucao_hora: "10:00",
      }).devolucao_hora,
    ).toBeTruthy();
    expect(validateServiceDates(svc, { ...base, retirada_data: "2026-05-10", devolucao_data: "2026-05-12" })).toEqual({});
  });

  it("bloqueia fim do seguro antes do início e volta aérea antes da ida", () => {
    const seguro = serviceByKey("seguro");
    expect(validateServiceDates(seguro, { inicio: "2026-03-10", fim: "2026-03-01" }).fim).toBeTruthy();
    const aereo = serviceByKey("aereo");
    expect(validateServiceDates(aereo, { data_ida: "2026-03-10", data_volta: "2026-03-05" }).data_volta).toBeTruthy();
    expect(validateServiceDates(aereo, { data_ida: "2026-03-10", data_volta: "" }).data_volta).toBeUndefined();
  });

  it("validateServiceStep agrega os erros de data", () => {
    const svc = serviceByKey("hospedagem");
    const errors = validateServiceStep(svc, {
      ...initialServiceValues(svc),
      destino: "Gramado",
      quartos: "1",
      adultos: "2",
      check_in: "2026-07-10",
      check_out: "2026-07-05",
    });
    expect(errors.check_out).toBeTruthy();
  });
});
