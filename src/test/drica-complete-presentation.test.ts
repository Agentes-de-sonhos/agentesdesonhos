import { describe, expect, it } from "vitest";
import { DRICA_PRESENTATION_INFO as info, DRICA_PRESENTATION_PROFILE as p, DRICA_VIAGENS_PREVIEW_PROFILE as draft, DRICA_XCARET_REWRITES, isCompletePresentationHost, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
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
  it("mantém todas as seções e composição integral", () => {
    expect(resolveSections(p.sections).map(s => s.key)).toEqual(GOLD_STANDARD_SECTION_ORDER);
    expect(p.hero).toHaveLength(3); expect(p.modules).toHaveLength(6);
    expect(p.requestCenter).toBeDefined(); expect(p.destinations).toHaveLength(5);
    expect(p.about?.text.split("\n\n")).toHaveLength(3);
    expect(p.about?.text).toContain(draft.about?.text);
    expect(p.conciergePoints).toHaveLength(4); expect(p.differentials).toHaveLength(4); expect(p.faq).toHaveLength(7);
    expect(p.authority?.videos).toHaveLength(4); expect(p.authority?.companies?.items).toHaveLength(5);
    expect(p.highlights).toHaveLength(3); expect(p.visaHome).toBe(true); expect(p.resortsMap?.enabled).toBe(true);
  });
  it("usa identidade confirmada sem fatos herdados ou dados privados", () => {
    expect(info.logo_url).toBe(logo.url); expect(info.phone).toBeNull(); expect(info.public_slug).toBeNull(); expect(info.agency_slug).toBe("");
    expect(info.primary_color).toBe("#990033"); expect(info.secondary_color).toBe("#336687");
    expect(p.footer?.legalName).toBe("Maralba Viagens e Turismo Ltda"); expect(p.footer?.cnpj).toBe("11.636.130/0001-31");
    expect(JSON.stringify(p)).not.toMatch(/Juliana|Amanda|Bardelli|Destinos com a Ju|100 Limites|CPF|residencial/);
    expect(p.featuredExperience?.badge).toBeNull(); expect(p.featuredExperience?.consultantImage).toBeNull();
    expect(p.conciergePoints?.[3].text).toMatch(/fornecedor.*suporte direto/);
    expect(p.dmc?.note).toContain("ilustrativo"); expect(p.credentials?.text).toContain("Nenhum selo");
    expect(p.copy?.avaliacoes?.subtitle).toContain("Avaliação ilustrativa — exemplo de apresentação");
    expect(DRICA_XCARET_REWRITES.map(([,to])=>to).join(" ")).not.toMatch(/Bardelli|Juliana|Expert/);
  });
  it("habilita continuidades locais sem atribuir domínio real", () => {
    expect(resolveAdsPreviewFixture("drica-completa-v1")?.pages).toMatchObject({ visa: true, dmc: true, editorial: true, orlandoTickets: true });
    expect(resolveSiteProfile(info.hostname)).toBe(p); expect(siteThemeRootClass(info.hostname)).toContain("wl-drica");
    for (const host of ["dricaviagens.rio", "www.dricaviagens.rio", "agentedesonhoproject.lovable.app", "other.lovable.app", "localhost.evil.com", info.hostname]) expect(isCompletePresentationHost(host)).toBe(false);
    for (const host of ["dricaviagens.rio", "www.dricaviagens.rio"]) expect(resolveSiteProfile(host).key).toBe("classic");
    expect(JSON.stringify(p.nav)).not.toContain("dricaviagens.rio"); expect(JSON.stringify(p)).not.toMatch(/https?:\/\/(www\.)?dricaviagens\.rio/);
  });
});
