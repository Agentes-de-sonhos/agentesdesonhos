import { describe, it, expect } from "vitest";
import {
  buildServicePrefill,
  resolvePrefillDestination,
  splitDestinations,
} from "@/lib/serviceFormPrefill";

const start = new Date(2026, 5, 10);
const end = new Date(2026, 5, 20);
const ctx = { destination: "Orlando", startDate: start, endDate: end, adults: 2, children: 1 };

describe("pré-preenchimento dos serviços manuais", () => {
  it("separa múltiplos destinos", () => {
    expect(splitDestinations("Orlando, Miami e Nova York")).toEqual(["Orlando", "Miami", "Nova York"]);
    expect(splitDestinations("")).toEqual([]);
  });

  it("não sugere cidade quando há vários destinos e nenhum foi escolhido", () => {
    expect(resolvePrefillDestination("Orlando, Miami")).toBeNull();
    expect(resolvePrefillDestination("Orlando, Miami", "Miami")).toBe("Miami");
    const prefill = buildServicePrefill("hotel", { ...ctx, destination: "Orlando, Miami" });
    expect(prefill.city).toBeUndefined();
    expect(prefill.start_date).toBe(start);
  });

  it("aéreo recebe destino, datas e passageiros", () => {
    const p = buildServicePrefill("flight", ctx);
    expect(p.destination_city).toBe("Orlando");
    expect(p.start_date).toBe(start);
    expect(p.end_date).toBe(end);
    expect(p.adults).toBe(2);
    expect(p.children).toBe(1);
  });

  it("hotel recebe cidade e período", () => {
    const p = buildServicePrefill("hotel", ctx);
    expect(p.city).toBe("Orlando");
    expect(p.start_date).toBe(start);
  });

  it("carro recebe retirada e devolução no destino", () => {
    const p = buildServicePrefill("car_rental", ctx);
    expect(p.pickup_location).toBe("Orlando");
    expect(p.dropoff_location).toBe("Orlando");
  });

  it("transfer e ingressos recebem o local do destino", () => {
    expect(buildServicePrefill("transfer", ctx).location).toBe("Orlando");
    expect(buildServicePrefill("attraction", ctx).location).toBe("Orlando");
  });

  it("seguro recebe apenas período e passageiros", () => {
    const p = buildServicePrefill("insurance", ctx);
    expect(p.location).toBeUndefined();
    expect(p.city).toBeUndefined();
    expect(p.start_date).toBe(start);
    expect(p.adults).toBe(2);
  });

  it("outros tipos não inferem lugares", () => {
    const p = buildServicePrefill("other", ctx);
    expect(p.location).toBeUndefined();
    expect(p.city).toBeUndefined();
    expect(p.destination_city).toBeUndefined();
  });

  it("sem contexto não sugere nada", () => {
    const p = buildServicePrefill("hotel", { destination: null, startDate: null, endDate: null, adults: null, children: null });
    expect(p.city).toBeUndefined();
    expect(p.start_date).toBeUndefined();
    expect(p.adults).toBeUndefined();
  });
});
