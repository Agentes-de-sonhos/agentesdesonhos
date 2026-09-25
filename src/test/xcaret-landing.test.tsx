import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { XCARET_EXPERIENCES, XCARET_FAQ, XCARET_HERO_SLIDES, XCARET_MEDIA_SLOTS, XCARET_WHATSAPP, xcaretWhatsappUrl } from "@/components/landing/xcaret/content";

const source = readFileSync("src/pages/whitelabel/XcaretLandingPage.tsx", "utf8");
const routes = readFileSync("src/components/routing/AgencyDomainRoutes.tsx", "utf8");

describe("landing Xcaret da Destinos com a Ju", () => {
  it("expõe a rota somente pelo perfil editorialRose e mantém o gate externo", () => {
    expect(routes).toContain('resolveSiteProfile(info.hostname).key === "editorialRose"');
    expect(routes).toContain('<Route path="/xcaret" element={<XcaretLandingPage info={info} />} />');
    expect(routes.indexOf("<AgencySitePasswordGate")).toBeLessThan(routes.indexOf('<Route path="/xcaret"'));
    expect(resolveSiteProfile("destinoscomaju.com.br").nav).toContainEqual({ label: "Xcaret", to: "/xcaret" });
    expect(resolveSiteProfile("paraisoviagens.com").nav ?? []).not.toContainEqual({ label: "Xcaret", to: "/xcaret" });
  });

  it("mantém a quantidade aprovada de conteúdo e mídia opcional real", () => {
    expect(XCARET_HERO_SLIDES).toHaveLength(6);
    expect(XCARET_EXPERIENCES).toHaveLength(5);
    expect(XCARET_FAQ).toHaveLength(7);
    expect(Object.values(XCARET_MEDIA_SLOTS).every((slot) => slot === null)).toBe(true);
    expect((source.match(/<section id=/g) ?? []).length).toBe(10);
    expect(source).toContain("Hotel Xcaret México");
    expect(source).toContain("Hotel Xcaret Arte");
    expect(source).toContain("La Casa de la Playa");
  });

  it("usa o WhatsApp verificado e preserva as mensagens específicas", () => {
    expect(XCARET_WHATSAPP).toBe("5511957414840");
    const url = xcaretWhatsappUrl("Oi, Ju! Vi a página sobre Xcaret");
    expect(url).toContain("https://wa.me/5511957414840");
    expect(decodeURIComponent(url)).toContain("Oi, Ju! Vi a página sobre Xcaret");
    expect(source).not.toContain("2959-6402");
  });

  it("tem SEO, canonical, um único h1 e carregamento prioritário apenas no primeiro slide", () => {
    expect(source).toContain('canonical="https://www.destinoscomaju.com.br/xcaret"');
    expect(source).toContain('title="Xcaret com a Ju | Parques, Hotéis e Viagem Personalizada"');
    expect((source.match(/<h1/g) ?? []).length).toBe(1);
    expect(source).toContain('priority={index === 0}');
    expect(source).toContain('loading={priority ? "eager" : "lazy"}');
  });
});
