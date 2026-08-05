import { describe, it, expect } from "vitest";
import {
  buildQuoteSectionLayout,
  visibleSectionGroups,
  flattenServiceOrder,
  moveServiceInLayout,
  reorderSectionsByIds,
} from "@/lib/quoteSections";
import type { QuoteSection, QuoteService } from "@/types/quote";

const section = (id: string, title: string, order_index: number): QuoteSection =>
  ({ id, quote_id: "q1", title, order_index } as QuoteSection);

const service = (id: string, order_index: number, section_id: string | null = null): QuoteService =>
  ({ id, quote_id: "q1", order_index, section_id, service_type: "hotel", amount: 100 } as unknown as QuoteService);

describe("quoteSections", () => {
  it("legacy quote without sections keeps every service unsectioned", () => {
    const layout = buildQuoteSectionLayout([], [service("a", 0), service("b", 1)]);
    expect(layout.groups).toHaveLength(0);
    expect(layout.unsectioned.map((s) => s.id)).toEqual(["a", "b"]);
    expect(layout.hasSectionedServices).toBe(false);
  });

  it("groups services into Orlando/Miami preserving saved order", () => {
    const sections = [section("s2", "Miami", 1), section("s1", "Orlando", 0)];
    const services = [
      service("hotel2", 1, "s1"),
      service("hotel1", 0, "s1"),
      service("locacao", 2, "s2"),
      service("solto", 3, null),
    ];
    const layout = buildQuoteSectionLayout(sections, services);
    expect(layout.groups.map((g) => g.section.title)).toEqual(["Orlando", "Miami"]);
    expect(layout.groups[0].services.map((s) => s.id)).toEqual(["hotel1", "hotel2"]);
    expect(layout.groups[1].services.map((s) => s.id)).toEqual(["locacao"]);
    expect(layout.unsectioned.map((s) => s.id)).toEqual(["solto"]);
    expect(layout.hasSectionedServices).toBe(true);
  });

  it("services pointing to an unknown section never disappear", () => {
    const layout = buildQuoteSectionLayout([section("s1", "Orlando", 0)], [service("x", 0, "ghost")]);
    expect(layout.unsectioned.map((s) => s.id)).toEqual(["x"]);
  });

  it("public link only shows sections with services", () => {
    const layout = buildQuoteSectionLayout(
      [section("s1", "Orlando", 0), section("s2", "Vazia", 1)],
      [service("a", 0, "s1")],
    );
    expect(visibleSectionGroups(layout).map((g) => g.section.title)).toEqual(["Orlando"]);
  });

  it("moves a service between sections and back to unsectioned", () => {
    const sections = [section("s1", "Orlando", 0), section("s2", "Miami", 1)];
    const layout = buildQuoteSectionLayout(sections, [service("a", 0, "s1"), service("b", 1, "s2")]);

    const moved = moveServiceInLayout(layout, "a", "s2", 0);
    expect(moved.groups[0].services).toHaveLength(0);
    expect(moved.groups[1].services.map((s) => s.id)).toEqual(["a", "b"]);

    const out = moveServiceInLayout(moved, "a", null);
    expect(out.unsectioned.map((s) => s.id)).toEqual(["a"]);
    expect(out.groups[1].services.map((s) => s.id)).toEqual(["b"]);
  });

  it("flattens layout into persistable section/order rows", () => {
    const sections = [section("s1", "Orlando", 0), section("s2", "Miami", 1)];
    const layout = buildQuoteSectionLayout(sections, [
      service("a", 0, "s1"),
      service("b", 1, "s2"),
      service("c", 2, null),
    ]);
    expect(flattenServiceOrder(layout)).toEqual([
      { id: "a", section_id: "s1", order_index: 0 },
      { id: "b", section_id: "s2", order_index: 1 },
      { id: "c", section_id: null, order_index: 2 },
    ]);
  });

  it("reorders sections and renumbers order_index", () => {
    const result = reorderSectionsByIds(
      [section("s1", "Orlando", 0), section("s2", "Miami", 1), section("s3", "Aéreo", 2)],
      ["s3", "s1"],
    );
    expect(result.map((s) => [s.id, s.order_index])).toEqual([["s3", 0], ["s1", 1], ["s2", 2]]);
  });

  it("keeps totals untouched when reorganizing", () => {
    const services = [service("a", 0, "s1"), service("b", 1, null)];
    const before = services.reduce((sum, s) => sum + s.amount, 0);
    const layout = buildQuoteSectionLayout([section("s1", "Orlando", 0)], services);
    const after = [...layout.groups.flatMap((g) => g.services), ...layout.unsectioned]
      .reduce((sum, s) => sum + s.amount, 0);
    expect(after).toBe(before);
  });
});
