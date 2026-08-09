import { describe, it, expect } from "vitest";
import {
  isPotentialAgencyHost,
  normalizeHostname,
  agencyHostFromLocation,
  agencyDisplayName,
  agencyWhatsappNumber,
  type AgencyDomainInfo,
} from "@/lib/agencyDomains";
import { buildOrcamentoLink } from "@/lib/orcamento-domain";
import { buildRoteiroLink } from "@/lib/roteiro-domain";
import { buildCarteiraLink } from "@/lib/carteira-domain";

describe("hostname → agency resolution", () => {
  it("normalizes hostnames", () => {
    expect(normalizeHostname(" 100LIMITES.tur.br:8080 ")).toBe("100limites.tur.br");
  });

  it("accepts the agency root and www hosts", () => {
    expect(isPotentialAgencyHost("100limites.tur.br")).toBe(true);
    expect(isPotentialAgencyHost("www.100limites.tur.br")).toBe(true);
  });

  it("never treats platform hosts as agency domains", () => {
    for (const host of [
      "app.agentesdesonhos.com.br",
      "agentesdesonhos.com.br",
      "vitrine.tur.br",
      "www.vitrine.tur.br",
      "carteiradigital.tur.br",
      "seuorcamento.tur.br",
      "seuroteiro.tur.br",
      "contato.tur.br",
      "comandatuba.proximaviagem.tur.br",
      "lp.vitrine.tur.br",
      "ativar-cartao.tur.br",
      "agentedesonhoproject.lovable.app",
      "id-preview--abc.lovable.app",
      "localhost",
    ]) {
      expect(isPotentialAgencyHost(host), host).toBe(false);
    }
  });

  it("supports the preview override only for valid agency hosts", () => {
    expect(agencyHostFromLocation("id-preview--x.lovable.app", "?__agency_host=100limites.tur.br"))
      .toBe("100limites.tur.br");
    expect(agencyHostFromLocation("id-preview--x.lovable.app", "?__agency_host=vitrine.tur.br"))
      .toBeNull();
    expect(agencyHostFromLocation("id-preview--x.lovable.app", "")).toBeNull();
  });
});

describe("tenant display fallbacks", () => {
  const base: AgencyDomainInfo = {
    user_id: "u1", agency_slug: "100-limites-viagens", hostname: "100limites.tur.br",
    is_primary: true, agency_name: null, owner_name: "Amanda Larini", logo_url: null,
    cover_image_url: null, primary_color: null, phone: null, city: null, state: null,
    bio: null, public_slug: "100-limites-viagens",
  };

  it("falls back from agency name to owner name", () => {
    expect(agencyDisplayName({ ...base, agency_name: "100 Limites Viagens" })).toBe("100 Limites Viagens");
    expect(agencyDisplayName(base)).toBe("Amanda Larini");
    expect(agencyDisplayName(null)).toBe("Sua agência de viagens");
  });

  it("only builds a WhatsApp number from a usable phone", () => {
    expect(agencyWhatsappNumber(base)).toBeNull();
    expect(agencyWhatsappNumber({ ...base, phone: "(11) 99999-8888" })).toBe("5511999998888");
    expect(agencyWhatsappNumber({ ...base, phone: "5511999998888" })).toBe("5511999998888");
    expect(agencyWhatsappNumber({ ...base, phone: "1234" })).toBeNull();
  });
});

describe("public link builders", () => {
  it("uses the agency domain when it exists", () => {
    expect(buildOrcamentoLink("100 Limites Viagens", "ABC123", "100limites.tur.br"))
      .toBe("https://100limites.tur.br/orcamento/ABC123");
    expect(buildRoteiroLink("100 Limites Viagens", "ABC123", "100limites.tur.br"))
      .toBe("https://100limites.tur.br/roteiro/ABC123");
    expect(buildCarteiraLink("100 Limites Viagens", "ABC123", "100limites.tur.br"))
      .toBe("https://100limites.tur.br/carteira/ABC123");
  });

  it("keeps the generic domains when the agency has no custom domain", () => {
    expect(buildOrcamentoLink("Outra Agência", "XYZ9"))
      .toBe("https://seuorcamento.tur.br/outra-agencia/XYZ9");
    expect(buildRoteiroLink("Outra Agência", "XYZ9"))
      .toBe("https://seuroteiro.tur.br/outra-agencia/XYZ9");
    expect(buildCarteiraLink("Outra Agência", "XYZ9"))
      .toBe("https://carteiradigital.tur.br/outra-agencia/XYZ9");
  });
});