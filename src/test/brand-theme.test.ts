import { describe, expect, it } from "vitest";
import { brandThemeVars, deriveSecondaryColor } from "@/lib/brandTheme";

describe("identidade visual global das agências", () => {
  it("gera tom claro automático a partir da cor principal", () => {
    const soft = deriveSecondaryColor("#0284C7");
    expect(soft).toMatch(/^#[0-9A-F]{6}$/);
    expect(soft).not.toBe("#0284C7");
  });

  it("expõe tokens de marca e sobrescreve os tokens do design system", () => {
    const vars = brandThemeVars({ primary: "#0284C7" });
    expect(vars["--brand-primary"]).toBeTruthy();
    expect(vars["--brand-secondary"]).toBeTruthy();
    // tokens shadcn são sobrescritos em HSL ("H S% L%")
    expect(vars["--primary"]).toMatch(/^\d+ \d+% \d+%$/);
    expect(vars["--ring"]).toBe(vars["--primary"]);
    expect(vars["--accent"]).toBeTruthy();
  });

  it("escolhe texto legível sobre a cor principal", () => {
    const dark = brandThemeVars({ primary: "#0F172A" })["--brand-on-primary"];
    const light = brandThemeVars({ primary: "#FDE047" })["--brand-on-primary"];
    expect(dark).not.toBe(light);
  });

  it("sem cor configurada, usa a cor padrão da plataforma", () => {
    expect(brandThemeVars({ primary: null })["--brand-primary"]).toBe("#0284C7");
  });
});
