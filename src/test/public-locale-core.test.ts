import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_LOCALE,
  createTranslator,
  formatPublicLongDate,
  formatPublicNumber,
  formatPublicShortDate,
  formatPublicWeekday,
  normalizePublicLocale,
  parseLocalDate,
  pluralize,
  resolvePublicLocale,
} from "@/i18n/publicMaterials/locale";

describe("locale dos materiais públicos", () => {
  it("usa pt-BR como fallback seguro", () => {
    expect(DEFAULT_PUBLIC_LOCALE).toBe("pt-BR");
    expect(normalizePublicLocale(null)).toBe("pt-BR");
    expect(normalizePublicLocale(undefined)).toBe("pt-BR");
    expect(normalizePublicLocale("")).toBe("pt-BR");
    expect(normalizePublicLocale("fr-FR")).toBe("pt-BR");
    expect(normalizePublicLocale(42)).toBe("pt-BR");
  });

  it("reconhece it-IT e variações", () => {
    expect(normalizePublicLocale("it-IT")).toBe("it-IT");
    expect(normalizePublicLocale("IT-it")).toBe("it-IT");
    expect(normalizePublicLocale("it")).toBe("it-IT");
    expect(normalizePublicLocale("it_IT")).toBe("it-IT");
    expect(normalizePublicLocale("pt")).toBe("pt-BR");
  });

  it("resolve o locale a partir do perfil público da agência", () => {
    expect(resolvePublicLocale(null)).toBe("pt-BR");
    expect(resolvePublicLocale({})).toBe("pt-BR");
    expect(resolvePublicLocale({ public_content_locale: null })).toBe("pt-BR");
    expect(resolvePublicLocale({ public_content_locale: "it-IT" })).toBe("it-IT");
  });
});

describe("tradutor tipado", () => {
  const t = createTranslator({
    "pt-BR": { hello: "Olá, {name}", plain: "Investimento" },
    "it-IT": { hello: "Ciao, {name}", plain: "Investimento totale" },
  });

  it("traduz e interpola por idioma", () => {
    expect(t("pt-BR")("hello", { name: "Ana" })).toBe("Olá, Ana");
    expect(t("it-IT")("hello", { name: "Ana" })).toBe("Ciao, Ana");
    expect(t("it-IT")("plain")).toBe("Investimento totale");
  });

  it("cai em pt-BR quando o idioma é desconhecido", () => {
    expect(t("de-DE")("plain")).toBe("Investimento");
    expect(t(null)("plain")).toBe("Investimento");
  });
});

describe("datas e plurais", () => {
  it("parseia YYYY-MM-DD no fuso local", () => {
    const d = parseLocalDate("2026-09-08")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(8);
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate("not-a-date")).toBeNull();
  });

  it("formata datas conforme o idioma", () => {
    expect(formatPublicShortDate("2026-09-08", "pt-BR")).toBe("08/09/2026");
    expect(formatPublicShortDate("2026-09-08", "it-IT")).toBe("08/09/2026");
    expect(formatPublicLongDate("2026-09-08", "pt-BR")).toMatch(/setembro/i);
    expect(formatPublicLongDate("2026-09-08", "it-IT")).toMatch(/settembre/i);
    expect(formatPublicWeekday("2026-09-08", "pt-BR")).toMatch(/terça/i);
    expect(formatPublicWeekday("2026-09-08", "it-IT")).toMatch(/marted/i);
  });

  it("aplica plural do idioma", () => {
    expect(pluralize("pt-BR", 1, { one: "dia", other: "dias" })).toBe("dia");
    expect(pluralize("pt-BR", 3, { one: "dia", other: "dias" })).toBe("dias");
    expect(pluralize("it-IT", 1, { one: "giorno", other: "giorni" })).toBe("giorno");
    expect(pluralize("it-IT", 3, { one: "giorno", other: "giorni" })).toBe("giorni");
  });

  it("formata números sem converter moeda", () => {
    const brl = formatPublicNumber(1234.5, "pt-BR", { style: "currency", currency: "BRL" });
    const brlIt = formatPublicNumber(1234.5, "it-IT", { style: "currency", currency: "BRL" });
    expect(brl).toContain("1.234,5");
    // a moeda do documento é preservada nos dois idiomas
    expect(brlIt).toContain("BRL");
    expect(brl).toContain("R$");
  });
});
