import { describe, expect, it } from "vitest";
import {
  buildDetailsPayload, initialServiceValues, normalizeServiceQuantities, serviceByKey,
  validateServiceStep, REQUEST_SERVICES,
} from "@/lib/agencySiteRequests";
import { extraOccurrence, inheritedOccurrence } from "@/lib/agencyJourneyOccurrences";
import { emptyTripContext, syncChildAges } from "@/lib/agencyQuoteJourney";

const hospedagem = serviceByKey("hospedagem");
const cruzeiros = serviceByKey("cruzeiros");

describe("defaults de quantidade em NOVAS solicitações", () => {
  it("inicia com 2 adultos e 0 crianças (nunca vazio) em todos os serviços", () => {
    for (const service of REQUEST_SERVICES) {
      const values = initialServiceValues(service);
      if ("adultos" in values) expect(values.adultos).toBe("2");
      if ("criancas" in values) expect(values.criancas).toBe("0");
    }
  });

  it("hospedagem inicia com 1 quarto e cruzeiro com 1 cabine", () => {
    expect(initialServiceValues(hospedagem).quartos).toBe("1");
    expect(initialServiceValues(cruzeiros).cabines).toBe("1");
  });

  it("durações e campos opcionais não recebem valores artificiais", () => {
    expect(initialServiceValues(cruzeiros).duracao).toBe("");
    expect(initialServiceValues(serviceByKey("ingressos")).dias).toBe("");
    expect(initialServiceValues(serviceByKey("aereo")).flexibilidade).toBe("");
    expect(initialServiceValues(serviceByKey("aereo")).observacoes).toBe("");
  });

  it("primeiro item herdado e segundo período são independentes, cada um com 1 quarto", () => {
    const ctx = { ...emptyTripContext(), destino: "Lisboa", adultos: 3, criancas: 2, idades_criancas: ["4", "7"] };
    const first = inheritedOccurrence(hospedagem, ctx);
    const second = extraOccurrence(hospedagem, ctx);
    expect(first.values.quartos).toBe("1");
    expect(second.values.quartos).toBe("1");
    expect(second.id).not.toBe(first.id);
    expect(second.values.adultos).toBe("3");
    expect(second.values.criancas).toBe("2");
    // Estado independente: alterar um não afeta o outro.
    second.values.quartos = "3";
    expect(first.values.quartos).toBe("1");
  });

  it("crianças = 0 é herdado como 0, sem idades residuais", () => {
    const occ = extraOccurrence(hospedagem, emptyTripContext());
    expect(occ.values.criancas).toBe("0");
    expect(occ.values.idades_criancas).toBe("");
  });
});

describe("normalização e validação numérica", () => {
  it("nunca produz NaN, vazio ou valor abaixo do mínimo", () => {
    const values = { ...initialServiceValues(hospedagem), quartos: "", adultos: "abc", criancas: "" };
    const normalized = normalizeServiceQuantities(hospedagem, values);
    expect(normalized.quartos).toBe("1");
    expect(normalized.adultos).toBe("2");
    expect(normalized.criancas).toBe("0");
  });

  it("quartos não pode ficar abaixo de 1", () => {
    expect(normalizeServiceQuantities(hospedagem, { ...initialServiceValues(hospedagem), quartos: "0" }).quartos).toBe("1");
    expect(normalizeServiceQuantities(cruzeiros, { ...initialServiceValues(cruzeiros), cabines: "-4" }).cabines).toBe("1");
    const errors = validateServiceStep(hospedagem, {
      ...initialServiceValues(hospedagem), destino: "Lisboa", check_in: "2026-10-01", check_out: "2026-10-05", quartos: "0",
    });
    expect(errors.quartos).toBeTruthy();
  });

  it("crianças = 0 remove as idades do payload e mantém o zero", () => {
    const payload = buildDetailsPayload(hospedagem, {
      ...initialServiceValues(hospedagem), destino: "Lisboa", criancas: "0", idades_criancas: "4 anos",
    });
    expect(payload.criancas).toBe("0");
    expect(payload.idades_criancas).toBeUndefined();
  });

  it("payload final não contém valores numéricos inválidos", () => {
    const payload = buildDetailsPayload(hospedagem, {
      ...initialServiceValues(hospedagem), destino: "Lisboa", quartos: "", adultos: "", cabines: "x",
    });
    for (const key of ["adultos", "criancas", "quartos"]) {
      expect(payload[key]).toMatch(/^\d+$/);
    }
    expect(Number(payload.quartos)).toBeGreaterThanOrEqual(1);
  });

  it("alterar crianças cria e remove as idades correspondentes", () => {
    expect(syncChildAges([], 2)).toEqual(["", ""]);
    expect(syncChildAges(["4", "7", "9"], 2)).toEqual(["4", "7"]);
    expect(syncChildAges(["4"], 0)).toEqual([]);
  });

  it("não sobrescreve quantidades já informadas pelo usuário", () => {
    const normalized = normalizeServiceQuantities(hospedagem, {
      ...initialServiceValues(hospedagem), quartos: "4", adultos: "5", criancas: "3",
    });
    expect(normalized.quartos).toBe("4");
    expect(normalized.adultos).toBe("5");
    expect(normalized.criancas).toBe("3");
  });
});
