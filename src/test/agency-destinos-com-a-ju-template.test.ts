import { describe, it, expect } from "vitest";
import { resolveSiteTheme, siteThemeRootClass, isEditorialTheme } from "@/lib/agencySiteTheme";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isUnderConstruction } from "@/lib/agencySiteStatus";
import { resolveDmc, resolveSections } from "@/lib/agencySiteConfig";
import { resolveAgencyFaviconUrl, resolveAgencyLogoOverride } from "@/lib/agencySiteBrand";
import { siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";
import { readFileSync } from "node:fs";

const JU_HOSTS = ["destinoscomaju.com.br", "www.destinoscomaju.com.br"];
const LIMITES = "100limites.tur.br";
const homeSource = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");

describe("Destinos com a Ju — perfil editorial completo e isolado", () => {
  it("está no ar com o site completo, mantendo o template configurado", () => {
    for (const host of JU_HOSTS) expect(isUnderConstruction(host)).toBe(false);
  });


  it("usa a família de layout editorial com tokens rosé exclusivos", () => {
    for (const host of JU_HOSTS) {
      expect(resolveSiteTheme(host)).toBe("roseEditorial");
      expect(isEditorialTheme(host)).toBe(true);
      expect(siteThemeRootClass(host)).toBe("wl-editorial wl-rose");
    }
    expect(siteThemeRootClass(LIMITES)).toBe("wl-editorial");
  });

  it("usa a ordem editorial própria sem alterar o perfil da 100 Limites", () => {
    const profile = resolveSiteProfile(JU_HOSTS[0]);
    const ju = resolveSections(profile.sections).map((s) => s.key);
    const limites = resolveSections(resolveSiteProfile(LIMITES).sections).map((s) => s.key);
    expect(ju).toEqual(["signature", "destinations", "modules", "authority", "about", "differentials", "concierge", "avaliacoes", "faq", "newsletter", "offers"]);
    expect(limites).not.toContain("authority");
    expect(resolveProfileKey(JU_HOSTS[0])).toBe("editorialRose");
  });

  it("entrega conteúdo aprovado, cinco destinos e seis especialidades", () => {
    for (const host of JU_HOSTS) {
      const profile = resolveSiteProfile(host);
      expect(profile.hero?.[0].title).toBe("Sua viagem importa.\nCada detalhe também.");
      expect(profile.destinations).toHaveLength(5);
      expect(profile.modules).toHaveLength(6);
      expect(profile.authority?.title).toContain("Cruzeiros");
      expect(profile.authority?.video).toBe("disneyWishCruise");
      expect(profile.about?.text).toContain("Juliana Neves Sanches");
      expect(profile.faq).toHaveLength(7);
      expect(profile.footer?.cnpj).toBe("23.593.301/0001-71");
      expect(profile.seo?.canonical).toBe("https://www.destinoscomaju.com.br/");
      expect(profile.heroPresentation).toEqual({
        kicker: "CONSULTORIA DE VIAGENS PERSONALIZADAS · SÃO PAULO",
        cta: { label: "Começar a planejar", service: "pacotes" },
        preserveTitleLineBreaks: true,
        actionsPlacement: "right",
      });
      expect(profile.conciergeWhatsappLabel).toBe("Falar com a Juliana");
    }
  });

  it("usa o vídeo enviado somente na autoridade de cruzeiros da Destinos", () => {
    expect(homeSource).toContain("disney-wish-cruise.mp4.asset.json");
    expect(homeSource).toContain("IntersectionObserver");
    expect(homeSource).toContain("playsInline");
    expect(homeSource).toContain("muted");

    for (const host of [LIMITES, "paraisoviagens.com", "www.essyatur.com.br", "sitelab.local"]) {
      expect(resolveSiteProfile(host).authority?.video).toBeUndefined();
    }
  });

  it("mantém a quebra do título e posiciona CTA e navegação à direita somente na Destinos", () => {
    const ju = resolveSiteProfile(JU_HOSTS[0]);
    expect(ju.heroPresentation?.preserveTitleLineBreaks).toBe(true);
    expect(ju.heroPresentation?.actionsPlacement).toBe("right");
    expect(homeSource).toContain("whitespace-pre-line");
    expect(homeSource).toContain("data-hero-actions-placement");

    for (const host of [LIMITES, "paraisoviagens.com", "www.essyatur.com.br", "sitelab.local"]) {
      expect(resolveSiteProfile(host).heroPresentation?.actionsPlacement).not.toBe("right");
      expect(resolveSiteProfile(host).heroPresentation?.preserveTitleLineBreaks).not.toBe(true);
    }
  });

  it("mantém a Central compacta com título externo, CTA curto e aviso aprovado", () => {
    const requestCenter = resolveSiteProfile(JU_HOSTS[0]).requestCenter;
    expect(requestCenter).toEqual({
      title: "Por onde você quer começar?",
      notice: "Sua solicitação não é processada automaticamente. Cada pedido é analisado com atenção para que as opções realmente façam sentido para a sua viagem.",
      submitLabel: "Solicitar",
      titlePlacement: "above-card",
    });
    expect(requestCenter?.support).toBeUndefined();
    expect(homeSource).toContain('titlePlacement === "above-card"');
    expect(homeSource).toContain("text-white");
  });

  it("preserva o padrão interno compartilhado nos demais perfis", () => {
    for (const host of [LIMITES, "paraisoviagens.com", "www.essyatur.com.br", "sitelab.local"]) {
      expect(resolveSiteProfile(host).requestCenter?.titlePlacement).not.toBe("above-card");
    }
  });

  it("mantém o menu enxuto, Ofertas acessível e Área do Cliente como ação separada", () => {
    expect(siteNavLinks(JU_HOSTS[0])).toEqual([
      { label: "Início", to: "/" },
      { label: "Destinos", to: "/#destinos" },
      { label: "Experiências", to: "/#campanhas" },
      { label: "Cruzeiros", to: "/#autoridade" },
      { label: "Xcaret", to: "/xcaret" },
      { label: "Ofertas", to: "/ofertas" },
      { label: "Sobre", to: "/#sobre" },
      { label: "Avaliações", to: "/#avaliacoes" },
    ]);
  });

  it("resolve o perfil pelo hostname canônico recebido no contexto, sem depender do slug", () => {
    const info = { hostname: JU_HOSTS[0] };
    expect(resolveSiteProfile(info.hostname)).toBe(resolveSiteProfile("www.destinoscomaju.com.br"));
    expect(resolveProfileKey("destinos-com-a-ju")).toBe("classic");
  });

  it("não herda referências editoriais de outros tenants", () => {
    const serialized = JSON.stringify(resolveSiteProfile(JU_HOSTS[0]));
    expect(serialized).not.toContain("Comandatuba");
    expect(serialized).not.toContain("Lua de mel");
    expect(serialized).not.toContain("Paraíso");
    expect(serialized).not.toContain("100 Limites");
  });

  it("não herda conteúdo exclusivo (DMC) da 100 Limites", () => {
    for (const host of JU_HOSTS) expect(resolveDmc(host)).toBeNull();
  });

  it("aplica o logotipo oficial apenas nos hosts da agência", () => {
    for (const host of JU_HOSTS) expect(resolveAgencyLogoOverride(host)).toContain("logo-destinos-com-a-ju");
    expect(resolveAgencyLogoOverride(LIMITES)).toBeNull();
    // Paraíso tem o próprio logotipo oficial — nunca o da Ju.
    expect(resolveAgencyLogoOverride("paraisoviagens.com")).not.toContain("logo-destinos-com-a-ju");
  });

  it("usa o ícone próprio no favicon sem substituir o logotipo do site", () => {
    for (const hostname of JU_HOSTS) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-destinos-com-a-ju.png");
      expect(resolveAgencyLogoOverride(hostname)).toContain("logo-destinos-com-a-ju-2026.png");
    }
  });

  it("usa o ícone próprio da Paraíso sem substituir o logotipo visível", () => {
    for (const hostname of ["paraisoviagens.com", "www.paraisoviagens.com"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-paraiso-viagens.png");
      expect(resolveAgencyLogoOverride(hostname)).toContain("logo-paraiso-viagens.png");
    }
  });

  it("usa a bússola oficial como favicon da Essya Tur sem trocar o logotipo do site", () => {
    for (const hostname of ["essyatur.com.br", "www.essyatur.com.br"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-essya-tur.png");
    }
    expect(resolveAgencyLogoOverride("www.essyatur.com.br")).toBeNull();
  });

  it("usa o pin vermelho oficial como favicon da 100 Limites", () => {
    for (const hostname of ["100limites.tur.br", "www.100limites.tur.br"]) {
      const info = { hostname, logo_url: null } as Parameters<typeof resolveAgencyFaviconUrl>[0];
      expect(resolveAgencyFaviconUrl(info)).toContain("favicon-100-limites-2.png");
    }
    expect(resolveAgencyLogoOverride("100limites.tur.br")).toBeNull();
  });

  it("não altera os demais tenants", () => {
    expect(resolveSiteTheme(LIMITES)).toBe("travelEditorial");
    expect(resolveSiteTheme("paraisoviagens.com")).toBe("luxuryEditorial");
    expect(isUnderConstruction(LIMITES)).toBe(false);
    expect(isUnderConstruction("paraisoviagens.com")).toBe(false);
  });
});
