import { describe, expect, it } from "vitest";
import {
  agencyBrandInputFromProfile,
  brandThemeStyle,
  brandThemeVars,
  pickBrandProfile,
  resolveBrandPalette,
} from "@/lib/brandTheme";
import { getQuotePdfTokens } from "@/components/quote/QuotePDF";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const customProfile = {
  agency_primary_color: "#0F172A",
  agency_secondary_color: "#17A34A",
  agency_secondary_auto: false,
  agency_tertiary_color: "#E7F7EE",
  agency_tertiary_auto: false,
  agency_on_secondary_color: "#FFFFFF",
};

/** Perfil entregue pelo payload público do orçamento: sem campos de marca. */
const payloadProfile = {
  name: "Agente",
  phone: "11999999999",
  agency_name: "Agência Demo",
  agency_logo_url: null,
  public_content_locale: "pt-BR",
};

describe("cores da identidade visual nos links públicos", () => {
  it("o perfil do payload público não traz marca e não é escolhido como fonte", () => {
    expect(pickBrandProfile([payloadProfile as Record<string, unknown>])).toBeNull();
  });

  it("escolhe o cadastro vivo quando o payload público não tem cores", () => {
    const picked = pickBrandProfile([
      payloadProfile as Record<string, unknown>,
      customProfile as Record<string, unknown>,
    ]);
    expect(picked).toBe(customProfile);
  });

  it("prioriza o cadastro vivo sobre um snapshot antigo embutido no link", () => {
    const staleSnapshot = {
      ...customProfile,
      agency_secondary_color: "#0284C7",
      agency_tertiary_color: "#E0F2FE",
    };
    const picked = pickBrandProfile([
      customProfile as Record<string, unknown>,
      staleSnapshot as Record<string, unknown>,
    ]);
    expect(picked).toBe(customProfile);
  });

  it("a paleta personalizada chega ao orçamento web com os mesmos tokens do PDF", () => {
    const pdf = getQuotePdfTokens(customProfile as unknown as AgentProfile);
    const web = resolveBrandPalette(agencyBrandInputFromProfile(customProfile));

    expect(web.secondary).toBe("#17A34A");
    expect(pdf.secondary).toBe(web.secondary);
    expect(web.tertiary).toBe(pdf.tertiary);
    // Texto dos cabeçalhos de serviço sobre o fundo secundário
    expect(web.onSecondary).toBe("#FFFFFF");
    expect(pdf.headerText).toBe(web.onSecondary);
  });

  it("as variáveis CSS aplicadas nas páginas públicas expõem a marca configurada", () => {
    const vars = brandThemeVars(agencyBrandInputFromProfile(customProfile));
    expect(vars["--brand-secondary"]).toBe("#17A34A");
    expect(vars["--brand-on-secondary"]).toBe("#FFFFFF");
    expect(vars["--brand-tertiary"]).toBe("#E7F7EE");
  });

  it("o estilo da raiz pública mantém a paleta completa sem sobrescrever a secundária", () => {
    const style = brandThemeStyle(agencyBrandInputFromProfile(customProfile)) as Record<string, string>;
    const palette = resolveBrandPalette(agencyBrandInputFromProfile(customProfile));
    expect(style["--brand-primary"]).toBe(palette.primary);
    expect(style["--brand-secondary"]).toBe("#17A34A");
    expect(style["--brand-on-secondary"]).toBe("#FFFFFF");
    expect(style["--brand-tertiary"]).toBe("#E7F7EE");
  });

  it("sem cor de texto configurada mantém o fallback automático de contraste", () => {
    const legacy = { ...customProfile, agency_on_secondary_color: null };
    const web = resolveBrandPalette(agencyBrandInputFromProfile(legacy));
    const pdf = getQuotePdfTokens(legacy as unknown as AgentProfile);
    expect(web.onSecondary).toBe("#FFFFFF");
    expect(pdf.headerText).toBeTruthy();
  });

  it("perfis antigos/nulos não quebram: caem no azul padrão", () => {
    const palette = resolveBrandPalette(agencyBrandInputFromProfile(null));
    expect(palette.primary).toBeTruthy();
    expect(palette.onSecondary).toBeTruthy();
    const empty = agencyBrandInputFromProfile(undefined);
    expect(empty.primary).toBeNull();
    expect(empty.onSecondary).toBeNull();
  });
});
