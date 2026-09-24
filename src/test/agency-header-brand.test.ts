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
    expect(resolveAgencyHeaderBrandPreset("destinoscomaju.com.br").logoClassName).toContain("md:h-24");
    expect(resolveAgencyHeaderBrandPreset("paraisoviagens.com").logoClassName).toContain("md:h-16");
    expect(resolveAgencyHeaderBrandPreset("100limites.tur.br").logoClassName).toContain("md:h-[72px]");
    expect(resolveAgencyHeaderBrandPreset("essyatur.com.br").logoClassName).toContain("md:h-24");
  });

  it("não altera um hostname de controle", () => {
    expect(resolveAgencyHeaderBrandPreset("faeviagens.com.br")).toEqual({
      logoOnly: false,
      headerClassName: "h-16",
      logoClassName: "h-10 w-auto max-w-[160px] object-contain",
    });
  });
});