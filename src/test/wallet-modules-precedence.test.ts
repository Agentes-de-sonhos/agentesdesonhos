import { describe, expect, it } from "vitest";
import { DEFAULT_WALLET_SETTINGS, resolveWalletSettings, sanitizeWalletOverrides } from "@/lib/walletSettings";

describe("módulos da carteira por carteira", () => {
  it("padrão do sistema: calendário, assinatura e WhatsApp ligados; demais desligados", () => {
    expect(DEFAULT_WALLET_SETTINGS).toEqual({ show_calendar: true, show_next_service: false, show_next_activity: false, show_support_tools: false, show_signature: true, show_whatsapp: true });
    expect(resolveWalletSettings(null, null)).toEqual(DEFAULT_WALLET_SETTINGS);
  });
  it("carteira sobrepõe a agência, que sobrepõe o sistema", () => {
    const agency = { ...DEFAULT_WALLET_SETTINGS, show_next_service: true, show_whatsapp: false };
    expect(resolveWalletSettings(agency, null).show_next_service).toBe(true);
    const r = resolveWalletSettings(agency, { show_next_service: false, show_whatsapp: true });
    expect(r.show_next_service).toBe(false);
    expect(r.show_whatsapp).toBe(true);
    expect(r.show_signature).toBe(true);
  });
  it("assinatura e WhatsApp independentes; ignora valores inválidos", () => {
    const r = resolveWalletSettings(DEFAULT_WALLET_SETTINGS, { show_signature: false });
    expect(r.show_signature).toBe(false);
    expect(r.show_whatsapp).toBe(true);
    expect(sanitizeWalletOverrides({ show_calendar: "x", evil: true, show_whatsapp: false })).toEqual({ show_whatsapp: false });
  });
});
