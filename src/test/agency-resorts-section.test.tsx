import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AgencyResortsSection } from "@/components/resorts-brasil/AgencyResortsSection";
import { BRAZIL_RESORTS } from "@/components/resorts-brasil/resortsData";
import { REGION_OF } from "@/components/resorts-brasil/BrazilResortsMap";
import { applyCuration, initialSelection, toCuration } from "@/lib/resortCuration";

const props = { allHref: "/resorts-brasil", resortHref: (s: string) => `/resorts-brasil/${s}` };

describe("AgencyResortsSection", () => {
  it("abre neutro, sem estado selecionado, com 6 destaques variados", () => {
    render(<AgencyResortsSection {...props} />);
    expect(screen.getByText("Destaques pelo Brasil")).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBe(6);
    expect(screen.getByRole("button", { name: /^Bahia, / }).getAttribute("aria-pressed")).toBe("false");
  });

  it("filtra ao clicar no estado e desmarca no segundo clique", () => {
    render(<AgencyResortsSection {...props} />);
    const al = screen.getByRole("button", { name: /^Alagoas, 7 resorts/ });
    fireEvent.click(al);
    expect(screen.getByText(/mostrando 6 de 7/)).toBeTruthy();
    fireEvent.click(al);
    expect(screen.getByText("Destaques pelo Brasil")).toBeTruthy();
  });

  it("mostra os destaques da agência e oculta os escondidos nos contadores", () => {
    const al = BRAZIL_RESORTS.filter((r) => r.uf === "AL");
    const curation = toCuration([
      { resort_slug: al[0].slug, is_featured: false, is_hidden: true, display_order: null },
      { resort_slug: al[1].slug, is_featured: true, is_hidden: false, display_order: 1 },
    ]);
    render(<AgencyResortsSection {...props} curation={curation} agencyName="Teste" />);
    expect(screen.getByText("Seleção da Teste")).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBe(1);
    expect(screen.getByRole("button", { name: /^Alagoas, 6 resorts/ })).toBeTruthy();
  });
});

describe("resortCuration", () => {
  it("sem destaques, sorteia um resort de cada região antes de repetir", () => {
    const visible = applyCuration(BRAZIL_RESORTS, toCuration([]));
    const { resorts, curated } = initialSelection(visible, toCuration([]), REGION_OF, 6);
    expect(curated).toBe(false);
    const regions = new Set(BRAZIL_RESORTS.map((r) => REGION_OF[r.uf]));
    const first = resorts.slice(0, regions.size).map((r) => REGION_OF[r.uf]);
    expect(new Set(first).size).toBe(regions.size);
  });
  it("destaque oculto não aparece", () => {
    const c = toCuration([{ resort_slug: "clubmed", is_featured: true, is_hidden: true, display_order: 1 }]);
    expect(c.featured).toEqual([]);
    expect(applyCuration(BRAZIL_RESORTS, c).some((r) => r.slug === "clubmed")).toBe(false);
  });
});
