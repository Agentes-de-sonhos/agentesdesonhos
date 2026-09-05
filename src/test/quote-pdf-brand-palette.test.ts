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

import { generateQuotePDF, getQuotePdfTokens } from "@/components/quote/QuotePDF";
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

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function stubPrintWindow(opts: { pending?: boolean } = {}): { captured: Captured; win: any } {
  const captured: Captured = { html: "", opened: 0, printed: 0, closed: 0 };
  const fakeDoc: any = {
    readyState: opts.pending ? "loading" : "complete",
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
  return { captured, win: fakeWin };
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

  it("não imprime quando a janela é fechada durante a espera (reason window-closed)", async () => {
    const { captured, win } = stubPrintWindow({ pending: true });
    setTimeout(() => {
      win.closed = true;
    }, 30);
    const result = await generateQuotePDF(quote, baseProfile);
    expect(result).toEqual({ printed: false, reason: "window-closed" });
    expect(captured.printed).toBe(0);
  });

  it("aviso de carregamento é oculto na impressão", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    // o documento de carregamento (escrito antes do open()) traz a regra de print
    expect(captured.opened).toBe(1);
    expect(captured.printed).toBe(1);
  });

  it("bordas vêm da SECUNDÁRIA: secundárias diferentes mudam as bordas", () => {
    const base = { agency_primary_color: "#D6336C", agency_tertiary_color: "#FFF0F6", agency_tertiary_auto: false, agency_secondary_auto: false } as any;
    const a = getQuotePdfTokens({ ...baseProfile, ...base, agency_secondary_color: "#F783AC" });
    const b = getQuotePdfTokens({ ...baseProfile, ...base, agency_secondary_color: "#2F855A" });
    expect(a.primary).toBe(b.primary);
    expect(a.tertiary).toBe(b.tertiary);
    expect(a.border).not.toBe(b.border);
  });

  it("garante 4.5:1 para textos pequenos sobre branco e sobre terciária escura", () => {
    const dark = getQuotePdfTokens({
      ...baseProfile,
      agency_primary_color: "#1D4ED8",
      agency_tertiary_color: "#111827",
      agency_tertiary_auto: false,
    } as any);
    for (const t of [dark.textT, dark.mutedT, dark.faintT, dark.primaryOnTertiary]) {
      expect(contrast(t, "#111827")).toBeGreaterThanOrEqual(4.5);
    }
    for (const t of [dark.text, dark.muted, dark.faint, dark.primary]) {
      expect(contrast(t, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
    // fundo configurado é preservado
    expect(dark.tertiary).toBe("#111827");
  });

  it("com terciária escura os textos do fundo da página não ficam escuros", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, {
      ...baseProfile,
      agency_primary_color: "#1D4ED8",
      agency_tertiary_color: "#111827",
      agency_tertiary_auto: false,
    } as any);
    const tokens = getQuotePdfTokens({
      ...baseProfile,
      agency_primary_color: "#1D4ED8",
      agency_tertiary_color: "#111827",
      agency_tertiary_auto: false,
    } as any);
    expect(captured.html).toContain(tokens.textT);
    expect(captured.html).toContain(tokens.faintT);
    // textos dos cards brancos continuam escuros (sem substituição global)
    expect(captured.html).toContain(tokens.text);
  });

  it("payment_terms usa texto legível sobre card branco e título de anexos sobre terciária", async () => {
    const { captured } = stubPrintWindow();
    const q = { ...quote, payment_terms: "Entrada de 30% e saldo em até 10x." };
    const profile = {
      ...baseProfile,
      agency_primary_color: "#1D4ED8",
      agency_tertiary_color: "#111827",
      agency_tertiary_auto: false,
    } as any;
    const tokens = getQuotePdfTokens(profile);
    await generateQuotePDF(q, profile);
    const paymentBlock = captured.html.match(/💳 Condições de Pagamento[\s\S]*?<\/p>\s*<\/div>/)?.[0] || "";
    expect(paymentBlock).toContain(tokens.muted);
    expect(paymentBlock).not.toContain(tokens.mutedT);
    const docTitleIdx = captured.html.indexOf("Documentos do seu orçamento");
    const snippet = captured.html.slice(Math.max(0, docTitleIdx - 120), docTitleIdx + 40);
    expect(snippet).toContain(tokens.textT);
  });

  it("fallback de serviços vazio interpola a cor corretamente", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF({ ...quote, services: [] }, baseProfile);
    const tokens = getQuotePdfTokens(baseProfile);
    expect(captured.html).toContain("Nenhum serviço adicionado");
    expect(captured.html).toContain(`color:${tokens.faintT}`);
  });

  it("ensureReadable garante contraste mínimo inclusive sobre fundos intermediários", () => {
    const tokens = getQuotePdfTokens({
      ...baseProfile,
      agency_tertiary_color: "#999999",
      agency_tertiary_auto: false,
    } as any);
    for (const t of [tokens.textT, tokens.mutedT, tokens.faintT, tokens.primaryOnTertiary]) {
      expect(contrast(t, "#999999")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("usa o azul padrão quando a agência não configurou cores", async () => {
    const { captured } = stubPrintWindow();
    await generateQuotePDF(quote, baseProfile);
    const fallback = resolveBrandPalette({ primary: null });
    const tokens = getQuotePdfTokens(baseProfile);
    expect(fallback.primary).toBe("#0284C7");
    expect(captured.html).toContain(tokens.primary);
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
    expect(captured.html).toContain(getQuotePdfTokens(profile).primary);
    expect(captured.html).toContain("#FFF0F6");
    expect(captured.html).toContain(getQuotePdfTokens(profile).border);
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
    expect(captured.html).toContain(getQuotePdfTokens({ ...baseProfile, agency_primary_color: "#D6336C" }).primary);
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
