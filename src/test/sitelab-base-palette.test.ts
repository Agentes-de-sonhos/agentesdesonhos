import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandThemeVars, toHslTriplet } from "@/lib/brandTheme";
import { SITELAB_BASE } from "@/lib/sitelabModels";

const css = readFileSync("src/index.css", "utf8");
const hook = readFileSync("src/lib/useAgencyBrandTheme.ts", "utf8");

function block(selector: string): string {
  const start = css.indexOf(selector + " {");
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("SiteLab Base — paleta dinâmica de 3 cores", () => {
  const vars = brandThemeVars({
    primary: SITELAB_BASE.palette.primary,
    secondary: SITELAB_BASE.palette.secondary,
    secondaryAuto: false,
    tertiary: SITELAB_BASE.palette.tertiary,
    tertiaryAuto: false,
  });

  it("gera triplets HSL para #4B2A6E / #FFD600 / #F3EFF7", () => {
    expect(vars["--brand-primary-hsl"]).toBe(toHslTriplet("#4B2A6E"));
    expect(vars["--brand-secondary-hsl"]).toBe(toHslTriplet("#FFD600"));
    expect(vars["--brand-tertiary-hsl"]).toBe(toHslTriplet("#F3EFF7"));
    expect(vars["--brand-secondary"]).toBe("#FFD600");
    expect(vars["--brand-tertiary"]).toBe("#F3EFF7");
  });

  it("preserva contraste: secundária clara não assume texto branco", () => {
    expect(vars["--brand-on-secondary"]).toBe("#1E293B");
    expect(vars["--brand-on-secondary-hsl"]).toBe(toHslTriplet("#1E293B"));
    expect(vars["--brand-on-primary"]).toBe("#FFFFFF");
    expect(vars["--brand-on-tertiary"]).toBe("#1E293B");
  });

  it("o CSS base consome os tokens dinâmicos e não hardcodeia a paleta", () => {
    const base = block(".wl-editorial.wl-site-base");
    expect(base).toContain("--primary: var(--brand-primary-hsl");
    expect(base).toContain("--primary-foreground: var(--brand-on-primary-hsl");
    expect(base).toContain("--ring: var(--brand-secondary-hsl");
    expect(base).toContain("--accent: var(--brand-tertiary-hsl");
    expect(base).toContain("--wl-red: var(--brand-secondary-hsl");
    expect(base).toContain("--wl-navy: var(--brand-primary-hsl");
    expect(base).toContain("--wl-sand: var(--brand-tertiary-hsl");
    // Nenhum valor da paleta do laboratório fixado no CSS do tema base.
    for (const hardcoded of ["4b2a6e", "ffd600", "f3eff7", "270 44%", "268 24%", "270 22%"]) {
      expect(base.toLowerCase()).not.toContain(hardcoded);
    }
  });

  it("o hook reaplica o tema quando só a terciária muda", () => {
    expect(hook).toContain("input?.tertiary");
    expect(hook).toContain("input?.tertiaryAuto");
    const onlyTertiaryChanged = brandThemeVars({
      primary: SITELAB_BASE.palette.primary,
      secondary: SITELAB_BASE.palette.secondary,
      secondaryAuto: false,
      tertiary: "#E8F5E9",
      tertiaryAuto: false,
    });
    expect(onlyTertiaryChanged["--brand-tertiary-hsl"]).not.toBe(vars["--brand-tertiary-hsl"]);
  });

  it("mantém .wl-fae e os demais acabamentos intactos", () => {
    const fae = block(".wl-editorial.wl-fae");
    expect(fae).toContain("--primary: 272 47% 33%");
    expect(fae).toContain("--wl-red: 42 62% 42%");
    expect(fae).not.toContain("var(--brand-");
    expect(block(".wl-editorial.wl-luxury")).not.toContain("var(--brand-");
    expect(block(".wl-editorial.wl-rose")).not.toContain("var(--brand-");
  });
});
