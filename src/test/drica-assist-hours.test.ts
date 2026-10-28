import { describe, it, expect } from "vitest";
import { isWithinAssistHours, siteAssistConfig } from "@/lib/agencySiteAssist";

const cfg = siteAssistConfig("www.dricaviagens.com.br");
// Horários em UTC; Brasília = UTC-3.
const at = (iso: string) => isWithinAssistHours(cfg.hours, new Date(iso));

describe("Drica Viagens — horário de atendimento", () => {
  it("segunda 9h00 está aberto", () => expect(at("2026-10-26T12:00:00Z")).toBe(true));
  it("sexta 17h59 está aberto", () => expect(at("2026-10-30T20:59:00Z")).toBe(true));
  it("sexta 18h00 está fechado", () => expect(at("2026-10-30T21:00:00Z")).toBe(false));
  it("segunda 8h59 está fechado", () => expect(at("2026-10-26T11:59:00Z")).toBe(false));
  it("sábado 10h está fechado", () => expect(at("2026-10-31T13:00:00Z")).toBe(false));
});
