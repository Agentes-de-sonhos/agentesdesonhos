import { describe, expect, it } from "vitest";
import {
  applyContextToService, buildJourneyPayload, contextFromService, eligibleComplements,
  emptyRouteLegs, emptyTripContext, formatChildAges, rebuildContext, syncChildAges, totalTravelers,
  validateChildAges, validateRouteLegs, applyRouteToContext, type RouteLeg,
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
  it("não repete no modal o que já veio preenchido na cotação rápida", () => {
    const names = formFields(aereo, { isPrimary: true, values: quick }).map((f) => f.name);
    for (const field of quickQuoteFields(aereo, 5)) expect(names).not.toContain(field.name);
    expect(names).toContain("adultos");
  });

  it("expõe no modal os campos iniciais que faltam (CTA externo sem cotação rápida)", () => {
    const names = formFields(aereo, { isPrimary: true, values: initialServiceValues(aereo) }).map((f) => f.name);
    expect(names).toContain("origem");
    expect(names).toContain("destino");
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
describe("rota multidestinos e idades obrigatórias", () => {
  it("exige ao menos 2 destinos com data e ordem crescente", () => {
    expect(validateRouteLegs("", emptyRouteLegs()).origem).toBeTruthy();
    const ok: RouteLeg[] = [
      { destino: "Lisboa", data: "2026-10-01" },
      { destino: "Madri", data: "2026-10-06" },
    ];
    expect(validateRouteLegs("São Paulo", ok)).toEqual({});
    const invertido = [ok[0], { destino: "Madri", data: "2026-09-20" }];
    expect(validateRouteLegs("São Paulo", invertido).leg_1_data).toBeTruthy();
    expect(validateRouteLegs("São Paulo", [ok[0], { destino: "", data: "" }]).rota).toBeTruthy();
  });

  it("deriva destino e datas do contexto a partir da rota", () => {
    const ctx = applyRouteToContext(emptyTripContext(), "São Paulo", [
      { destino: "Lisboa", data: "2026-10-01" },
      { destino: "Madri", data: "2026-10-06" },
    ]);
    expect(ctx.destino).toBe("Madri");
    expect(ctx.data_inicio).toBe("2026-10-01");
    expect(ctx.data_fim).toBe("2026-10-06");
  });

  it("idade de cada criança é obrigatória e válida", () => {
    expect(validateChildAges([], 2).child_age_0).toBeTruthy();
    expect(validateChildAges(["5", "22"], 2).child_age_1).toBeTruthy();
    expect(validateChildAges(["5", "7"], 2)).toEqual({});
  });

  it("remover serviço recalcula o contexto somente com o que restou", () => {
    const ctx = contextFromService("aereo", quick, emptyTripContext());
    const rebuilt = rebuildContext([{ key: "hospedagem", values: { destino: "Porto", check_in: "2026-11-02", check_out: "2026-11-08" } }], ctx);
    expect(rebuilt.destino).toBe("Porto");
    expect(rebuilt.adultos).toBe(ctx.adultos);
  });

  it("idades_criancas contém somente idades legíveis", () => {
    const value = formatChildAges(["0", "5", "12"]);
    expect(value).not.toMatch(/adulto|criança/i);
    expect(value).toContain("Menos de 1 ano");
    expect(value).toContain("5 anos");
    expect(value).toContain("12 anos");
  });

  it("remover aéreo multidestinos zera a rota e usa dados do hotel", () => {
    let ctx = contextFromService(
      "aereo",
      { ...initialServiceValues(aereo), tipo_viagem: "Multidestinos", origem: "São Paulo" },
      emptyTripContext(),
    );
    ctx = applyRouteToContext(ctx, "São Paulo", [
      { destino: "Lisboa", data: "2026-10-01" },
      { destino: "Madri", data: "2026-10-06" },
    ]);
    expect(ctx.rota.length).toBe(2);
    const rebuilt = rebuildContext(
      [{ key: "hospedagem", values: { destino: "Porto", check_in: "2026-11-02", check_out: "2026-11-08" } }],
      ctx,
    );
    expect(rebuilt.rota).toEqual([]);
    expect(rebuilt.destino).toBe("Porto");
    expect(rebuilt.data_inicio).toBe("2026-11-02");
    expect(rebuilt.data_fim).toBe("2026-11-08");
  });

  it("mantém a rota quando o aéreo multidestinos permanece", () => {
    let ctx = contextFromService(
      "aereo",
      { ...initialServiceValues(aereo), tipo_viagem: "Multidestinos", origem: "São Paulo" },
      emptyTripContext(),
    );
    ctx = applyRouteToContext(ctx, "São Paulo", [
      { destino: "Lisboa", data: "2026-10-01" },
      { destino: "Madri", data: "2026-10-06" },
    ]);
    const rebuilt = rebuildContext(
      [{ key: "aereo", values: { ...initialServiceValues(aereo), tipo_viagem: "Multidestinos", origem: "São Paulo" } }],
      ctx,
    );
    expect(rebuilt.rota.length).toBe(2);
    expect(rebuilt.destino).toBe("Madri");
  });
});
