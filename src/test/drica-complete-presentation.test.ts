import { describe, expect, it } from "vitest";
import { DRICA_PRESENTATION_INFO as info, DRICA_PRESENTATION_PROFILE as p, DRICA_VIAGENS_PREVIEW_PROFILE as draft, isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSections } from "@/lib/agencySiteConfig";
import { GOLD_STANDARD_SECTION_ORDER } from "@/lib/goldStandardSiteTemplate";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import logo from "@/assets/ads-preview/briefing-16-v1-logo.png.asset.json";

describe("Drica — apresentação integral isolada", () => {
  it("preserva rascunho e resolve nova fixture somente pelo identificador exato", () => {
    expect(resolveAdsPreviewFixture("briefing-16-v1")?.profile).toBe(draft);
    expect(resolveAdsPreviewFixture("drica-completa-v1")?.profile).toBe(p);
    for (const id of ["drica-completa", "Drica-completa-v1", "drica-completa-v1/", "drica-completa-v1 "]) expect(resolveAdsPreviewFixture(id)).toBeNull();
  });
  it("mantém seções ativas e composição integral", () => {
    const expected = GOLD_STANDARD_SECTION_ORDER.filter((k) => !["dmc", "credentials", "team"].includes(k));
    expect(resolveSections(p.sections).map(s => s.key)).toEqual(expected);
    expect(p.hero).toHaveLength(3); expect(p.modules).toHaveLength(6);
    expect(p.requestCenter).toBeDefined(); expect(p.destinations).toHaveLength(5);
    expect(p.about?.text.split("\n\n")).toHaveLength(3);
    expect(p.about?.text).toContain(draft.about?.text);
    expect(p.conciergePoints).toHaveLength(4); expect(p.differentials).toHaveLength(4); expect(p.faq).toHaveLength(7);
    expect(p.authority?.videos).toHaveLength(4); expect(p.authority?.companies?.items).toHaveLength(5);
    expect(p.highlights).toHaveLength(3); expect(p.resortsMap?.enabled).toBe(true);
    expect(p.visaHome).toBe(false); expect(p.featuredExperience).toBeUndefined();
    expect(p.sections?.dmc).toEqual({ enabled: false });
    expect(p.sections?.credentials).toEqual({ enabled: false });
    expect(p.sections?.team).toEqual({ enabled: false });
    const navJson = JSON.stringify(p.nav);
    expect(navJson).not.toContain("/xcaret"); expect(navJson).not.toContain("/visto-americano"); expect(navJson).not.toContain("/dmc-portugal");
  });
  it("usa identidade confirmada sem fatos herdados ou dados privados", () => {
    expect(info.logo_url).toBe(logo.url); expect(info.phone).toBeNull(); expect(info.public_slug).toBeNull(); expect(info.agency_slug).toBe("");
    expect(info.primary_color).toBe("#990033"); expect(info.secondary_color).toBe("#336687");
    expect(p.footer?.legalName).toBe("Maralba Viagens e Turismo Ltda"); expect(p.footer?.cnpj).toBe("11.636.130/0001-31");
    expect(JSON.stringify(p)).not.toMatch(/Juliana|Amanda|Bardelli|Destinos com a Ju|100 Limites|CPF|residencial/);
    expect(p.conciergePoints?.[3].text).toMatch(/fornecedor.*suporte direto/);
    expect(p.dmc).toBeUndefined(); expect(p.credentials).toBeUndefined();
    expect(p.copy?.avaliacoes?.subtitle).toContain("Avaliações reais");
  });
  it("habilita continuidades locais sem atribuir domínio real", () => {
    const pages = resolveAdsPreviewFixture("drica-completa-v1")?.pages;
    expect(pages).toMatchObject({ resorts: { title: "Explore os resorts do Brasil" }, orlandoTickets: true, editorial: true });
    expect(pages?.xcaret).toBeUndefined(); expect(pages?.visa).toBeUndefined(); expect(pages?.dmc).toBeUndefined();
    expect(resolveSiteProfile(info.hostname)).toBe(p); expect(siteThemeRootClass(info.hostname)).toContain("wl-drica");
    for (const host of ["dricaviagens.rio", "www.dricaviagens.rio", "agentedesonhoproject.lovable.app", "other.lovable.app", "localhost.evil.com", info.hostname]) expect(isCompletePresentationHost(host)).toBe(false);
    for (const host of ["dricaviagens.rio", "www.dricaviagens.rio"]) expect(resolveSiteProfile(host).key).toBe("classic");
    expect(JSON.stringify(p.nav)).not.toContain("dricaviagens.rio"); expect(JSON.stringify(p)).not.toMatch(/https?:\/\/(www\.)?dricaviagens\.rio/);
  });
});
