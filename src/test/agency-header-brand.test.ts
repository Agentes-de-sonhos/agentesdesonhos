import { describe, expect, it } from "vitest";
import { resolveAgencyHeaderBrandPreset } from "@/lib/agencySiteBrand";

const TARGET_HOSTS = [
  "destinoscomaju.com.br",
  "www.destinoscomaju.com.br",
  "paraisoviagens.com",
  "www.paraisoviagens.com",
  "100limites.tur.br",
  "www.100limites.tur.br",
  "essyatur.com.br",
  "www.essyatur.com.br",
];

describe("cabeçalho somente com logotipo por tenant", () => {
  it.each(TARGET_HOSTS)("remove a repetição textual somente no cabeçalho de %s", (hostname) => {
    expect(resolveAgencyHeaderBrandPreset(hostname).logoOnly).toBe(true);
  });

  it("mantém dimensões próprias para cada identidade", () => {
    const destinos = resolveAgencyHeaderBrandPreset("destinoscomaju.com.br");
    expect(destinos.logoClassName).toContain("md:h-24");
    expect(destinos.logoClassName).toContain("md:max-w-[180px]");
    expect(destinos.logoUrl).toContain("logo-destinos-com-a-ju-setembro-2026.png");
    expect(resolveAgencyHeaderBrandPreset("paraisoviagens.com").logoClassName).toContain("md:h-16");
    expect(resolveAgencyHeaderBrandPreset("100limites.tur.br").logoClassName).toContain("md:h-[72px]");
    expect(resolveAgencyHeaderBrandPreset("essyatur.com.br").logoClassName).toContain("md:h-24");
  });

  it("preserva o fallback editorial comum da Faé", () => {
    expect(resolveAgencyHeaderBrandPreset("faeviagens.com.br")).toEqual({
      logoOnly: false,
      headerClassName: "h-20",
      logoClassName: "h-12 w-auto max-w-[200px] object-contain",
    });
  });

  it("preserva o fallback editorial comum da Casa Nova", () => {
    expect(resolveAgencyHeaderBrandPreset("casanovatur.demo.local")).toEqual({
      logoOnly: false,
      headerClassName: "h-20",
      logoClassName: "h-12 w-auto max-w-[200px] object-contain",
    });
  });

  it("preserva o fallback original de um hostname não editorial", () => {
    expect(resolveAgencyHeaderBrandPreset("agencia-controle.example")).toEqual({
      logoOnly: false,
      headerClassName: "h-16",
      logoClassName: "h-10 w-auto max-w-[160px] object-contain",
    });
  });
});