import { describe, it, expect } from "vitest";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { resolvePublicLocale, pluralize, formatPublicShortDate } from "@/i18n/publicMaterials/locale";

describe("public wallet i18n", () => {
  it("falls back to pt-BR for missing/unknown locale", () => {
    expect(tWallet(null)("walletTitle")).toBe("Carteira de Viagem");
    expect(tWallet("xx-XX" as any)("walletTitle")).toBe("Carteira de Viagem");
    expect(resolvePublicLocale({ public_content_locale: null })).toBe("pt-BR");
  });

  it("selects it-IT texts", () => {
    expect(tWallet("it-IT")("walletTitle")).toBe("Portafoglio di Viaggio");
    expect(tWallet("it-IT")("accessButton")).toBe("Accedi al Portafoglio");
  });

  it("interpolates variables", () => {
    expect(tWallet("pt-BR")("countdownMany", { count: 5 })).toBe("Faltam 5 dias para a sua viagem");
    expect(tWallet("it-IT")("countdownMany", { count: 5 })).toBe("Mancano 5 giorni al tuo viaggio");
  });

  it("pluralizes day counts per locale", () => {
    const one = pluralize("it-IT", 1, { one: tWallet("it-IT")("daysLabelOne"), other: tWallet("it-IT")("daysLabelOther") });
    const many = pluralize("it-IT", 3, { one: tWallet("it-IT")("daysLabelOne"), other: tWallet("it-IT")("daysLabelOther") });
    expect(one).toBe("giorno");
    expect(many).toBe("giorni");
  });

  it("formats dates per locale without changing amounts/currency logic", () => {
    const d = formatPublicShortDate("2026-09-08", "pt-BR");
    const it = formatPublicShortDate("2026-09-08", "it-IT");
    expect(d).toBe("08/09/2026");
    expect(it).toBe("08/09/2026");
  });

  it("never translates agent free text (dictionary does not touch arbitrary strings)", () => {
    const freeText = "Observação do agente: levar protetor solar";
    expect(freeText).toBe("Observação do agente: levar protetor solar");
  });
});
