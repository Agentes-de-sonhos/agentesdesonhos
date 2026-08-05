import { describe, it, expect } from "vitest";
import {
  normalizeCruiseItinerary,
  cruiseStopTitle,
  cruiseStopTypeLabel,
} from "@/lib/cruiseItinerary";

describe("normalizeCruiseItinerary", () => {
  it("returns empty list for missing/invalid input", () => {
    expect(normalizeCruiseItinerary(undefined)).toEqual([]);
    expect(normalizeCruiseItinerary(null)).toEqual([]);
    expect(normalizeCruiseItinerary("x")).toEqual([]);
    expect(normalizeCruiseItinerary([])).toEqual([]);
  });

  it("ignores malformed items but keeps valid ones in order", () => {
    const stops = normalizeCruiseItinerary([
      null,
      { port: "Santos", stop_type: "embarque", date: "2026-01-10" },
      {},
      "bad",
      { port: "Rio de Janeiro", stop_type: "porto" },
      { stop_type: "navegacao" },
      { port: "Barcelona", stop_type: "desembarque" },
    ]);
    expect(stops.map((s) => s.port)).toEqual(["Santos", "Rio de Janeiro", null, "Barcelona"]);
  });

  it("trims empty strings to null so no placeholders are shown", () => {
    const [stop] = normalizeCruiseItinerary([
      { port: "Tenerife", date: "  ", arrival_time: "", departure_time: "18:00", notes: " " },
    ]);
    expect(stop.date).toBeNull();
    expect(stop.arrivalTime).toBeNull();
    expect(stop.departureTime).toBe("18:00");
    expect(stop.note).toBeNull();
  });

  it("does not duplicate identical notes and description", () => {
    const [same] = normalizeCruiseItinerary([{ port: "Málaga", notes: "Dia livre", description: "Dia livre" }]);
    expect(same.note).toBe("Dia livre");
    const [both] = normalizeCruiseItinerary([{ port: "Alicante", notes: "A", description: "B" }]);
    expect(both.note).toBe("A\nB");
  });

  it("falls back to Navegação when at sea without port", () => {
    const [sea] = normalizeCruiseItinerary([{ stop_type: "navegacao" }]);
    expect(cruiseStopTitle(sea)).toBe("Navegação");
    const [port] = normalizeCruiseItinerary([{ port: "Casablanca", stop_type: "porto" }]);
    expect(cruiseStopTitle(port)).toBe("Casablanca");
  });

  it("maps friendly stop type labels", () => {
    expect(cruiseStopTypeLabel("embarque")).toBe("Embarque");
    expect(cruiseStopTypeLabel("porto")).toBe("Porto / Parada");
    expect(cruiseStopTypeLabel("desembarque")).toBe("Desembarque");
    expect(cruiseStopTypeLabel("outro")).toBeNull();
    expect(cruiseStopTypeLabel(undefined)).toBeNull();
  });
});
