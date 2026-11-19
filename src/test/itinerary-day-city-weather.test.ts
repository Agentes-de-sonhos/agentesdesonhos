import { describe, it, expect } from "vitest";
import { dayWeatherCity } from "@/hooks/useTripWeather";

describe("cidade do dia na previsão", () => {
  it("usa a cidade do dia quando preenchida", () => {
    expect(dayWeatherCity("Cartagena", "Bogotá")).toBe("Cartagena");
  });
  it("usa o destino do roteiro quando o dia está em branco", () => {
    expect(dayWeatherCity("  ", "Bogotá")).toBe("Bogotá");
    expect(dayWeatherCity(null, "Colômbia")).toBe("Colômbia");
  });
});
