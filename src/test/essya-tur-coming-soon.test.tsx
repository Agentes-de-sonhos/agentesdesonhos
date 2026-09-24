import { describe, expect, it } from "vitest";
import { isUnderConstruction, resolveSiteStatus } from "@/lib/agencySiteStatus";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { isEditorialTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import {
  canonicalRedirectHost,
  resolveSiteContacts,
  withSiteContacts,
} from "@/lib/agencySiteContacts";
import { siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";

const HOST = "www.essyatur.com.br";

describe("Essyatur — white label em www.essyatur.com.br", () => {
  it("site no ar (não mais em construção)", () => {
    expect(isUnderConstruction(HOST)).toBe(false);
    expect(resolveSiteStatus("essyatur.com.br")).toBe("live");
  });

  it("perfil, tema e menu próprios só para o hostname da Essyatur", () => {
    expect(resolveSiteProfile(HOST).key).toBe("essyaCurated");
    expect(isEditorialTheme(HOST)).toBe(true);
    expect(siteThemeRootClass(HOST)).toContain("wl-essya");
    expect(siteNavLinks(HOST).map((l) => l.label)).toEqual([
      "Início", "Sobre a Essyatur", "Experiências", "Serviços",
      "Inspirações", "Dúvidas Frequentes", "Contato", "Área do Cliente",
    ]);
    expect(resolveSiteProfile("100limites.tur.br").key).not.toBe("essyaCurated");
    expect(siteNavLinks("exemplo.com.br").map((l) => l.label)).not.toContain("Sobre a Essyatur");
  });

  it("contatos do briefing e redirecionamento do domínio sem www", () => {
    expect(resolveSiteContacts(HOST).email).toBe("contato@essyatur.com.br");
    expect(withSiteContacts({ hostname: HOST, phone: "(11) 96219-3690" }).phone).toBe("(11) 96494-2210");
    expect(withSiteContacts({ hostname: "outra.com.br", phone: "1" }).phone).toBe("1");
    expect(canonicalRedirectHost("essyatur.com.br")).toBe(HOST);
    expect(canonicalRedirectHost(HOST)).toBeNull();
  });

  it("não inventa depoimentos, equipe ou credenciais", () => {
    const p = resolveSiteProfile(HOST);
    expect(p.sections?.testimonials?.enabled).toBe(false);
    expect(p.sections?.credentials?.enabled).toBe(false);
    expect(p.testimonials).toBeUndefined();
  });
});
