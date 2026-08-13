import { describe, it, expect } from "vitest";
import {
  buildHotelSearchQuery,
  classifyMatches,
  nameSimilarity,
  normalizeText,
  scoreCandidate,
  type PlaceCandidate,
} from "@/lib/hotelPlaceMatch";

const lodging = (over: Partial<PlaceCandidate>): PlaceCandidate => ({
  place_id: "p1",
  name: "Hotel Teste",
  formatted_address: "Rua 1, São Paulo, SP, Brasil",
  types: ["lodging", "point_of_interest"],
  ...over,
});

describe("normalização e similaridade", () => {
  it("remove acentos e pontuação", () => {
    expect(normalizeText("Transamérica – Comandatuba!")).toBe("transamerica comandatuba");
  });

  it("ignora sufixos comerciais na comparação", () => {
    expect(nameSimilarity("Copacabana Palace Hotel", "Belmond Copacabana Palace")).toBeGreaterThan(0.5);
    expect(nameSimilarity("Hotel Fasano Rio", "Pousada Recanto Verde")).toBeLessThan(0.3);
  });

  it("monta consulta com contexto disponível", () => {
    expect(buildHotelSearchQuery({ hotelName: "Fasano", city: "Rio de Janeiro", country: "Brasil" }))
      .toBe("Fasano, Rio de Janeiro, Brasil");
  });
});

describe("classificação de confiança", () => {
  it("aceita confiança alta em candidato único e coerente", () => {
    const res = classifyMatches(
      { hotelName: "Hotel Fasano Rio de Janeiro", city: "Rio de Janeiro", country: "Brasil" },
      [lodging({ name: "Hotel Fasano Rio de Janeiro", formatted_address: "Av. Vieira Souto, Rio de Janeiro, Brasil" })],
    );
    expect(res.confidence).toBe("high");
    expect(res.best?.candidate.place_id).toBe("p1");
  });

  it("exige revisão quando há dois candidatos parecidos", () => {
    const res = classifyMatches(
      { hotelName: "Hotel Praia Mar", city: "Santos", country: "Brasil" },
      [
        lodging({ place_id: "a", name: "Hotel Praia Mar", formatted_address: "Santos, Brasil" }),
        lodging({ place_id: "b", name: "Hotel Praia Mar", formatted_address: "Santos, Brasil" }),
      ],
    );
    expect(res.confidence).toBe("medium");
    expect(res.best).toBeNull();
  });

  it("nunca autoassocia quando a cidade conflita", () => {
    const res = classifyMatches(
      { hotelName: "Hotel Central", city: "Lisboa", country: "Portugal" },
      [lodging({ name: "Hotel Central", formatted_address: "Curitiba, PR, Brasil" })],
    );
    expect(res.best).toBeNull();
    expect(res.ranked[0].hasLocalityConflict).toBe(true);
  });

  it("penaliza resultados que não são hospedagem", () => {
    const score = scoreCandidate(
      { hotelName: "Hotel Sol", city: "Recife" },
      lodging({ name: "Hotel Sol", types: ["restaurant"], formatted_address: "Recife, Brasil" }),
    );
    expect(score.isLodging).toBe(false);
    expect(score.score).toBeLessThan(0.8);
  });

  it("retorna baixa confiança sem candidatos", () => {
    expect(classifyMatches({ hotelName: "Qualquer" }, []).confidence).toBe("low");
  });
});