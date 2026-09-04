import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MODULE_CATALOG,
  SITE_CATALOG,
  catalogEntry,
  catalogSectionKeys,
  sitelabSectionOverrides,
} from "@/lib/agencySiteCatalog";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveModules, resolveSections } from "@/lib/agencySiteConfig";
import { SITELAB_DEMO_HOSTNAME } from "@/lib/sitelabModels";

const home = readFileSync("src/pages/whitelabel/AgencySiteHome.tsx", "utf8");
const lab = resolveSiteProfile(SITELAB_DEMO_HOSTNAME);

describe("catálogo mestre de seções", () => {
  it("tem chaves únicas, classificação, descrição e âncora", () => {
    const keys = SITE_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of SITE_CATALOG) {
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.when.length).toBeGreaterThan(10);
      expect(entry.anchor).toMatch(/^(#|\/)/);
      expect(["recomendada", "opcional", "especializada", "alternativa"]).toContain(
        entry.classification,
      );
      expect(catalogEntry(entry.key)?.key).toBe(entry.key);
    }
  });

  it("SiteLab habilita TODAS as seções configuráveis do catálogo", () => {
    const rendered = resolveSections(lab.sections).map((s) => s.key);
    for (const key of catalogSectionKeys()) expect(rendered).toContain(key);
    // derivado da fonte única: overrides vêm do catálogo, sem condicionais espalhadas
    expect(Object.keys(sitelabSectionOverrides()).sort()).toEqual(
      catalogSectionKeys().slice().sort(),
    );
  });

  it("SiteLab traz conteúdo demonstrativo nos blocos condicionais", () => {
    expect(lab.demo).toBe(true);
    expect(lab.dmc?.services?.length).toBeGreaterThan(3);
    expect(lab.credentials?.items?.length).toBeGreaterThan(2);
    expect(lab.team?.length).toBeGreaterThan(2);
    expect(lab.testimonials?.length).toBeGreaterThan(2);
    expect(lab.conciergePoints?.map((p) => p.key)).toEqual([
      "escuta",
      "curadoria",
      "planejamento",
      "contato",
      "organizacao",
    ]);
  });

  it("reúne todos os temas do catálogo de módulos no SiteLab", () => {
    const keys = resolveModules(undefined, lab.modules).map((m) => m.key);
    for (const theme of MODULE_CATALOG) expect(keys).toContain(theme.key);
  });

  it("etiquetas e mapa do catálogo são exclusivos do laboratório", () => {
    expect(home).toContain("const lab = !!profile.demo");
    expect(home).toContain("{lab && <SiteLabCatalogMap");
    expect(home).toContain("<SiteLabSectionTag sectionKey={section.key} />");
    expect(home).toContain("if (!showcasePublished && !lab) return null;");
  });
});

describe("tenants reais não herdam conteúdo demonstrativo", () => {
  const hosts = [
    "100limites.tur.br",
    "paraisoviagens.com",
    "destinoscomaju.com.br",
    "faeviagens.com.br",
    "outra-agencia.com.br",
  ];

  it("nenhum perfil real é demo nem recebe DMC/equipe/depoimentos fictícios", () => {
    for (const host of hosts) {
      const p = resolveSiteProfile(host);
      expect(p.demo).toBeFalsy();
      expect(p.dmc).toBeUndefined();
      expect(p.team).toBeUndefined();
      expect(p.testimonials).toBeUndefined();
      expect(p.conciergePoints).toBeUndefined();
    }
  });

  it("mantém as seções atuais dos tenants reais (sem ligar tudo)", () => {
    for (const host of hosts) {
      const rendered = resolveSections(resolveSiteProfile(host).sections).map((s) => s.key);
      expect(rendered).not.toContain("testimonials");
      expect(rendered.length).toBeLessThan(catalogSectionKeys().length);
    }
  });
});
