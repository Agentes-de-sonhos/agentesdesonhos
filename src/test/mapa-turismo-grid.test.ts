import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const src = readFileSync("src/components/dashboard/start/MapaTurismoCard.tsx", "utf8");

describe("MapaTurismoCard layout", () => {
  it("activates the 10-column grid only on large containers (>= 72rem)", () => {
    expect(src).toContain("@container");
    expect(src).toContain("@[72rem]:grid");
    expect(src).toContain("@[72rem]:grid-cols-10");
    expect(src).not.toContain("@[62rem]:");
  });

  it("overrides the fixed button sizes inside the grid", () => {
    expect(src).toContain("@[72rem]:!w-full");
    expect(src).toContain("@[72rem]:!h-auto");
    expect(src).toContain("@[72rem]:aspect-square");
    expect(src).toContain("@[72rem]:max-w-[132px]");
    expect(src).toContain("@[72rem]:min-w-[104px]");
  });

  it("centers the set with a limited inner width and fluid gap", () => {
    expect(src).toContain("@[72rem]:mx-auto");
    expect(src).toContain("@[72rem]:justify-items-center");
    expect(src).toMatch(/@\[72rem\]:max-w-\[14(0[0-9]|1[0-9]|20)px\]/);
    expect(src).toContain("@[72rem]:gap-[clamp(8px,1vw,14px)]");
    expect(src).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("keeps the carousel for smaller widths and hides arrows when nothing is scrollable", () => {
    expect(src).toContain("overflow-x-auto");
    expect(src).toContain("canScrollLeft &&");
    expect(src).toContain("canScrollRight &&");
    expect((src.match(/@\[72rem\]:!hidden/g) ?? []).length).toBe(2);
    expect(src).toContain("@[72rem]:!overflow-visible");
    expect(src).toContain("@[72rem]:!px-0");
  });

  it("preserves the 10 services", () => {
    ["Operadoras", "Consolidadoras", "Cias Aéreas", "Hospedagem", "Locadoras", "Cruzeiros", "Seguros", "Parques", "Receptivos", "Guias"].forEach((t) => {
      expect(src).toContain(`title: "${t}"`);
    });
  });
});
