import { describe, it, expect } from "vitest";
import {
  buildLegacyToolUrl,
  buildPublicToolUrl,
  MISSING_SLUG_MESSAGE,
  normalizeAgencySiteSlug,
  normalizePublicHostname,
  resolveQuotePublicUrl,
} from "@/lib/publicAgencyUrls";

describe("URLs públicas da agência", () => {
  it("gera exatamente o formato canônico dos sites-modelo", () => {
    expect(
      buildPublicToolUrl({ kind: "orcamento", agencySlug: "casa-nova-tur", accessCode: "ABC123" }),
    ).toBe("https://vitrine.tur.br/casa-nova-tur/orcamento/ABC123");
  });

  it("usa o domínio próprio quando a agência tem um", () => {
    expect(
      buildPublicToolUrl({
        kind: "orcamento",
        agencySlug: "fae-viagens",
        accessCode: "XYZ",
        customDomain: "faeviagens.com.br",
      }),
    ).toBe("https://faeviagens.com.br/orcamento/XYZ");
  });

  it("ignora hostnames internos e volta para o host oficial", () => {
    expect(normalizePublicHostname("sitelab.local")).toBeNull();
    expect(
      buildPublicToolUrl({
        kind: "orcamento",
        agencySlug: "sitelab-base",
        accessCode: "C1",
        customDomain: "sitelab.local",
      }),
    ).toBe("https://vitrine.tur.br/sitelab-base/orcamento/C1");
  });

  it("não gera link quando falta slug e código público", () => {
    expect(buildPublicToolUrl({ kind: "orcamento", agencySlug: null, accessCode: "C1" })).toBeNull();
    expect(buildPublicToolUrl({ kind: "orcamento", agencySlug: "slug", accessCode: "" })).toBeNull();
  });

  it("rejeita slugs reservados/inválidos", () => {
    expect(normalizeAgencySiteSlug("orcamento")).toBeNull();
    expect(normalizeAgencySiteSlug("  Casa-Nova-Tur ")).toBe("casa-nova-tur");
  });

  it("preserva o link legado por token", () => {
    expect(buildLegacyToolUrl("orcamento", "tok123")).toBe("https://seuorcamento.tur.br/orcamento/tok123");
  });

  it("resolve: canônico > legado > erro orientativo", () => {
    expect(
      resolveQuotePublicUrl({ agencySlug: "casa-nova-tur", accessCode: "AA", shareToken: "tok" }),
    ).toEqual({ ok: true, canonical: true, url: "https://vitrine.tur.br/casa-nova-tur/orcamento/AA" });

    expect(resolveQuotePublicUrl({ agencySlug: null, accessCode: null, shareToken: "tok" })).toEqual({
      ok: true,
      canonical: false,
      url: "https://seuorcamento.tur.br/orcamento/tok",
    });

    expect(resolveQuotePublicUrl({ agencySlug: null, accessCode: null, shareToken: null })).toEqual({
      ok: false,
      error: MISSING_SLUG_MESSAGE,
    });
  });

  it("copiar/compartilhar e abrir usam a mesma URL resolvida", () => {
    const a = resolveQuotePublicUrl({ agencySlug: "paraiso-viagens", accessCode: "PV1" });
    const b = resolveQuotePublicUrl({ agencySlug: "paraiso-viagens", accessCode: "PV1" });
    expect(a).toEqual(b);
  });

  it("slug de outra agência produz outra URL — nunca o mesmo endereço", () => {
    const mine = buildPublicToolUrl({ kind: "orcamento", agencySlug: "casa-nova-tur", accessCode: "AA" });
    const other = buildPublicToolUrl({ kind: "orcamento", agencySlug: "paraiso-viagens", accessCode: "AA" });
    expect(mine).not.toBe(other);
  });
});
