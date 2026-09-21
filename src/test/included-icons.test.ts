import { describe, it, expect } from "vitest";
import {
  sanitizeIncludedIconId,
  includedIconDef,
  searchIncludedIcons,
  INCLUDED_ICON_CATEGORIES,
  INCLUDED_ICONS,
  iconIdFromLegacyKey,
} from "@/lib/includedIcons";
import {
  normalizeWhatsIncludedEntry,
  customWhatsIncludedItems,
  resolveWhatsIncludedItems,
  serializeWhatsIncludedItems,
  effectiveIncludedIconId,
  autoIncludedIconId,
  resolveWhatsIncluded,
} from "@/lib/whatsIncluded";
import { includedIconSvgMarkup } from "@/lib/includedIconSvg";

const quoteWithServices = {
  services: [
    { service_type: "hotel", service_data: { hotel_name: "Hotel Praia", meal_plan: "All inclusive" } },
    { service_type: "insurance", service_data: {} },
  ],
};

describe("registro de ícones inclusos", () => {
  it("tem ids únicos e categorias válidas", () => {
    const ids = INCLUDED_ICONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(INCLUDED_ICON_CATEGORIES.map((c) => c.key));
    INCLUDED_ICONS.forEach((d) => expect(cats.has(d.category)).toBe(true));
  });

  it("valida identificadores e faz fallback seguro para ids desconhecidos", () => {
    expect(sanitizeIncludedIconId("plane")).toBe("plane");
    expect(sanitizeIncludedIconId("nao-existe")).toBeNull();
    expect(sanitizeIncludedIconId({ evil: true })).toBeNull();
    expect(includedIconDef("nao-existe").id).toBe("sparkles");
    expect(includedIconDef(undefined).id).toBe("sparkles");
  });

  it("aceita chaves legadas gravadas antes do seletor", () => {
    expect(sanitizeIncludedIconId("flight")).toBe("plane");
    expect(sanitizeIncludedIconId("attraction")).toBe("ticket");
    expect(iconIdFromLegacyKey("cruise")).toBe("ship");
  });

  it("busca por termos em português, com e sem acento, e filtra por categoria", () => {
    expect(searchIncludedIcons("avião").map((d) => d.id)).toContain("plane");
    expect(searchIncludedIcons("hospedagem").map((d) => d.id)).toContain("hotel");
    expect(searchIncludedIcons("navio").map((d) => d.id)).toContain("ship");
    expect(searchIncludedIcons("seguro").map((d) => d.id)).toContain("shield");
    expect(searchIncludedIcons("restaurante").map((d) => d.id)).toContain("meal");
    expect(searchIncludedIcons("bagagem").map((d) => d.id)).toContain("luggage");
    expect(searchIncludedIcons("praia").map((d) => d.id)).toContain("beach");
    const transporte = searchIncludedIcons("", "transporte");
    expect(transporte.length).toBeGreaterThan(0);
    expect(transporte.every((d) => d.category === "transporte")).toBe(true);
    expect(searchIncludedIcons("zzzz")).toHaveLength(0);
  });
});

describe("modelo de dados da lista de inclusos", () => {
  it("normaliza strings antigas e objetos novos", () => {
    expect(normalizeWhatsIncludedEntry("Voos")).toEqual({ text: "Voos" });
    expect(normalizeWhatsIncludedEntry({ text: "Voos", icon: "plane" })).toEqual({ text: "Voos", icon: "plane" });
    expect(normalizeWhatsIncludedEntry({ text: "Voos", icon: "<svg/>" })).toEqual({ text: "Voos" });
    expect(normalizeWhatsIncludedEntry("   ")).toBeNull();
  });

  it("lê lista personalizada mista sem quebrar", () => {
    const items = customWhatsIncludedItems({ whats_included: ["Voos", { text: "Seguro", icon: "shield-check" }, 42] });
    expect(items).toEqual([{ text: "Voos" }, { text: "Seguro", icon: "shield-check" }]);
  });

  it("usa a lista automática quando não há personalização", () => {
    const items = resolveWhatsIncludedItems(quoteWithServices);
    expect(items.map((i) => i.text)).toEqual(resolveWhatsIncluded(quoteWithServices));
    expect(effectiveIncludedIconId(items[0])).toBe("hotel");
    expect(effectiveIncludedIconId(items[1])).toBe("shield");
  });

  it("persiste somente identificadores permitidos, string simples sem ícone manual", () => {
    expect(serializeWhatsIncludedItems([
      { text: " Voos " },
      { text: "Seguro", icon: "shield-check" },
      { text: "Ruim", icon: "javascript:alert(1)" },
      { text: "" },
    ])).toEqual(["Voos", { text: "Seguro", icon: "shield-check" }, "Ruim"]);
  });

  it("ícone manual sobrepõe a sugestão automática", () => {
    expect(autoIncludedIconId("Voos saindo de São Paulo")).toBe("plane");
    expect(effectiveIncludedIconId({ text: "Voos saindo de São Paulo", icon: "luggage" })).toBe("luggage");
    expect(effectiveIncludedIconId({ text: "Voos", icon: "desconhecido" })).toBe("plane");
  });
});

describe("saída no PDF", () => {
  it("gera SVG inline do mesmo ícone, sem depender de fonte de emoji", () => {
    const svg = includedIconSvgMarkup("plane", 14, "#123456");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("#123456");
    expect(includedIconSvgMarkup("id-invalido").startsWith("<svg")).toBe(true);
  });
});
