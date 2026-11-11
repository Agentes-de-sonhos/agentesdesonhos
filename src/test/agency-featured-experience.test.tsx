import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { AgencyFeaturedExperienceSection } from "@/components/whitelabel/AgencyFeaturedExperienceSection";

describe("Experiência em destaque", () => {
  it("ativa somente na Destinos com a Ju", () => {
    const ju = resolveSiteProfile("www.destinoscomaju.com.br");
    expect(ju.featuredExperience?.enabled).toBe(true);
    expect(ju.featuredExperience?.ctaHref).toBe("/xcaret");
    for (const h of ["100limites.tur.br", "paraisoviagens.com", "www.essyatur.com.br", "localhost"]) {
      expect(resolveSiteProfile(h).featuredExperience).toBeUndefined();
    }
  });

  it("renderiza conteúdo e link configurado", () => {
    const cfg = resolveSiteProfile("destinoscomaju.com.br").featuredExperience!;
    render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Somos uma agência Xperts Xcaret Oficial");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    // A montagem enviada já traz o selo Xperts e as fotos da Juliana, então não
    // há sobreposições renderizadas pelo código (evita duplicar e cortar).
    expect(screen.queryByAltText(/Selo Xperts Xcaret 2026/)).toBeNull();
    expect(screen.queryByAltText(/Juliana ao lado do letreiro Xplor/)).toBeNull();
    const cover = screen.getByAltText(/Montagem com Juliana no letreiro do Parque Xcaret/);
    expect(cover.className).toContain("object-contain");
    expect(cover.className).not.toContain("scale-[1.08]");
    expect(screen.getByRole("link", { name: /Saiba mais sobre este destino/ }).getAttribute("href")).toContain("/xcaret");
  });

  it("sem URL, botão fica inativo e não vira link", () => {
    const cfg = { ...resolveSiteProfile("destinoscomaju.com.br").featuredExperience!, ctaHref: null };
    render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: /Saiba mais sobre este destino/ })).toBeDisabled();
  });

  it("O Mundo em Cores: título e dois parágrafos do texto enviado pela agência", () => {
    const cfg = resolveSiteProfile("omundoemcores.com.br").featuredExperience!;
    expect(cfg.title).toBe("Sou uma agente especialista Xcaret");
    const { container } = render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Sou uma agente especialista Xcaret");
    const paras = Array.from(container.querySelectorAll("p")).map((p) => p.textContent?.trim());
    expect(paras).toContain(
      "Em set/2026, Vanessa foi convidada a integrar o programa Xperts, que seleciona agentes de viagens de todo o Brasil para se tornarem especialistas no destino. Ela passou por uma imersão na Riviera Maya, vivenciou os parques e hotéis do Grupo Xcaret, concluiu a capacitação e recebeu o selo Xperts Xcaret.",
    );
    expect(paras).toContain(
      "Hoje ela usa essa experiência para desenhar viagens que combinem com o seu ritmo, seja em família, entre amigos, a dois ou para celebrar uma data especial.",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("O Mundo em Cores: no celular, a foto entra entre o título e os parágrafos", () => {
    const cfg = resolveSiteProfile("omundoemcores.com.br").featuredExperience!;
    expect(cfg.mobileGalleryAboveText).toBe(true);
    const { container } = render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    const firstPara = Array.from(container.querySelectorAll("p")).find((p) =>
      (p.textContent ?? "").startsWith("Em set/2026"),
    )!;
    // título = 1, foto = 2, parágrafos = 3, destaques/botão = 4
    expect(firstPara.parentElement?.className).toContain("order-3");
    expect(container.querySelector(".order-2")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Saiba mais sobre este destino/ }).closest("div.mt-8")?.parentElement?.className).toContain(
      "order-4",
    );
    // O primeiro parágrafo não soma margem própria: o vão vem do espaçamento da grade.
    expect(firstPara.className).not.toContain("mt-4");
    // Desktop inalterado: as três partes seguem na mesma coluna de texto.
    expect(firstPara.parentElement?.className).toContain("lg:order-none");
  });

  it("Destinos com a Ju: sem o opt-in, os parágrafos continuam antes da foto", () => {
    const cfg = resolveSiteProfile("destinoscomaju.com.br").featuredExperience!;
    expect(cfg.mobileGalleryAboveText).toBeUndefined();
    const { container } = render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    const firstPara = Array.from(container.querySelectorAll("p")).find((p) =>
      (p.textContent ?? "").includes(cfg.description.split("\n\n")[0].trim().slice(0, 40)),
    )!;
    expect(firstPara.parentElement?.className).toContain("order-1");
    expect(firstPara.className).toContain("mt-4");
    expect(screen.getByRole("link", { name: /Saiba mais sobre este destino/ }).closest("div.mt-8")?.parentElement?.className).toContain(
      "order-3",
    );
  });

  it("descrição de um parágrafo continua renderizando um único bloco", () => {
    const cfg = resolveSiteProfile("destinoscomaju.com.br").featuredExperience!;
    const { container } = render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    const bodyParas = Array.from(container.querySelectorAll("p")).filter((p) =>
      (p.textContent ?? "").includes(cfg.description),
    );
    expect(bodyParas).toHaveLength(1);
  });
});
