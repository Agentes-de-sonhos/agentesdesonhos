import { describe, it, expect } from "vitest";
import {
  IMPORT_FORBIDDEN_QUOTE_FIELDS,
  buildQuoteDuplicatePayload,
  hasEnoughItineraryContent,
  importedItemToServiceRow,
  itineraryToImportText,
  normalizeImportedItems,
  searchItinerarySources,
  searchQuoteSources,
} from "@/lib/quoteImportSources";

const quotes = [
  { id: "q1", client_name: "Ana Souza", destination: "Paris", start_date: "2026-05-01", end_date: "2026-05-10" },
  { id: "q2", client_name: "Bruno", destination: "São Paulo", start_date: null, end_date: null },
];

describe("busca de origens", () => {
  it("filtra por cliente e destino ignorando acentos e caixa", () => {
    expect(searchQuoteSources(quotes, "ana").map((q) => q.id)).toEqual(["q1"]);
    expect(searchQuoteSources(quotes, "sao paulo").map((q) => q.id)).toEqual(["q2"]);
    expect(searchQuoteSources(quotes, "")).toHaveLength(2);
  });

  it("respeita o limite e opera apenas sobre a lista recebida (RLS na origem)", () => {
    expect(searchQuoteSources(quotes, "", 1)).toHaveLength(1);
    expect(searchItinerarySources([{ id: "i1", destination: "Roma", clientName: "Ju" }], "roma")).toHaveLength(1);
    expect(searchItinerarySources([], "roma")).toHaveLength(0);
  });
});

describe("duplicação sem identificadores", () => {
  const source = {
    id: "q1",
    user_id: "u-outro",
    share_token: "tok",
    public_access_code: "ABC",
    created_at: "2025-01-01",
    updated_at: "2025-01-02",
    opportunity_id: "op1",
    payment_terms: "50% entrada",
    destination_intro_images: ["a.jpg"],
    total_amount: 5000,
  };
  const overrides = {
    client_id: "c9",
    client_name: "Novo Cliente",
    destination: "Lisboa",
    start_date: "2026-09-01",
    end_date: "2026-09-08",
    adults_count: 2,
    children_count: 1,
  };

  it("não copia identificadores, token, auditoria nem vínculos técnicos", () => {
    const payload = buildQuoteDuplicatePayload(source, overrides);
    for (const field of IMPORT_FORBIDDEN_QUOTE_FIELDS) {
      if (field === "status") continue;
      expect(payload).not.toHaveProperty(field);
    }
    expect(payload.status).toBe("draft");
  });

  it("aplica os dados revisados e reaproveita o conteúdo", () => {
    const payload = buildQuoteDuplicatePayload(source, overrides);
    expect(payload.client_id).toBe("c9");
    expect(payload.destination).toBe("Lisboa");
    expect(payload.start_date).toBe("2026-09-01");
    expect(payload.adults_count).toBe(2);
    expect(payload.payment_terms).toBe("50% entrada");
    expect(payload.destination_intro_images).toEqual(["a.jpg"]);
    expect(payload.total_amount).toBe(5000);
  });
});

describe("roteiro → texto e itens", () => {
  const itinerary = {
    destination: "Roma",
    startDate: "2026-04-01",
    endDate: "2026-04-05",
    travelersCount: 2,
    days: [
      { dayNumber: 1, date: "2026-04-01", activities: [{ period: "manha", title: "Coliseu", location: "Roma" }] },
      { dayNumber: 2, activities: [{ title: "" }] },
    ],
  };

  it("exige conteúdo mínimo antes de chamar a IA", () => {
    expect(hasEnoughItineraryContent(itinerary)).toBe(true);
    expect(hasEnoughItineraryContent({ days: [{ activities: [{ title: "  " }] }] })).toBe(false);
    expect(hasEnoughItineraryContent(null)).toBe(false);
  });

  it("serializa somente conteúdo descritivo", () => {
    const text = itineraryToImportText(itinerary);
    expect(text).toContain("Destino: Roma");
    expect(text).toContain("Manhã — Coliseu");
    expect(text).not.toContain("Dia 2");
  });

  it("normaliza blocos da IA e mapeia tipos desconhecidos para 'other'", () => {
    const items = normalizeImportedItems([
      { id: "b1", type: "hotel", label: "Hotel Roma", data: { total_price: 1200, description: "5 noites" } },
      { id: "b2", type: "spaceship", data: { name: "Item estranho" } },
      { id: "b3", type: "flight", data: {} },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ service_type: "hotel", title: "Hotel Roma", amount: 1200 });
    expect(items[1].service_type).toBe("other");
  });

  it("converte item aprovado em linha de serviço sem identificadores externos", () => {
    const [item] = normalizeImportedItems([{ id: "b1", type: "hotel", label: "Hotel Roma", data: { amount: 900 } }]);
    const row = importedItemToServiceRow(item, "new-quote", 0);
    expect(row).toMatchObject({ quote_id: "new-quote", service_type: "hotel", amount: 900, order_index: 0 });
    expect(row.service_data.title).toBe("Hotel Roma");
    expect(row).not.toHaveProperty("id");
  });
});
