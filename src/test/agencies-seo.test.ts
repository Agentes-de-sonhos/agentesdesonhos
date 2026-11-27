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
  it("robots.txt compartilhado não declara domínios ou sitemaps de agências", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).not.toMatch(/^Sitemap:/im);
    expect(robots).not.toMatch(/https?:\/\//i);
  });
  it("robots.txt mantém o rastreamento público e o bloqueio dos endpoints internos", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Disallow: \/\.lovable\/$/m);
  });
});
