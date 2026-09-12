/**
 * Tenant de prévia Casa Nova Tur: configuração declarativa sobre a arquitetura
 * compartilhada (perfil + tema + logo + contatos), sem afetar outros tenants.
 */
import { describe, it, expect } from "vitest";
import { resolveProfileKey, resolveSiteProfile } from "@/lib/agencySiteProfile";
import {
  isEditorialTheme,
  resolveSiteTheme,
  siteThemeRootClass,
} from "@/lib/agencySiteTheme";
import { resolveAgencyLogoOverride, logoIncludesWordmark } from "@/lib/agencySiteBrand";
import { resolveSiteContacts } from "@/lib/agencySiteContacts";
import { resolveSiteStatus } from "@/lib/agencySiteStatus";
import { agencyHostFromLocation } from "@/lib/agencyDomains";

const HOST = "casanovatur.demo.local";

describe("Casa Nova Tur — host técnico de prévia", () => {
  it("resolve o perfil e o tema próprios pelo hostname", () => {
    expect(resolveProfileKey(HOST)).toBe("casaNovaCurated");
    expect(resolveSiteTheme(HOST)).toBe("casaNovaEditorial");
    expect(isEditorialTheme(HOST)).toBe(true);
    expect(siteThemeRootClass(HOST)).toBe("wl-editorial wl-casanova");
  });

  it("aceita o host apenas via override seguro de prévia", () => {
    expect(agencyHostFromLocation("id-preview--x.lovable.app", `?__agency_host=${HOST}`)).toBe(HOST);
    expect(agencyHostFromLocation("id-preview--x.lovable.app", "")).toBeNull();
  });

  it("usa o logotipo enviado e não repete o nome ao lado da arte", () => {
    expect(resolveAgencyLogoOverride(HOST)).toContain("logo-casa-nova-tur.png");
    expect(logoIncludesWordmark(HOST)).toBe(true);
  });

  it("expõe e-mail público e Instagram oficiais", () => {
    const contacts = resolveSiteContacts(HOST);
    expect(contacts.email).toBe("contact@casanovatur.com.br");
    expect(contacts.instagram).toBe("https://www.instagram.com/casanova_viagens_rs");
  });

  it("não é demonstração do SiteLab e não exibe ofertas fictícias", () => {
    const profile = resolveSiteProfile(HOST);
    expect(profile.demo).toBeUndefined();
    expect(profile.sections?.offers?.enabled).toBe(false);
    expect(profile.sections?.testimonials?.enabled).toBe(false);
    expect(profile.sections?.team?.enabled).toBe(false);
    expect(profile.sections?.credentials?.enabled).toBe(false);
    const dmc = profile.sections?.dmc;
    expect(dmc === false || (dmc && dmc.enabled === false)).toBe(true);
  });

  it("publica o conteúdo factual solicitado", () => {
    const profile = resolveSiteProfile(HOST);
    expect(profile.hero?.[0].title).toBe("A viagem dos seus sonhos começa aqui");
    expect(profile.signature?.title).toBe(
      "Não vendemos apenas pacotes. Planejamos experiências que marcam histórias.",
    );
    const titles = (profile.destinations ?? []).map((d) => d.title);
    expect(titles).toEqual([
      "Resorts no Brasil",
      "Cruzeiros",
      "Orlando e parques",
      "Europa e roteiros internacionais",
      "Lua de mel",
      "Viagens em família",
    ]);
    // Nenhum dado inventado: sem depoimentos, equipe ou selo temporal.
    expect(profile.testimonials).toBeUndefined();
    expect(profile.team).toBeUndefined();
    expect(profile.about?.badge).toBeUndefined();
  });

  it("o host técnico não entra em modo construção", () => {
    expect(resolveSiteStatus(HOST)).toBe("live");
  });
});

describe("isolamento dos demais tenants", () => {
  it("não altera hosts existentes nem o laboratório", () => {
    expect(resolveProfileKey("faeviagens.com.br")).toBe("faeCurated");
    expect(resolveProfileKey("sitelab.local")).toBe("siteLabBase");
    expect(resolveProfileKey("www.100limites.tur.br")).toBe("editorialDmc");
    expect(resolveSiteTheme("faeviagens.com.br")).toBe("faeEditorial");
    expect(resolveAgencyLogoOverride("sitelab.local")).toBeNull();
    expect(resolveSiteContacts("faeviagens.com.br")).toEqual({});
    expect(resolveSiteContacts("sitelab.local")).toEqual({});
  });
});

describe("navegação declarativa", () => {
  it("oculta Ofertas quando o perfil desativa a seção e mantém nos demais", async () => {
    const { siteNavLinks } = await import("@/components/whitelabel/AgencySiteLayout");
    expect(siteNavLinks(HOST).some((l) => l.to === "/ofertas")).toBe(false);
    expect(siteNavLinks("faeviagens.com.br").some((l) => l.to === "/ofertas")).toBe(true);
    expect(siteNavLinks("sitelab.local").some((l) => l.to === "/ofertas")).toBe(true);
  });
});
