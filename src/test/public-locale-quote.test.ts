import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    }),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://x" } }) }) },
  },
}));

import { generateQuotePDF } from "@/components/quote/QuotePDF";
import { translateQuote } from "@/i18n/publicMaterials/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";

/** Conteúdo livre digitado pelo agente — nunca deve ser traduzido. */
const AGENT_FREE_TEXT = "Roteiro exclusivo da Ousare, com jantar surpresa incluso.";

const quote: any = {
  id: "q1",
  client_name: "Marco Rossi",
  destination: "Roma",
  start_date: "2026-09-08",
  end_date: "2026-09-15",
  adults_count: 2,
  children_count: 0,
  payment_terms: AGENT_FREE_TEXT,
  services: [
    {
      id: "s1",
      service_type: "hotel",
      amount: 8000,
      description: AGENT_FREE_TEXT,
      service_data: {
        hotel_name: "Hotel Ousare",
        city: "Roma",
        check_in: "2026-09-08",
        check_out: "2026-09-15",
      },
    },
  ],
};

const baseProfile: AgentProfile = {
  name: "Ana Consultora",
  phone: "11999999999",
  avatar_url: null,
  agency_name: "Ousare Travel",
  agency_logo_url: null,
  city: "São Paulo",
  state: "SP",
  agency_primary_color: "#1D4ED8",
};

function stubPrintWindow() {
  const captured = { html: "" };
  const fakeDoc: any = {
    readyState: "complete",
    images: [],
    open: () => {
      captured.html = "";
    },
    write: (chunk: string) => {
      captured.html += chunk;
    },
    close: () => {},
  };
  const fakeWin: any = {
    document: fakeDoc,
    closed: false,
    focus: () => {},
    print: () => {},
    addEventListener: () => {},
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
  };
  vi.spyOn(window, "open").mockReturnValue(fakeWin as any);
  return captured;
}

describe("dicionário do orçamento público", () => {
  it("cai em pt-BR quando a agência não tem idioma configurado", () => {
    expect(translateQuote(null)("investment")).toBe("Investimento");
    expect(translateQuote(undefined)("servicesIncluded")).toBe("Serviços Incluídos");
    expect(translateQuote("xx-XX")("paymentConditions")).toBe("Condições de pagamento");
  });

  it("usa italiano quando a agência escolhe it-IT", () => {
    const t = translateQuote("it-IT");
    expect(t("servicesIncluded")).toBe("Servizi Inclusi");
    expect(t("whatsappCta")).toBe("Parla su WhatsApp");
    expect(t("svc_flight")).toBe("Biglietto Aereo");
  });

  it("interpola valores mantendo a moeda do documento", () => {
    expect(translateQuote("pt-BR")("entryOf", { value: "R$ 1.000,00" })).toBe(
      "Entrada de R$ 1.000,00"
    );
    expect(translateQuote("it-IT")("entryOf", { value: "R$ 1.000,00" })).toBe(
      "Acconto di R$ 1.000,00"
    );
  });
});

describe("PDF do orçamento por idioma da agência", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("agência sem configuração gera o PDF em português", async () => {
    const captured = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    expect(captured.html).toContain("Serviços Incluídos");
    expect(captured.html).not.toContain("Servizi Inclusi");
    expect(captured.html).toContain("Hotel Ousare");
  });

  it("agência it-IT gera o PDF em italiano, sem traduzir conteúdo do agente", async () => {
    const captured = stubPrintWindow();
    await generateQuotePDF(
      quote,
      { ...baseProfile, public_content_locale: "it-IT" } as AgentProfile,
      "it-IT"
    );
    expect(captured.html).toContain("Servizi Inclusi");
    expect(captured.html).not.toContain("Serviços Incluídos");
    // conteúdo livre do agente permanece exatamente como escrito
    expect(captured.html).toContain(AGENT_FREE_TEXT);
    expect(captured.html).toContain("Hotel Ousare");
  });

  it("preserva moeda e valores do documento nos dois idiomas", async () => {
    const pt = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    const ptHtml = pt.html;

    const it = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile, "it-IT");
    const itHtml = it.html;

    for (const html of [ptHtml, itHtml]) {
      expect(html).toContain("R$");
      expect(html).toContain("8.000,00");
    }
  });
});
