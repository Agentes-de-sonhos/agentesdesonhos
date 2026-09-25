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
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Xcaret com o olhar");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const badge = screen.getByAltText(/Selo Xperts Xcaret 2026/);
    const juliana = screen.getByAltText(/Juliana ao lado do letreiro Xplor/);
    expect(badge.className).toContain("rounded-xl");
    expect(badge.className).not.toContain("rounded-full");
    expect(juliana.getAttribute("style")).toContain("object-position: 50% 18%");
    expect(juliana.className).toContain("aspect-[4/3]");
    expect(screen.getByAltText(/Vista aérea do Parque Xcaret/).className).toContain("scale-[1.08]");
    expect(screen.getByRole("link", { name: /Conheça o Xcaret com a Ju/ }).getAttribute("href")).toContain("/xcaret");
  });

  it("sem URL, botão fica inativo e não vira link", () => {
    const cfg = { ...resolveSiteProfile("destinoscomaju.com.br").featuredExperience!, ctaHref: null };
    render(<AgencyFeaturedExperienceSection config={cfg} container="" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: /Conheça o Xcaret/ })).toBeDisabled();
  });
});
