import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  resolveBrandPalette,
  brandThemeVars,
  brandContrastRatio,
  defaultOnSecondaryColor,
} from "@/lib/brandTheme";
import { getQuotePdfTokens } from "@/components/quote/QuotePDF";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverStub;
if (typeof window !== "undefined" && !(window as any).ResizeObserver) {
  (window as any).ResizeObserver = ResizeObserverStub;
}

const AGENCY = {
  agency_primary_color: "#0B5CAB",
  agency_secondary_color: "#17A34A",
  agency_secondary_auto: false,
  agency_tertiary_color: "#F1FBF5",
  agency_tertiary_auto: false,
} as any;

describe("cor do texto sobre a cor secundária — paleta", () => {
  it("sem valor configurado mantém o contraste automático atual (fallback)", () => {
    const withField = resolveBrandPalette({
      primary: AGENCY.agency_primary_color,
      secondary: AGENCY.agency_secondary_color,
      secondaryAuto: false,
      tertiary: AGENCY.agency_tertiary_color,
      tertiaryAuto: false,
      onSecondary: null,
    });
    const legacy = resolveBrandPalette({
      primary: AGENCY.agency_primary_color,
      secondary: AGENCY.agency_secondary_color,
      secondaryAuto: false,
      tertiary: AGENCY.agency_tertiary_color,
      tertiaryAuto: false,
    });
    expect(withField.onSecondary).toBe(legacy.onSecondary);
    expect(withField.onSecondary).toBe(defaultOnSecondaryColor("#17A34A"));
  });

  it("HEX personalizado é respeitado exatamente (#17A34A com #FFFFFF)", () => {
    const p = resolveBrandPalette({
      primary: AGENCY.agency_primary_color,
      secondary: "#17A34A",
      secondaryAuto: false,
      tertiary: AGENCY.agency_tertiary_color,
      tertiaryAuto: false,
      onSecondary: "#FFFFFF",
    });
    expect(p.secondary).toBe("#17A34A");
    expect(p.onSecondary).toBe("#FFFFFF");
    const vars = brandThemeVars({
      primary: AGENCY.agency_primary_color,
      secondary: "#17A34A",
      secondaryAuto: false,
      tertiary: AGENCY.agency_tertiary_color,
      tertiaryAuto: false,
      onSecondary: "#ffffff",
    });
    expect(vars["--brand-on-secondary"]).toBe("#FFFFFF");
  });

  it("HEX inválido cai no padrão do sistema", () => {
    const p = resolveBrandPalette({
      primary: AGENCY.agency_primary_color,
      secondary: "#17A34A",
      secondaryAuto: false,
      tertiary: AGENCY.agency_tertiary_color,
      tertiaryAuto: false,
      onSecondary: "verde",
    });
    expect(p.onSecondary).toBe(defaultOnSecondaryColor("#17A34A"));
  });

  it("isolamento por agência: cada configuração gera sua própria cor de texto", () => {
    const a = resolveBrandPalette({
      primary: "#0B5CAB",
      secondary: "#17A34A",
      secondaryAuto: false,
      tertiary: "#F1FBF5",
      tertiaryAuto: false,
      onSecondary: "#FFFFFF",
    });
    const b = resolveBrandPalette({
      primary: "#0B5CAB",
      secondary: "#17A34A",
      secondaryAuto: false,
      tertiary: "#F1FBF5",
      tertiaryAuto: false,
      onSecondary: null,
    });
    expect(a.onSecondary).toBe("#FFFFFF");
    expect(b.onSecondary).not.toBe("#FFFFFF");
  });

  it("cálculo de contraste é o do WCAG", () => {
    expect(brandContrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(brandContrastRatio("#FFFFFF", "#17A34A")).toBeGreaterThan(2.5);
    expect(brandContrastRatio("#000000", "#000000")).toBeCloseTo(1, 5);
  });
});

describe("PDF e preview do orçamento", () => {
  it("faixa de serviço usa a cor escolhida pela agência", () => {
    const tokens = getQuotePdfTokens({
      ...AGENCY,
      agency_on_secondary_color: "#FFFFFF",
    });
    expect(tokens.secondary).toBe("#17A34A");
    expect(tokens.headerText).toBe("#FFFFFF");
  });

  it("sem configuração o PDF mantém exatamente o comportamento atual", () => {
    const before = getQuotePdfTokens(AGENCY);
    const after = getQuotePdfTokens({ ...AGENCY, agency_on_secondary_color: null });
    expect(after.headerText).toBe(before.headerText);
  });

  it("a faixa de serviço aplica a cor no fundo secundário", () => {
    const src = readFileSync("src/components/quote/QuotePDF.tsx", "utf8");
    expect(src).toContain("background:${C.secondary}");
    expect(src).toContain("color:${C.headerText}");
  });

  it("páginas públicas passam a nova cor ao tema da agência", () => {
    for (const file of [
      "src/pages/OrcamentoPublico.tsx",
      "src/pages/RoteiroPublico.tsx",
      "src/pages/ViagemPublica.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("agency_on_secondary_color");
    }
  });
});

describe("configuração na Identidade Visual", () => {
  vi.mock("@/integrations/supabase/client", () => ({
    supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) },
  }));

  async function renderCard(initialOnSecondaryColor: string | null) {
    const { AgencyBrandColorCard } = await import("@/components/profile/AgencyBrandColorCard");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const client = new QueryClient();
    return render(
      <QueryClientProvider client={client}>
        <AgencyBrandColorCard
          initialColor="#0B5CAB"
          initialSecondaryColor="#17A34A"
          initialSecondaryAuto={false}
          initialTertiaryColor="#F1FBF5"
          initialTertiaryAuto={false}
          initialOnSecondaryColor={initialOnSecondaryColor}
          agencyLogoUrl={null}
        />
      </QueryClientProvider>,
    );
  }

  it("mostra seletor, HEX, prévia e restauração do padrão", async () => {
    await renderCard(null);
    expect(screen.getByLabelText("Escolher cor do texto sobre a cor secundária")).toBeTruthy();
    expect(screen.getByLabelText("HEX do texto")).toBeTruthy();
    expect(screen.getByTestId("on-secondary-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Restaurar padrão do sistema/i })).toBeTruthy();
  });

  it("prévia usa fundo secundário com a cor escolhida e avisa sobre contraste baixo", async () => {
    await renderCard("#FFFFFF");
    const preview = screen.getByTestId("on-secondary-preview");
    expect(preview.getAttribute("style")).toContain("rgb(23, 163, 74)");
    expect(preview.getAttribute("style")).toContain("rgb(255, 255, 255)");
    expect(screen.getByTestId("on-secondary-contrast-warning")).toBeTruthy();
  });

  it("restaurar padrão limpa o valor personalizado", async () => {
    await renderCard("#FFFFFF");
    const reset = screen.getByRole("button", { name: /Restaurar padrão do sistema/i });
    fireEvent.click(reset);
    expect((screen.getByLabelText("HEX do texto") as HTMLInputElement).value).toBe("");
  });

  it("o campo funciona em mobile e desktop (layout responsivo, alvo de toque)", () => {
    const src = readFileSync("src/components/profile/AgencyBrandColorCard.tsx", "utf8");
    expect(src).toContain("sm:grid-cols-[auto_1fr]");
    expect(src).toContain("h-10 min-h-11 md:h-8 md:min-h-0");
  });

  it("salva no campo por agência, sem tocar nas outras cores", () => {
    const src = readFileSync("src/components/profile/AgencyBrandColorCard.tsx", "utf8");
    expect(src).toContain("agency_on_secondary_color: normalizeHex(onSecondary)");
    expect(src).toContain('.eq("user_id", user.id)');
  });
});
