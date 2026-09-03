import { describe, expect, it } from "vitest";
import { brandThemeVars, deriveSecondaryColor } from "@/lib/brandTheme";
import {
  SITELAB_BASE,
  SITELAB_DEMO_USER_ID,
  sitelabModelBySlug,
  sitelabModelFromRecord,
  sitelabPath,
} from "@/lib/sitelabModels";
import {
  buildSitelabGrant,
  isSitelabGrantValid,
  SITELAB_MAX_TTL_MS,
} from "@/lib/sitelabAccess";

describe("SiteLab Base", () => {
  it("tem identidade própria, independente da Faé", () => {
    expect(SITELAB_BASE.slug).toBe("sitelab-base");
    expect(SITELAB_BASE.name).toBe("SiteLab Base");
    expect(SITELAB_BASE.palette).toMatchObject({
      primary: "#4B2A6E",
      secondary: "#FFD600",
      tertiary: "#F3EFF7",
    });
    expect(SITELAB_DEMO_USER_ID).toBe("00000000-0000-0000-0000-000000000000");
    expect(sitelabModelBySlug("sitelab-base")).toBeTruthy();
  });

  it("resolve os três caminhos privados", () => {
    expect(sitelabPath("sitelab-base", "site")).toBe("/sitelab-base");
    expect(sitelabPath("sitelab-base", "clientArea")).toBe("/sitelab-base/area-do-cliente");
    expect(sitelabPath("sitelab-base", "admin")).toBe("/sitelab-base/gestao");
  });

  it("usa a configuração pública quando existir e mantém o fallback", () => {
    const model = sitelabModelFromRecord(SITELAB_BASE, {
      slug: "sitelab-base",
      name: "Modelo X",
      primary_color: "#123456",
    });
    expect(model.name).toBe("Modelo X");
    expect(model.palette.primary).toBe("#123456");
    expect(model.palette.tertiary).toBe(SITELAB_BASE.palette.tertiary);
    expect(sitelabModelFromRecord(SITELAB_BASE, null)).toEqual(SITELAB_BASE);
  });

  it("grant de sessão é escopado, expira e nunca excede 8 horas", () => {
    const now = 1_000_000;
    const grant = buildSitelabGrant("sitelab-base", now);
    expect(isSitelabGrantValid(grant, "sitelab-base", now + 60_000)).toBe(true);
    expect(isSitelabGrantValid(grant, "outro-modelo", now)).toBe(false);
    expect(isSitelabGrantValid(grant, "sitelab-base", now + SITELAB_MAX_TTL_MS + 1)).toBe(false);
    expect(isSitelabGrantValid(null, "sitelab-base")).toBe(false);
  });
});

describe("contrato de paleta de 3 cores", () => {
  it("expõe tokens explícitos de marca e de intervalo", () => {
    const vars = brandThemeVars({
      primary: "#4B2A6E",
      secondary: "#FFD600",
      secondaryAuto: false,
      tertiary: "#F3EFF7",
      tertiaryAuto: false,
    });
    expect(vars["--brand-primary"]).toBe("#4B2A6E");
    expect(vars["--brand-secondary"]).toBe("#FFD600");
    expect(vars["--brand-tertiary"]).toBe("#F3EFF7");
    expect(vars["--brand-focus-ring"]).toBeTruthy();
    expect(vars["--brand-range-edge"]).toBe(vars["--brand-primary"]);
    expect(vars["--brand-range-fill"]).toBe(vars["--brand-tertiary"]);
  });

  it("preserva a aparência dos tenants antigos (tom claro vira terciária)", () => {
    const legacyAuto = brandThemeVars({ primary: "#0284C7", secondaryAuto: true });
    expect(legacyAuto["--brand-tertiary"]).toBe(deriveSecondaryColor("#0284C7"));

    const legacyManual = brandThemeVars({
      primary: "#0284C7",
      secondary: "#E6F4FB",
      secondaryAuto: false,
    });
    expect(legacyManual["--brand-tertiary"]).toBe("#E6F4FB");
  });
});
