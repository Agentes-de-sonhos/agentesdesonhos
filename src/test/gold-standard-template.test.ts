import { describe, expect, it } from "vitest";
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
import { BARDELLI_PRESENTATION_PROFILE, BARDELLI_PRESENTATION_HOST, isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSections } from "@/lib/agencySiteConfig";

describe("padrão ouro dos novos sites", () => {
  it("liga Orlando, resorts, cruzeiros e destinos por padrão", () => {
    const keys = resolveSections(buildGoldStandardProfile("siteLabBase").sections).map((s) => s.key);
    for (const k of ["orlando", "resorts", "authority", "destinations"]) expect(keys).toContain(k);
  });
  it("permite desligar uma seção por agência", () => {
    const p = buildGoldStandardProfile("siteLabBase", { sections: { orlando: { enabled: false } } });
    expect(resolveSections(p.sections).map((s) => s.key)).not.toContain("orlando");
  });
  it("ativa fundos alternados e rotação de destinos", () => {
    const p = buildGoldStandardProfile("siteLabBase");
    expect(p.alternateSurfaces).toBe(true);
    expect(p.randomizeDestinations).toBe(true);
  });
  it("preenche a composição integral e não herda pessoas ou selos", () => {
    const p = BARDELLI_PRESENTATION_PROFILE;
    expect(p.hero).toHaveLength(3);
    expect(p.modules).toHaveLength(6);
    expect(p.featuredExperience?.enabled).toBe(true);
    expect(p.featuredExperience?.mainImage.src).toContain("xcaret-presentation.jpg");
    expect(p.visaHome).toBe(true);
    expect(p.authority?.paragraphs).toHaveLength(2);
    expect(p.authority?.videos).toHaveLength(4);
    expect(p.authority?.companies?.items).toHaveLength(5);
    expect(p.destinations).toHaveLength(5);
    expect(p.highlights).toHaveLength(3);
    expect(p.about?.text?.split("\n\n")).toHaveLength(3);
    expect(p.differentials).toHaveLength(4);
    expect(p.conciergePoints).toHaveLength(4);
    expect(p.faq).toHaveLength(7);
    for (const key of ["dmc", "signature", "offers", "credentials", "team", "avaliacoes", "newsletter"]) expect(resolveSections(p.sections).map(s => s.key)).toContain(key);
    expect(JSON.stringify(p)).not.toMatch(/Juliana|Amanda|Destinos com a Ju|EXPERIÊNCIAS REAIS|Desde 2013|18 experiências/);
    expect(p.testimonials).toBeUndefined();
    expect(p.reviewsCopy).toBeUndefined();
  });
  it("isola domínio real e mantém continuidades completas", () => {
    expect(resolveSiteProfile(BARDELLI_PRESENTATION_HOST).presentation).toBe(true);
    for (const host of ["bardelliviagens.com.br", "www.bardelliviagens.com.br", "100limites.tur.br", "destinoscomaju.com.br", "casanovatur.com.br"]) expect(resolveSiteProfile(host).presentation).not.toBe(true);
    const f = resolveAdsPreviewFixture("bardelli-completa-v1");
    expect(f?.pages).toMatchObject({ orlandoTickets: true, visa: true, dmc: true, editorial: true });
    expect(f?.pages?.xcaret).toBeDefined();
    expect(f?.pages?.resorts).toBeDefined();
    expect(f?.info.user_id).toBe("00000000-0000-0000-0000-00000000ba01");
    expect(f?.info.phone).toBeNull();
  });
  it("recusa hosts públicos, outro tenant e variantes enganosas", () => {
    const host = "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app";
    for (const allowed of [host, "localhost", "127.0.0.1"]) expect(isCompletePresentationHost(allowed)).toBe(true);
    for (const denied of ["agentedesonhoproject.lovable.app", "other.lovable.app", `www.${host}`, `${host}.evil.com`, `evil-${host}`, "id-preview--other.lovable.app", "bardelliviagens.com.br", "www.bardelliviagens.com.br", "100limites.tur.br", "destinoscomaju.com.br", "localhost.evil.com"]) expect(isCompletePresentationHost(denied)).toBe(false);
  });

});
