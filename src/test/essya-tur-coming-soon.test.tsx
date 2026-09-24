import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  isUnderConstruction,
  resolveConstructionVariant,
  resolveSiteStatus,
} from "@/lib/agencySiteStatus";
import EssyaTurComingSoon from "@/pages/whitelabel/EssyaTurComingSoon";

describe("Essya Tur — site em construção", () => {
  it("configura o domínio essyatur.com.br como under_construction com variante exclusiva", () => {
    for (const host of ["essyatur.com.br", "www.essyatur.com.br"]) {
      expect(isUnderConstruction(host)).toBe(true);
      expect(resolveSiteStatus(host)).toBe("under_construction");
      expect(resolveConstructionVariant(host)).toBe("essyaTur");
    }
  });

  it("não afeta outros domínios", () => {
    expect(resolveConstructionVariant("100limites.tur.br")).toBe("default");
    expect(resolveSiteStatus("exemploqualquer.com.br")).toBe("live");
    expect(resolveConstructionVariant("exemploqualquer.com.br")).toBe("default");
  });

  it("renderiza a página estática com o logotipo e a mensagem, sem depender de cadastro", () => {
    render(<EssyaTurComingSoon />);
    const logo = screen.getByAltText("Essya Tur");
    expect(logo).toHaveAttribute("src", expect.stringContaining("/__l5e/assets-v1/"));
    expect(screen.getByText("Novo site em construção")).toBeInTheDocument();
    expect(screen.getByText(/Essya Tur/i)).toBeInTheDocument();
    expect(document.title).toBe("Essya Tur — Site em construção");
    // Página isolada: sem CTA, links ou navegação.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
