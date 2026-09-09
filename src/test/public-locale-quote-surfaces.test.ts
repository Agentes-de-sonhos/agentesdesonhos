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
import {
  serviceDigestTypeLabel,
  serviceDigestQuantity,
} from "@/lib/quoteServiceDigest";
import { buildServicePaymentConditions } from "@/lib/servicePaymentConditions";
import type { AgentProfile } from "@/hooks/useAgentProfile";

/** Texto livre do agente — nunca traduzido. */
const FREE_TEXT = "Jantar surpresa na Piazza Navona combinado com a Ousare.";

const quote: any = {
  id: "q1",
  client_name: "Marco Rossi",
  destination: "Roma",
  start_date: "2026-09-08",
  end_date: "2026-09-15",
  adults_count: 2,
  children_count: 2,
  payment_display_mode: "installments",
  installments_count: 10,
  services: [
    {
      id: "s1",
      service_type: "flight",
      amount: 6000,
      service_data: {
        airline: "ITA Airways",
        origin_city: "São Paulo",
        destination_city: "Roma",
        departure_date: "2026-09-08",
        return_date: "2026-09-15",
      },
    },
    {
      id: "s2",
      service_type: "hotel",
      amount: 8000,
      description: FREE_TEXT,
      service_data: { hotel_name: "Hotel Ousare", city: "Roma", check_in: "2026-09-08", check_out: "2026-09-12" },
    },
    {
      id: "s3",
      service_type: "hotel",
      amount: 4000,
      service_data: { hotel_name: "Villa Toscana", city: "Firenze", check_in: "2026-09-12", check_out: "2026-09-15" },
    },
    {
      id: "s4",
      service_type: "transfer",
      amount: 500,
      service_data: { transfer_type: "round_trip", location: "Fiumicino", transfer_service_type: "private" },
    },
    {
      id: "s5",
      service_type: "attraction",
      amount: 900,
      service_data: { product_name: "Coliseu", adults: 2, children: 2, date: "2026-09-09" },
    },
    {
      id: "s6",
      service_type: "insurance",
      amount: 700,
      service_data: { provider: "Assist Card", coverage: "60.000 EUR", start_date: "2026-09-08", end_date: "2026-09-15" },
    },
  ],
};

const profile: AgentProfile = {
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

describe("PDF do orçamento com vários tipos de serviço", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("mantém o português quando a agência não configura idioma", async () => {
    const captured = stubPrintWindow();
    await generateQuotePDF(quote, profile);
    expect(captured.html).toContain("Serviços Incluídos");
    expect(captured.html).toContain("crianças");
    expect(captured.html).toContain("10x de");
    expect(captured.html).toContain(FREE_TEXT);
  });

  it("gera tudo em italiano quando a agência escolhe it-IT", async () => {
    const captured = stubPrintWindow();
    await generateQuotePDF(quote, profile, "it-IT");
    const html = captured.html;
    expect(html).toContain("Servizi Inclusi");
    expect(html).toContain("bambini");
    expect(html).toContain("10x da");
    expect(html).toContain("Andata e Ritorno");
    // texto livre do agente e nomes próprios preservados
    expect(html).toContain(FREE_TEXT);
    expect(html).toContain("Hotel Ousare");
    expect(html).toContain("Villa Toscana");
    // rótulos fixos em português não devem sobrar
    expect(html).not.toContain("Serviços Incluídos");
    expect(html).not.toContain("crianças");
    expect(html).not.toContain("Ida e Volta");
  });

  it("preserva moeda e valores nos dois idiomas", async () => {
    const pt = stubPrintWindow();
    await generateQuotePDF(quote, profile);
    const it = stubPrintWindow();
    await generateQuotePDF(quote, profile, "it-IT");
    for (const html of [pt.html, it.html]) {
      expect(html).toContain("R$");
      expect(html).toContain("8.000,00");
    }
  });
});

describe("digest e condições de pagamento por idioma", () => {
  it("traduz nomes de tipo de serviço", () => {
    expect(serviceDigestTypeLabel(quote.services[0])).toBe("Passagem Aérea");
    expect(serviceDigestTypeLabel(quote.services[0], "it-IT")).toBe("Biglietto Aereo");
    expect(serviceDigestTypeLabel(quote.services[3], "it-IT")).toBe("Transfer");
  });

  it("traduz quantidades com plural do idioma", () => {
    const pt = serviceDigestQuantity(quote.services[4]);
    const it = serviceDigestQuantity(quote.services[4], "it-IT");
    expect(pt === null || typeof pt === "string").toBe(true);
    expect(it === null || typeof it === "string").toBe(true);
    if (pt && it) expect(it).not.toBe(pt);
  });

  it("traduz as linhas de parcelamento mantendo os valores", () => {
    const fmt = (v: number) => `R$ ${v.toFixed(2)}`;
    const pt = buildServicePaymentConditions(quote.services[1], quote, fmt);
    const it = buildServicePaymentConditions(quote.services[1], quote, fmt, "it-IT");
    expect(pt.rows[0].label).toBe("10x de");
    expect(it.rows[0].label).toBe("10x da");
    expect(it.rows[0].value).toBe(pt.rows[0].value);
  });
});

describe("carrinho de reserva público", () => {
  it("tem tradução italiana para os textos do carrinho", () => {
    const pt = translateQuote("pt-BR");
    const it = translateQuote("it-IT");
    const keys = ["servicesIncluded", "paymentConditions", "serviceValueLabel", "paymentMethodLabel"] as const;
    for (const k of keys) {
      expect(it(k)).not.toBe(pt(k));
      expect(it(k).length).toBeGreaterThan(0);
    }
  });
});
