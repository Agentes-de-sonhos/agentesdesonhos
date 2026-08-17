import { describe, expect, it } from "vitest";
import {
  additionalProgressLabel, backFromContact, essentialFieldNames, isTravelerField,
  stepFields, toggleSelection,
} from "@/lib/agencyJourneyFlow";
import {
  initialServiceValues, serviceByKey, validateContactStep, EMPTY_CONTACT,
} from "@/lib/agencySiteRequests";
import {
  applyContextToService, contextFromService, eligibleComplements, emptyTripContext,
} from "@/lib/agencyQuoteJourney";

const aereo = serviceByKey("aereo");
const hospedagem = serviceByKey("hospedagem");
const ingressos = serviceByKey("ingressos");

const quick = {
  ...initialServiceValues(aereo),
  tipo_viagem: "Ida e volta",
  origem: "São Paulo",
  destino: "Lisboa",
  data_ida: "2026-10-01",
  data_volta: "2026-10-12",
  adultos: "2",
  criancas: "1",
};

describe("etapa 1 — complemento do serviço inicial", () => {
  const names = stepFields(aereo, { role: "primary", values: quick }).map((f) => f.name);

  it("mostra somente os cinco grupos pedidos para o aéreo", () => {
    expect(names).toEqual([
      "adultos", "criancas", "idades_criancas", "flexibilidade", "classe", "observacoes",
    ]);
  });

  it("não pede bagagem nem preferência de voo direto", () => {
    expect(names).not.toContain("bagagem");
    expect(names).not.toContain("voo_direto");
  });

  it("não repete origem, destino nem datas da primeira dobra", () => {
    for (const field of ["origem", "destino", "data_ida", "data_volta"]) {
      expect(names).not.toContain(field);
    }
  });

  it("mantém adultos/crianças juntos e idades imediatamente depois", () => {
    const order = essentialFieldNames("aereo");
    expect(order.slice(0, 3)).toEqual(["adultos", "criancas", "idades_criancas"]);
    expect(isTravelerField("idades_criancas")).toBe(true);
  });

  it("flexibilidade é obrigatória nesta etapa", () => {
    const flex = stepFields(aereo, { role: "primary", values: quick }).find((f) => f.name === "flexibilidade");
    expect(flex?.required).toBe(true);
  });

  it("volta a pedir campos iniciais ausentes (CTA sem primeira dobra)", () => {
    const bare = stepFields(aereo, { role: "primary", values: initialServiceValues(aereo) }).map((f) => f.name);
    expect(bare).toContain("origem");
    expect(bare).toContain("destino");
  });
});

describe("etapa 3 — serviços adicionais", () => {
  const ctx = contextFromService("aereo", quick, emptyTripContext());

  it("herda contexto e pede somente o essencial que falta", () => {
    const values = applyContextToService(hospedagem, initialServiceValues(hospedagem), ctx);
    const names = stepFields(hospedagem, { role: "additional", values }).map((f) => f.name);
    expect(names).toContain("quartos");
    expect(names).not.toContain("destino");
    expect(names).not.toContain("adultos");
    expect(names).not.toContain("criancas");
    expect(names).not.toContain("regime");
    expect(names).not.toContain("categoria");
  });

  it("pede dados obrigatórios que o contexto não fornece", () => {
    const values = applyContextToService(ingressos, initialServiceValues(ingressos), ctx);
    const names = stepFields(ingressos, { role: "additional", values }).map((f) => f.name);
    expect(names).toContain("atracao");
    expect(names).not.toContain("adultos");
  });

  it("rotula o progresso e navega de volta corretamente", () => {
    expect(additionalProgressLabel(1, 3)).toBe("Serviço 2 de 3");
    expect(backFromContact(["hospedagem"], true)).toBe("additional");
    expect(backFromContact([], true)).toBe("pick");
    expect(backFromContact([], false)).toBe("primary");
  });
});

describe("etapa 2 — seleção múltipla de serviços", () => {
  it("permite marcar e desmarcar vários serviços", () => {
    let selection = toggleSelection([], "hospedagem");
    selection = toggleSelection(selection, "seguro");
    expect(selection).toEqual(["hospedagem", "seguro"]);
    expect(toggleSelection(selection, "hospedagem")).toEqual(["seguro"]);
  });

  it("com aéreo inicial oferece exatamente os seis complementos", () => {
    expect(eligibleComplements(["aereo"]).map((s) => s.key)).toEqual([
      "hospedagem", "carro", "transfer", "ingressos", "seguro", "cruzeiros",
    ]);
  });
});

describe("etapa 4 — contato", () => {
  it("exige nome e ao menos WhatsApp ou e-mail", () => {
    const errors = validateContactStep({ ...EMPTY_CONTACT, lead_name: "Maria Souza", consent: true });
    expect(errors.lead_phone).toBe(
      "Informe um WhatsApp ou e-mail para que a agência possa entrar em contato com você.",
    );
    expect(errors.lead_email).toBeTruthy();
    expect(
      validateContactStep({ ...EMPTY_CONTACT, lead_name: "Maria Souza", lead_email: "maria@ex.com", consent: true }),
    ).toEqual({});
    expect(
      validateContactStep({ ...EMPTY_CONTACT, lead_name: "Maria Souza", lead_phone: "(11) 98888-7777", consent: true }),
    ).toEqual({});
  });

  it("consentimento é obrigatório", () => {
    const errors = validateContactStep({ ...EMPTY_CONTACT, lead_name: "Maria Souza", lead_email: "m@e.com" });
    expect(errors.consent).toBeTruthy();
  });
});
