import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractParsedHotels, sortHotelsChronologically, hotelHasUsefulData } from "@/lib/hotelImportList";

const EDGE = readFileSync(
  join(process.cwd(), "supabase/functions/import-hotel-document/index.ts"),
  "utf8",
);

describe("importação de hospedagem — múltiplos hotéis", () => {
  it("mantém compatibilidade com resposta singular antiga", () => {
    const body = { success: true, data: { nome_hotel: "Hotel Sol", cidade: "Recife", check_in: "2026-05-01" } };
    const list = extractParsedHotels(body);
    expect(list).toHaveLength(1);
    expect(list[0].nome_hotel).toBe("Hotel Sol");
  });

  it("lê todos os hotéis de uma resposta em lista", () => {
    const body = {
      success: true,
      hotels: [
        { nome_hotel: "Hotel A", check_in: "2026-05-10" },
        { nome_hotel: "Hotel B", check_in: "2026-05-03" },
        { nome_hotel: "Hotel C", cidade: "Lisboa" },
      ],
    };
    const list = extractParsedHotels(body);
    expect(list.map((h) => h.nome_hotel)).toEqual(["Hotel B", "Hotel A", "Hotel C"]);
  });

  it("aceita o array em hospedagens dentro de data", () => {
    const body = { success: true, data: { hospedagens: [{ nome_hotel: "X" }, { nome_hotel: "Y" }] } };
    expect(extractParsedHotels(body)).toHaveLength(2);
  });

  it("descarta itens sem dados úteis sem perder os válidos", () => {
    const body = { success: true, hotels: [{ nome_hotel: "Válido" }, {}, { observacoes: ["nada"] }] };
    const list = extractParsedHotels(body);
    expect(list).toHaveLength(1);
    expect(list[0].nome_hotel).toBe("Válido");
  });

  it("usa partial_data quando não há sucesso", () => {
    const body = { success: false, partial_data: { cidade: "Roma" } };
    expect(extractParsedHotels(body)).toHaveLength(1);
    expect(extractParsedHotels({ success: false, partial_data: {} })).toHaveLength(0);
  });

  it("ordena cronologicamente e preserva a ordem de itens sem data", () => {
    const sorted = sortHotelsChronologically([
      { nome_hotel: "sem data 1" },
      { nome_hotel: "B", check_in: "2026-02-01" },
      { nome_hotel: "sem data 2" },
      { nome_hotel: "A", check_in: "2026-01-01" },
    ]);
    expect(sorted.map((h) => h.nome_hotel)).toEqual(["A", "B", "sem data 1", "sem data 2"]);
  });

  it("valida dados úteis por hotel", () => {
    expect(hotelHasUsefulData({ valor_total: 0 })).toBe(true);
    expect(hotelHasUsefulData({ observacoes: ["x"] })).toBe(false);
    expect(hotelHasUsefulData(null)).toBe(false);
  });
});

describe("edge function import-hotel-document", () => {
  it("declara o array hospedagens no schema da ferramenta", () => {
    expect(EDGE).toContain("hospedagens: {");
    expect(EDGE).toContain('required: ["hospedagens"]');
    expect(EDGE).toContain("HOTEL_ITEM_SCHEMA");
  });

  it("faz apenas UMA chamada de IA", () => {
    const calls = EDGE.match(/ai\.gateway\.lovable\.dev/g) || [];
    expect(calls).toHaveLength(1);
  });

  it("retorna a lista e mantém o campo singular data", () => {
    expect(EDGE).toContain("hotels_count");
    expect(EDGE).toContain("data: first");
  });

  it("não consulta Google Places nem fotos durante a leitura", () => {
    expect(EDGE).not.toMatch(/places-autocomplete|hotel-photos|maps\.googleapis/);
  });
});
