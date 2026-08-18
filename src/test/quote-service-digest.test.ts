import { describe, expect, it } from "vitest";
import {
  SHORT_DESCRIPTION_LIMIT,
  serviceCompactDigest,
  serviceDigestDateLines,
  serviceDigestLocation,
  serviceDigestQuantity,
  serviceDigestShortDescription,
  serviceDigestTitle,
} from "@/lib/quoteServiceDigest";

const svc = (service_type: string, service_data: any, extra: any = {}) =>
  ({ id: Math.random().toString(36).slice(2), service_type, service_data, amount: 100, ...extra }) as any;

const dates = (s: any) => serviceDigestDateLines(s).map((l) => `${l.label}: ${l.value}`);

describe("serviceDigestTitle — nome real acima de etiquetas", () => {
  it("hotel usa hotel_name mesmo com option_label e regime", () => {
    const s = svc(
      "hotel",
      { hotel_name: "Crest Hotel Suites Miami Beach", meal_plan: "breakfast", room_type: "standard", city: "Miami" },
      { option_label: "✨ + Vantagens" },
    );
    expect(serviceDigestTitle(s)).toBe("Crest Hotel Suites Miami Beach");
  });

  it("hotel ignora option_label 'Com ou sem café'", () => {
    const s = svc("hotel", { hotel_name: "Hotel Fasano" }, { option_label: "Com ou sem café" });
    expect(serviceDigestTitle(s)).toBe("Hotel Fasano");
  });

  it("duas opções distintas não herdam dados uma da outra", () => {
    const a = svc("hotel", { hotel_name: "Hotel A", city: "Miami" }, { option_label: "Opção 1" });
    const b = svc("hotel", {}, { option_label: "Opção 2" });
    expect(serviceDigestTitle(a)).toBe("Hotel A");
    expect(serviceDigestTitle(b)).toBe("Opção 2");
    expect(serviceDigestLocation(b)).toBeNull();
  });

  it("car_rental sem nome real usa 'Locação de SUV'", () => {
    expect(serviceDigestTitle(svc("car_rental", { car_type: "suv" }))).toBe("Locação de SUV");
    expect(serviceDigestTitle(svc("car_rental", { car_type: "suv", car_model: "Jeep Compass" }))).toBe(
      "Jeep Compass",
    );
  });

  it("usa nome real por tipo", () => {
    expect(serviceDigestTitle(svc("attraction", { product_name: "Universal Express" }))).toBe(
      "Universal Express",
    );
    expect(serviceDigestTitle(svc("cruise", { ship_name: "MSC Seaside" }))).toBe("MSC Seaside");
    expect(serviceDigestTitle(svc("circuit", { circuit_name: "Circuito Europa" }))).toBe("Circuito Europa");
    expect(serviceDigestTitle(svc("insurance", { provider: "Assist Card" }))).toBe("Assist Card");
    expect(serviceDigestTitle(svc("flight", { airline: "LATAM" }))).toBe("LATAM");
    expect(serviceDigestTitle(svc("transfer", { location: "Orlando" }))).toBe("Transfer em Orlando");
    expect(serviceDigestTitle(svc("rail_transport", { operator: "Trenitalia" }))).toBe("Trenitalia");
    expect(serviceDigestTitle(svc("other", { custom_title: "City tour" }))).toBe("City tour");
  });

  it("sem nenhum dado real cai no rótulo do tipo, sem inventar texto", () => {
    expect(serviceDigestTitle(svc("hotel", {}))).toBe("Hospedagem");
    const d = serviceCompactDigest(svc("hotel", {}));
    expect(d.location).toBeNull();
    expect(d.dateLines).toEqual([]);
    expect(d.quantity).toBeNull();
    expect(d.shortDescription).toBeNull();
    expect(d.images).toEqual([]);
  });
});

describe("datas completas por tipo", () => {
  it("flight ida e volta", () => {
    expect(dates(svc("flight", { departure_date: "2026-12-21", return_date: "2026-12-26" }))).toEqual([
      "Ida: 21/12/2026",
      "Volta: 26/12/2026",
    ]);
    expect(dates(svc("flight", { departure_date: "2026-12-21", return_date: "2026-12-26", is_one_way: true })))
      .toEqual(["Ida: 21/12/2026"]);
  });

  it("hotel check-in e check-out", () => {
    expect(dates(svc("hotel", { check_in: "2026-12-21", check_out: "2026-12-26" }))).toEqual([
      "Check-in: 21/12/2026",
      "Check-out: 26/12/2026",
    ]);
  });

  it("car_rental com horários", () => {
    expect(
      dates(
        svc("car_rental", {
          pickup_date: "2026-12-21",
          pickup_time: "10:00",
          dropoff_date: "2026-12-26",
          dropoff_time: "9:30",
        }),
      ),
    ).toEqual(["Retirada: 21/12/2026 às 10:00", "Devolução: 26/12/2026 às 09:30"]);
  });

  it("transfer com os dois trechos", () => {
    expect(
      dates(
        svc("transfer", {
          arrival_date: "2026-12-21",
          arrival_time: "14:00",
          departure_date: "2026-12-26",
          departure_time: "07:15",
        }),
      ),
    ).toEqual(["Chegada: 21/12/2026 às 14:00", "Retorno: 26/12/2026 às 07:15"]);
  });

  it("attraction, insurance, cruise, rail e other", () => {
    expect(dates(svc("attraction", { date: "2026-12-23" }))).toEqual(["Data: 23/12/2026"]);
    expect(dates(svc("insurance", { start_date: "2026-12-21", end_date: "2026-12-26" }))).toEqual([
      "Início: 21/12/2026",
      "Término: 26/12/2026",
    ]);
    expect(dates(svc("cruise", { start_date: "2026-12-21", end_date: "2026-12-26" }))).toEqual([
      "Embarque: 21/12/2026",
      "Desembarque: 26/12/2026",
    ]);
    expect(
      dates(svc("rail_transport", { travel_date: "2026-12-21", departure_time: "08:00", return_date: "2026-12-23", return_time: "18:00" })),
    ).toEqual(["Partida: 21/12/2026 às 08:00", "Retorno: 23/12/2026 às 18:00"]);
    expect(dates(svc("other", { start_date: "2026-12-21", end_date: "2026-12-26" }))).toEqual([
      "Início: 21/12/2026",
      "Término: 26/12/2026",
    ]);
    expect(dates(svc("other", { date: "2026-12-21" }))).toEqual(["Data: 21/12/2026"]);
  });

  it("data inválida não gera linha", () => {
    expect(dates(svc("hotel", { check_in: "2026-02-30", check_out: "" }))).toEqual([]);
  });
});

describe("localização e quantidade", () => {
  it("resolve por tipo", () => {
    expect(serviceDigestLocation(svc("hotel", { city: "Miami" }))).toBe("Miami");
    expect(serviceDigestLocation(svc("car_rental", { pickup_location: "Miami", dropoff_location: "Orlando" }))).toBe(
      "Miami → Orlando",
    );
    expect(serviceDigestLocation(svc("flight", { origin_city: "GRU", destination_city: "MIA" }))).toBe("GRU → MIA");
  });

  it("quantidades reais apenas", () => {
    expect(serviceDigestQuantity(svc("attraction", { quantity: 4 }))).toBe("4 ingressos");
    expect(serviceDigestQuantity(svc("hotel", { rooms: [{ quantity: 2 }], guests: 4 }))).toBe(
      "2 quartos · 4 hóspedes",
    );
    expect(serviceDigestQuantity(svc("car_rental", { quantity: 1 }))).toBe("1 veículo");
    expect(serviceDigestQuantity(svc("hotel", {}))).toBeNull();
  });
});

describe("descrição curta", () => {
  it("resume texto longo e remove HTML", () => {
    const long = `<p>${"Condições contratuais extensas do ingresso Universal. ".repeat(20)}</p>`;
    const out = serviceDigestShortDescription(svc("attraction", { description: long }))!;
    expect(out.length).toBeLessThanOrEqual(SHORT_DESCRIPTION_LIMIT + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("<p>");
  });

  it("mantém descrição curta intacta e ignora vazio", () => {
    expect(serviceDigestShortDescription(svc("hotel", { description: "Vista mar" }))).toBe("Vista mar");
    expect(serviceDigestShortDescription(svc("hotel", { description: "   " }))).toBeNull();
  });
});
