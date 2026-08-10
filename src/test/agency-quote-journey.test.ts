import { describe, expect, it } from "vitest";
import {
  applyContextToService, buildJourneyPayload, contextFromService, eligibleComplements,
  emptyTripContext, syncChildAges, totalTravelers,
} from "@/lib/agencyQuoteJourney";
import {
  formFields, initialServiceValues, quickQuoteFields, serviceByKey, validateQuickStep, validateServiceStep,
} from "@/lib/agencySiteRequests";

const aereo = serviceByKey("aereo");
const hospedagem = serviceByKey("hospedagem");

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

describe("cotação rápida (primeira dobra)", () => {
  it("aéreo ida e volta exige ida e volta", () => {
    expect(validateQuickStep(aereo, { ...quick, data_volta: "" }).data_volta).toBeTruthy();
    expect(validateQuickStep(aereo, quick)).toEqual({});
  });

  it("somente ida não exige volta", () => {
    const values = { ...quick, tipo_viagem: "Somente ida", data_volta: "" };
    expect(validateQuickStep(aereo, values)).toEqual({});
  });

  it("multidestinos exige a rota no formulário focado", () => {
    const values = { ...quick, tipo_viagem: "Multidestinos", data_volta: "" };
    expect(validateQuickStep(aereo, values)).toEqual({});
    expect(validateServiceStep(aereo, values).rota_multidestinos).toBeTruthy();
    expect(validateServiceStep(aereo, { ...values, rota_multidestinos: "GRU-LIS-MAD" })).toEqual({});
  });
});

describe("jornada contextual", () => {
  it("não repete no modal o que já veio da cotação rápida", () => {
    const names = formFields(aereo, { isPrimary: true }).map((f) => f.name);
    for (const field of quickQuoteFields(aereo, 5)) expect(names).not.toContain(field.name);
    expect(names).toContain("adultos");
    expect(names).toContain("rota_multidestinos");
  });

  it("complemento herda contexto e não pede destino/pax de novo", () => {
    const ctx = contextFromService("aereo", quick, emptyTripContext());
    expect(ctx.destino).toBe("Lisboa");
    expect(totalTravelers(ctx)).toBe(3);

    const values = applyContextToService(hospedagem, initialServiceValues(hospedagem), ctx);
    expect(values.destino).toBe("Lisboa");
    expect(values.check_in).toBe("2026-10-01");
    expect(values.check_out).toBe("2026-10-12");

    const names = formFields(hospedagem, { isComplement: true }).map((f) => f.name);
    expect(names).not.toContain("destino");
    expect(names).toContain("check_in");
  });

  it("respeita exclusividade carro/transfer e serviços só principais", () => {
    const keys = eligibleComplements(["aereo", "carro"]).map((s) => s.key);
    expect(keys).not.toContain("carro");
    expect(keys).not.toContain("transfer");
    expect(keys).not.toContain("pacotes");
    expect(keys).toContain("hospedagem");
  });

  it("mantém idades das crianças sincronizadas com a contagem", () => {
    expect(syncChildAges(["5", "7"], 1)).toEqual(["5"]);
    expect(syncChildAges(["5"], 3)).toEqual(["5", "", ""]);
  });

  it("envia uma única solicitação com todos os serviços", () => {
    const ctx = contextFromService("aereo", quick, emptyTripContext());
    const hotel = applyContextToService(hospedagem, initialServiceValues(hospedagem), ctx);
    const payload = buildJourneyPayload(
      [
        { key: "aereo", values: quick },
        { key: "hospedagem", values: hotel },
      ],
      ctx,
    );
    expect(payload.service_key).toBe("aereo");
    expect(payload.destination).toBeTruthy();
    expect(payload.details.servicos_keys).toBe("aereo,hospedagem");
    expect(payload.details.origem).toBe("São Paulo");
    expect(payload.details.hospedagem_check_in).toBe("2026-10-01");
    expect(payload.summary).toContain("Hospedagem");
    expect(payload.summary.length).toBeLessThanOrEqual(2000);
  });
});