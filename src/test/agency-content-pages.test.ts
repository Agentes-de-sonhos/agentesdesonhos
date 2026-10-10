import { describe, it, expect } from "vitest";
import { resolveContentPage, resolveContentPages } from "@/lib/agencySiteContentPages";
import { siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";

describe("páginas institucionais do site da 100 Limites", () => {
  it("declara as sete páginas do portfólio", () => {
    expect(resolveContentPages("100limites.tur.br").map((p) => p.path)).toEqual([
      "/quem-somos/dmc",
      "/quem-somos/agencia",
      "/frota",
      "/passeios/lisboa",
      "/passeios/portugal",
      "/europa",
      "/pet-friendly",
    ]);
  });

  it("todo item de menu com caminho interno tem página correspondente", () => {
    const host = "100limites.tur.br";
    const internal = siteNavLinks(host)
      .flatMap((l) => [l, ...(l.children ?? [])])
      .map((l) => l.to)
      .filter((to) => to !== "/" && !to.includes("#") && !["/ofertas", "/dmc-portugal", "/visto-americano", "/area-do-cliente", "/blog"].includes(to));
    for (const to of internal) {
      expect(resolveContentPage(host, to), to).not.toBeNull();
    }
  });

  it("nenhum outro tenant recebe as páginas novas", () => {
    for (const host of [
      "paraisoviagens.com",
      "destinoscomaju.com.br",
      "faeviagens.com.br",
      "outra-agencia.com.br",
    ]) {
      expect(resolveContentPages(host)).toEqual([]);
      expect(resolveContentPage(host, "/frota")).toBeNull();
    }
  });

  it("cada página tem título, SEO e conteúdo editorial", () => {
    for (const page of resolveContentPages("100limites.tur.br")) {
      expect(page.title.length).toBeGreaterThan(10);
      expect(page.seo.description.length).toBeGreaterThan(30);
      expect((page.intro?.length ?? 0) + (page.cards?.length ?? 0) + (page.blocks?.length ?? 0)).toBeGreaterThan(0);
    }
  });
});
