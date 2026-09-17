import { describe, expect, it } from "vitest";
import { buildJourneyPayload, emptyTripContext } from "@/lib/agencyQuoteJourney";
import { initialServiceValues, serviceByKey } from "@/lib/agencySiteRequests";
import { clientNotes, opportunityFieldsFromRequest } from "@/lib/agencyLeadOpportunity";

const values = (key: string, extra: Record<string, string>) => ({
  ...initialServiceValues(serviceByKey(key)),
  ...extra,
});

describe("mapeamento solicitação Sites ADS → oportunidade", () => {
  it("hospedagem: datas, viajantes e somente observações do cliente", () => {
    const payload = buildJourneyPayload(
      [{ key: "hospedagem", values: values("hospedagem", { destino: "Ipojuca, Pernambuco, Brazil", check_in: "2026-10-18", check_out: "2026-10-25", observacoes: "TESTE" }) }],
      { ...emptyTripContext(), destino: "Ipojuca, Pernambuco, Brazil", data_inicio: "2026-10-18", data_fim: "2026-10-25", adultos: 2, criancas: 0 },
    );
    const fields = opportunityFieldsFromRequest({ destination: payload.destination, details: payload.details, notes: "TESTE" });
    expect(fields).toMatchObject({
      destination: "Ipojuca, Pernambuco, Brazil",
      start_date: "2026-10-18",
      end_date: "2026-10-25",
      adults_count: 2,
      children_count: 0,
      passengers_count: 2,
    });
    expect(fields.notes).toBe("Observações — Hospedagem: TESTE\nObservações — Checkout: TESTE");
    expect(fields.notes).not.toMatch(/Ipojuca|Serviço:|white label|2026-10-18/);
  });

  it("aéreo: usa data_ida/data_volta quando não há contexto e conta crianças", () => {
    const payload = buildJourneyPayload(
      [{ key: "aereo", values: values("aereo", { origem: "REC", destino: "LIS", data_ida: "2026-11-02", data_volta: "2026-11-12", adultos: "2", criancas: "2", observacoes: "assentos juntos" }) }],
      emptyTripContext(),
    );
    delete payload.details.ctx_data_inicio;
    delete payload.details.ctx_data_fim;
    delete payload.details.ctx_adultos;
    delete payload.details.ctx_criancas;
    const fields = opportunityFieldsFromRequest({ destination: "", details: payload.details, notes: null });
    expect(fields.start_date).toBe("2026-11-02");
    expect(fields.end_date).toBe("2026-11-12");
    expect(fields.adults_count).toBe(2);
    expect(fields.children_count).toBe(2);
    expect(fields.passengers_count).toBe(4);
    expect(fields.notes).toBe("Observações — Aéreo: assentos juntos");
  });

  it("carro: retirada/devolução mapeiam início e fim", () => {
    const payload = buildJourneyPayload(
      [{ key: "carro", values: values("carro", { retirada_local: "GRU", retirada_data: "2026-12-01", devolucao_data: "2026-12-08" }) }],
      emptyTripContext(),
    );
    delete payload.details.ctx_data_inicio;
    delete payload.details.ctx_data_fim;
    const fields = opportunityFieldsFromRequest({ destination: "São Paulo", details: payload.details, notes: "" });
    expect(fields.start_date).toBe("2026-12-01");
    expect(fields.end_date).toBe("2026-12-08");
    expect(fields.notes).toBeNull();
  });

  it("ingressos com data única mantém fim nulo", () => {
    const payload = buildJourneyPayload(
      [{ key: "ingressos", values: values("ingressos", { destino: "Orlando", data: "2027-01-05" }) }],
      emptyTripContext(),
    );
    delete payload.details.ctx_data_inicio;
    delete payload.details.ctx_data_fim;
    const fields = opportunityFieldsFromRequest({ destination: "Orlando", details: payload.details, notes: null });
    expect(fields.start_date).toBe("2027-01-05");
    expect(fields.end_date).toBeNull();
  });

  it("múltiplos serviços e ocorrências: um rótulo humano por observação", () => {
    const payload = buildJourneyPayload(
      [
        { key: "hospedagem", values: values("hospedagem", { destino: "Roma", check_in: "2026-10-01", check_out: "2026-10-05", observacoes: "quarto alto" }) },
        { key: "hospedagem", values: values("hospedagem", { destino: "Florença", check_in: "2026-10-05", check_out: "2026-10-08", observacoes: "vista para a cidade" }) },
        { key: "transfer", values: values("transfer", { destino: "Roma", data: "2026-10-01", observacoes: "cadeirinha para criança" }) },
      ],
      { ...emptyTripContext(), destino: "Itália", data_inicio: "2026-10-01", data_fim: "2026-10-08", adultos: 3, criancas: 1, idades_criancas: ["6"] },
    );
    const fields = opportunityFieldsFromRequest({ destination: payload.destination, details: payload.details, notes: "prefiro contato à noite" });
    expect(fields.passengers_count).toBe(4);
    expect(fields.notes?.split("\n")).toEqual([
      "Observações — Hospedagem: quarto alto",
      "Observações — Hospedagem 2: vista para a cidade",
      "Observações — Transfer: cadeirinha para criança",
      "Observações — Checkout: prefiro contato à noite",
    ]);
  });

  it("observações idênticas de fontes diferentes são preservadas", () => {
    const notes = clientNotes(
      { servicos: "Hospedagem, Seguro Viagem", servicos_keys: "hospedagem,seguro", observacoes: "TESTE", seguro_observacoes: "TESTE" },
      "TESTE",
    );
    expect(notes?.split("\n")).toEqual([
      "Observações — Hospedagem: TESTE",
      "Observações — Seguro Viagem: TESTE",
      "Observações — Checkout: TESTE",
    ]);
  });

  it("sem nenhuma observação, notes fica vazio (sem texto automático)", () => {
    const payload = buildJourneyPayload(
      [{ key: "cruzeiros", values: values("cruzeiros", { destino: "Caribe", data: "2027-02-10" }) }],
      { ...emptyTripContext(), destino: "Caribe", data_inicio: "2027-02-10", data_fim: "2027-02-17" },
    );
    const fields = opportunityFieldsFromRequest({ destination: payload.destination, details: payload.details, notes: "   " });
    expect(fields.notes).toBeNull();
  });

  it("cobre chaves de observação de todos os serviços atuais", () => {
    for (const key of ["aereo", "hospedagem", "carro", "transfer", "ingressos", "seguro", "cruzeiros", "pacotes"]) {
      const notes = clientNotes(
        { servicos_keys: `hospedagem,${key}`, [`${key}_observacoes`]: "detalhe" },
        null,
      );
      expect(notes).toContain(": detalhe");
    }
  });
});
