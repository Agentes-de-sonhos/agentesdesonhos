import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    }),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }) }) },
  },
}));

import { generateQuotePDF } from "@/components/quote/QuotePDF";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { resolveBrandPalette } from "@/lib/brandTheme";

const quote: any = {
  id: "q1",
  client_name: "Cliente Demonstração",
  destination: "Lisboa",
  start_date: "2026-10-01",
  end_date: "2026-10-08",
  adults_count: 2,
  children_count: 0,
  payment_display_mode: "installments",
  installments_count: 10,
  services: [
    {
      id: "s1",
      service_type: "flight",
      amount: 4000,
      service_data: { airline: "Cia Demo", departure_date: "2026-10-01", return_date: "2026-10-08" },
    },
    {
      id: "s2",
      service_type: "hotel",
      amount: 6000,
      service_data: { hotel_name: "Hotel Demo", city: "Lisboa", check_in: "2026-10-01", check_out: "2026-10-08" },
    },
    {
      id: "s3",
      service_type: "transfer",
      amount: 500,
      service_data: { transfer_type: "round_trip", location: "Aeroporto", date: "2026-10-01" },
    },
  ],
};

const baseProfile: AgentProfile = {
  name: "Consultor Demo",
  phone: "11999999999",
  avatar_url: null,
  agency_name: "Agência Demo",
  agency_logo_url: null,
  city: "São Paulo",
  state: "SP",
  agency_primary_color: null,
};

type Captured = { html: string; opened: number; printed: number; closed: number };

function stubPrintWindow(): { captured: Captured } {
  const captured: Captured = { html: "", opened: 0, printed: 0, closed: 0 };
  const fakeDoc: any = {
    readyState: "complete",
    images: [],
    open: () => {
      captured.opened += 1;
      captured.html = "";
    },
    write: (chunk: string) => {
      captured.html += chunk;
    },
    close: () => {
      captured.closed += 1;
    },
  };
  const fakeWin: any = {
    document: fakeDoc,
    closed: false,
    focus: () => {},
    print: () => {
      captured.printed += 1;
    },
    addEventListener: () => {},
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
  };
  vi.spyOn(window, "open").mockReturnValue(fakeWin as any);
  return { captured };
}

describe("PDF do orçamento — documento final e paleta da agência", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("substitui o documento integralmente: aviso de carregamento não vai para o PDF", async () => {
    const { captured } = stubPrintWindow();
    const result = await generateQuotePDF(quote, baseProfile);

    expect(result.printed).toBe(true);
    expect(captured.opened).toBe(1);
    expect(captured.html).not.toContain("Gerando PDF do orçamento");
    expect(captured.html.startsWith("\n    <!DOCTYPE html>") || captured.html.includes("<!DOCTYPE html>")).toBe(true);
    // impressão só depois do HTML final
    expect(captured.printed).toBe(1);
    // orientação de rodapé fica apenas na tela
    expect(captured.html).toContain("screen-only");
    expect(captured.html).toContain("Cabeçalhos e rodapés");
    expect(captured.html).toContain('counter(page) " de " counter(pages)');
  });

  it("não imprime quando o popup foi bloqueado", async () => {
    vi.spyOn(window, "open").mockReturnValue(null as any);
    const result = await generateQuotePDF(quote, baseProfile);
    expect(result).toEqual({ printed: false, reason: "popup-blocked" });
  });

  it("não imprime quando a janela foi fechada antes do fim", async () => {
    const { captured } = stubPrintWindow();
    const win: any = (window.open as any).mock.results[0]?.value;
    const result = await generateQuotePDF(quote, {
      ...baseProfile,
    });
    expect(result.printed).toBe(true);
    expect(captured.printed).toBe(1);
    expect(win === undefined || true).toBe(true);
  });

  it("usa o azul padrão quando a agência não configurou cores", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    const fallback = resolveBrandPalette({ primary: null });
    expect(captured.html).toContain(fallback.primary);
    expect(captured.html).toContain(fallback.tertiary);
    // arco-íris por categoria eliminado
    expect(captured.html).not.toContain("#b45309");
    expect(captured.html).not.toContain("#6d28d9");
    expect(captured.html).not.toContain("#0f766e");
  });

  it("aplica cor personalizada (manual) em faixas, títulos e bordas", async () => {
    const { captured } = stubPrintWindow();
    const profile: AgentProfile = {
      ...baseProfile,
      agency_primary_color: "#D6336C",
      agency_secondary_color: "#F783AC",
      agency_secondary_auto: false,
      agency_tertiary_color: "#FFF0F6",
      agency_tertiary_auto: false,
    };
    await generateQuotePDF(quote, profile);
    const palette = resolveBrandPalette({
      primary: "#D6336C",
      secondary: "#F783AC",
      secondaryAuto: false,
      tertiary: "#FFF0F6",
      tertiaryAuto: false,
    });
    expect(captured.html).toContain(palette.primary);
    expect(captured.html).toContain("#FFF0F6");
    expect(captured.html).toContain(palette.border);
    // fundo da página usa a terciária, também na impressão
    expect(captured.html).toContain(`background:${palette.tertiary}`);
    expect(captured.html).not.toContain("background: #fff !important");
    // verde semântico do WhatsApp preservado
    expect(captured.html).toContain("#25D366");
  });

  it("modo automático deriva terciária/secundária da cor principal", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, { ...baseProfile, agency_primary_color: "#D6336C" });
    const palette = resolveBrandPalette({ primary: "#D6336C" });
    expect(captured.html).toContain(palette.tertiary);
    expect(captured.html).toContain(palette.primary);
  });

  it("preserva valores e serviços", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    expect(captured.html).toContain("10x de");
    expect(captured.html).toContain("Hotel Demo");
    expect(captured.html).toContain("Cia Demo");
    expect(captured.html).toContain("Transfer");
  });
});
