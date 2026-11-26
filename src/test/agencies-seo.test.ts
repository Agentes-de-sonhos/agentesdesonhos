import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolveAgencySharePreview, canonicalAgencyHost } from "@/lib/agencySharePreview";

const SITES: [string, string][] = [
  ["dricaviagens.com.br", "www.dricaviagens.com.br"],
  ["essyatur.com.br", "www.essyatur.com.br"],
  ["arenatravelgroup.com.br", "www.arenatravelgroup.com.br"],
  ["pristur.com.br", "www.pristur.com.br"],
  ["100limites.tur.br", "www.100limites.tur.br"],
  ["destinoscomaju.com.br", "www.destinoscomaju.com.br"],
  ["omundoemcores.com.br", "www.omundoemcores.com.br"],
  ["www.paraisoviagens.com", "paraisoviagens.com"],
];

describe("SEO das agências no ar", () => {
  it.each(SITES)("%s tem cartão do WhatsApp e canônica no próprio domínio", (host, canon) => {
    expect(canonicalAgencyHost(host)).toBe(canon);
    expect(resolveAgencySharePreview(host)?.canonical).toBe(`https://${canon}/`);
  });
  it("robots.txt declara o sitemap de cada agência", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    for (const [, canon] of SITES) expect(robots).toContain(`Sitemap: https://${canon}/sitemap-`);
  });
});
