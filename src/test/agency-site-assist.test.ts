import { describe, expect, it } from "vitest";
import {
  assistWhatsappMessage,
  buildAssistMessagePayload,
  isWithinAssistHours,
  maskAssistPhone,
  resolveSiteAssist,
  validateAssistMessage,
} from "@/lib/agencySiteAssist";

const HOURS = { days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080 };

describe("atendimento programado do site white label", () => {
  it("só existe preset para os hosts configurados", () => {
    expect(resolveSiteAssist("destinoscomaju.com.br")).not.toBeNull();
    expect(resolveSiteAssist("www.destinoscomaju.com.br")).not.toBeNull();
    expect(resolveSiteAssist("paraisoviagens.com")).toBeNull();
    expect(resolveSiteAssist(null)).toBeNull();
  });

  it("avalia o expediente no fuso de Brasília", () => {
    // Quarta-feira, 14h em São Paulo (17:00Z).
    expect(isWithinAssistHours(HOURS, new Date("2026-09-23T17:00:00Z"))).toBe(true);
    // Quarta-feira, 20h em São Paulo (23:00Z) — fora do expediente.
    expect(isWithinAssistHours(HOURS, new Date("2026-09-23T23:00:00Z"))).toBe(false);
    // Domingo — sem atendimento.
    expect(isWithinAssistHours(HOURS, new Date("2026-09-20T15:00:00Z"))).toBe(false);
    // Exatamente 18h em São Paulo já está fechado.
    expect(isWithinAssistHours(HOURS, new Date("2026-09-23T21:00:00Z"))).toBe(false);
  });

  it("contextualiza a mensagem pela página", () => {
    expect(assistWhatsappMessage("Destinos com a Ju", "/xcaret")).toContain("página do Xcaret");
    expect(assistWhatsappMessage("Destinos com a Ju", "/")).toContain("Estava no site");
  });

  it("valida e monta o recado", () => {
    expect(validateAssistMessage({ name: "A", phone: "1", message: "" })).toEqual({
      name: "Informe o seu nome.",
      phone: "Informe um WhatsApp válido com DDD.",
      message: "Conte em poucas palavras o que você precisa.",
    });
    expect(maskAssistPhone("11957414840")).toBe("(11) 95741-4840");
    const payload = buildAssistMessagePayload({
      name: "Fernando",
      phone: "(11) 95741-4840",
      message: "Quero Orlando em julho",
    });
    expect(payload.service_key).toBe("inspiracoes");
    expect(payload.lead_phone).toBe("11957414840");
    expect(payload.consent).toBe(true);
  });
});
