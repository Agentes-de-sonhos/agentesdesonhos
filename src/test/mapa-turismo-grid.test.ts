import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const src = readFileSync("src/components/dashboard/start/MapaTurismoCard.tsx", "utf8");

describe("MapaTurismoCard layout", () => {
  it("uses a container query with a 10-column grid on large containers", () => {
    expect(src).toContain("@container");
    expect(src).toContain("@[62rem]:grid");
    expect(src).toContain("@[62rem]:grid-cols-10");
  });

  it("buttons grow proportionally with a capped width", () => {
    expect(src).toContain("@[62rem]:w-full");
    expect(src).toContain("@[62rem]:aspect-square");
    expect(src).toMatch(/@\[62rem\]:max-w-\[1(3[2-9]|4[0-4])px\]/);
  });

  it("centers and distributes the set without visible scrollbar", () => {
    expect(src).toContain("@[62rem]:mx-auto");
    expect(src).toContain("@[62rem]:justify-items-center");
    expect(src).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("keeps the carousel for smaller widths and hides arrows when nothing is scrollable", () => {
    expect(src).toContain("overflow-x-auto");
    expect(src).toContain("canScrollLeft &&");
    expect(src).toContain("canScrollRight &&");
    expect((src.match(/@\[62rem\]:!hidden/g) ?? []).length).toBe(2);
  });

  it("preserves the 10 services", () => {
    ["Operadoras", "Consolidadoras", "Cias Aéreas", "Hospedagem", "Locadoras", "Cruzeiros", "Seguros", "Parques", "Receptivos", "Guias"].forEach((t) => {
      expect(src).toContain(`title: "${t}"`);
    });
  });
});
