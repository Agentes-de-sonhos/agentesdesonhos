import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CruiseCompanyLogo, resolveCruiseLogoUrl } from "@/components/mapa-turismo/CruiseCompanyLogo";

describe("resolveCruiseLogoUrl", () => {
  it("usa logo do perfil comercial quando a companhia não tem", () => {
    expect(resolveCruiseLogoUrl({ logo_url: null, operator: { logo_url: "https://x/o.png" } })).toBe("https://x/o.png");
  });
  it("prioriza logo da companhia", () => {
    expect(resolveCruiseLogoUrl({ logo_url: "https://x/c.png", operator: { logo_url: "https://x/o.png" } })).toBe("https://x/c.png");
  });
  it("retorna null para vazio/nulo", () => {
    expect(resolveCruiseLogoUrl({ logo_url: "   ", operator: null })).toBeNull();
    expect(resolveCruiseLogoUrl({})).toBeNull();
  });
});

describe("CruiseCompanyLogo", () => {
  it("exibe logo cadastrado com alt adequado e lazy loading", () => {
    render(<CruiseCompanyLogo nome="MSC Cruzeiros" logoUrl="https://x/msc.png" />);
    const img = screen.getByAltText("Logotipo da MSC Cruzeiros") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.className).toContain("object-contain");
    expect(screen.queryByTestId("cruise-company-logo-fallback")).toBeNull();
  });

  it("usa ícone Ship quando não há logo", () => {
    render(<CruiseCompanyLogo nome="Costa" logoUrl={null} />);
    expect(screen.getByTestId("cruise-company-logo-fallback")).toBeTruthy();
  });

  it("troca para Ship quando a imagem falha", () => {
    render(<CruiseCompanyLogo nome="Costa" logoUrl="https://x/broken.png" />);
    fireEvent.error(screen.getByAltText("Logotipo da Costa"));
    expect(screen.getByTestId("cruise-company-logo-fallback")).toBeTruthy();
  });

  it("mantém dimensões reservadas do container", () => {
    render(<CruiseCompanyLogo nome="Costa" logoUrl={null} className="h-14 w-14 rounded-xl" />);
    expect(screen.getByTestId("cruise-company-logo").className).toContain("h-14 w-14");
  });
});