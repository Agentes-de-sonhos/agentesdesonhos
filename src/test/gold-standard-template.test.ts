import { describe, expect, it } from "vitest";
import { buildGoldStandardProfile } from "@/lib/goldStandardSiteTemplate";
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
});
