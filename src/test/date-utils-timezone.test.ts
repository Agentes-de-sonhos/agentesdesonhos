import { describe, it, expect } from "vitest";
import { formatLocalDateBR, parseLocalDate } from "@/lib/dateUtils";

describe("datas sem desvio de fuso", () => {
  it("aniversário 1985-05-15 mostra 15/05/1985", () => {
    expect(formatLocalDateBR("1985-05-15")).toBe("15/05/1985");
  });
  it("virada de ano 2000-01-01 mostra 01/01/2000", () => {
    expect(formatLocalDateBR("2000-01-01")).toBe("01/01/2000");
  });
  it("dia local preservado", () => {
    expect(parseLocalDate("1990-12-31")!.getDate()).toBe(31);
  });
  it("vazio mostra traço", () => {
    expect(formatLocalDateBR(null)).toBe("—");
  });
});
