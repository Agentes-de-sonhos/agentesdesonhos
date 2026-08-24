import { describe, expect, it } from "vitest";
import { portalThemeClass } from "@/lib/agencySitePortalTheme";

describe("herança de tema em conteúdo renderizado em portal", () => {
  it("propaga a camada exclusiva da Paraíso (wl-luxury) para portals", () => {
    for (const host of ["paraisoviagens.com", "www.paraisoviagens.com"]) {
      expect(portalThemeClass(host)).toBe("wl-editorial wl-luxury");
    }
  });

  it("não altera os demais white labels", () => {
    expect(portalThemeClass("100limites.tur.br")).toBe("wl-editorial");
    expect(portalThemeClass("destinoscomaju.com.br")).toBe("wl-editorial wl-rose");
    expect(portalThemeClass("app.agentesdesonhos.com.br")).toBe("");
  });
});
