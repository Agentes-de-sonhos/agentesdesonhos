import { describe, it, expect } from "vitest";
import {
  normalizeStatusHost,
  resolveSiteStatus,
  isUnderConstruction,
  resolveHomeSurface,
  isRouteGatedByStatus,
  resolveConstructionVariant,
} from "@/lib/agencySiteStatus";
import { formatCnpj } from "@/lib/agencyDomains";

const CONSTRUCTION_HOSTS = [
  "100limites.tur.br",
  "www.100limites.tur.br",
  "paraisoviagens.com",
  "www.paraisoviagens.com",
];

describe("agency site status", () => {
  it("normalizes hostnames (case, espaços e porta)", () => {
    expect(normalizeStatusHost(" WWW.ParaisoViagens.com:8080 ")).toBe("www.paraisoviagens.com");
    expect(normalizeStatusHost(" 100LIMITES.TUR.BR ")).toBe("100limites.tur.br");
    expect(normalizeStatusHost(null)).toBe("");
  });

  it("marca os quatro hostnames como under_construction", () => {
    for (const host of CONSTRUCTION_HOSTS) {
      expect(resolveSiteStatus(host), host).toBe("under_construction");
      expect(isUnderConstruction(host.toUpperCase()), host).toBe(true);
    }
  });

  it("mantém qualquer host não configurado como live", () => {
    for (const host of ["outraagencia.com.br", "www.outraagencia.com.br", "", null]) {
      expect(resolveSiteStatus(host as string | null)).toBe("live");
      expect(isUnderConstruction(host as string | null)).toBe(false);
    }
  });

  it("decide a superfície da rota / por hostname", () => {
    expect(resolveHomeSurface("paraisoviagens.com")).toBe("under_construction");
    expect(resolveHomeSurface("outraagencia.com.br")).toBe("site_home");
  });

  it("nunca bloqueia rotas transacionais e públicas", () => {
    const paths = [
      "/orcamento/ABC123",
      "/roteiro/ABC123",
      "/carteira/ABC123",
      "/fatura/ABC123",
      "/area-do-cliente",
      "/ofertas",
      "/politicasdeprivacidade",
      "/termosdeuso",
    ];
    for (const host of CONSTRUCTION_HOSTS) {
      for (const path of paths) {
        expect(isRouteGatedByStatus(path, host), `${host}${path}`).toBe(false);
      }
      expect(isRouteGatedByStatus("/", host), host).toBe(true);
    }
    expect(isRouteGatedByStatus("/", "outraagencia.com.br")).toBe(false);
  });
});

describe("formatCnpj", () => {
  it("formata CNPJ com 14 dígitos", () => {
    expect(formatCnpj("12345678000195")).toBe("12.345.678/0001-95");
    expect(formatCnpj("12.345.678/0001-95")).toBe("12.345.678/0001-95");
  });

  it("retorna null quando ausente ou inválido, sem inventar dígitos", () => {
    expect(formatCnpj(null)).toBeNull();
    expect(formatCnpj("")).toBeNull();
    expect(formatCnpj("123456")).toBeNull();
    expect(formatCnpj("123456780001950")).toBeNull();
  });
});

describe("variante da página temporária", () => {
  it("Destinos com a Ju volta ao modo em construção com variante exclusiva", () => {
    expect(isUnderConstruction("destinoscomaju.com.br")).toBe(true);
    expect(isUnderConstruction(" WWW.DestinosComAJu.com.br ")).toBe(true);
    expect(resolveConstructionVariant("destinoscomaju.com.br")).toBe("destinosComAJu");
    expect(resolveConstructionVariant("www.destinoscomaju.com.br")).toBe("destinosComAJu");
  });

  it("mantém a variante default nos demais domínios", () => {
    for (const host of [...CONSTRUCTION_HOSTS, "outraagencia.com.br", "", null]) {
      expect(resolveConstructionVariant(host as string | null), String(host)).toBe("default");
    }
  });
});

