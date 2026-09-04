import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { agencyBrandInput, type AgencyDomainInfo } from "@/lib/agencyDomains";
import { brandThemeVars, deriveSecondaryColor } from "@/lib/brandTheme";
import {
  SITELAB_BASE,
  SITELAB_BASE_PATH,
  SITELAB_DEMO_HOSTNAME,
  sitelabModelFromRecord,
} from "@/lib/sitelabModels";

const root = readFileSync("src/pages/sitelab/SiteLabRoot.tsx", "utf8");

function info(extra: Partial<AgencyDomainInfo>): AgencyDomainInfo {
  return {
    user_id: "u",
    agency_slug: "x",
    hostname: "x.tur.br",
    is_primary: true,
    agency_name: "X",
    owner_name: "X",
    logo_url: null,
    cover_image_url: null,
    primary_color: "#4B2A6E",
    secondary_color: null,
    secondary_auto: true,
    phone: null,
    city: null,
    state: null,
    bio: null,
    public_slug: "x",
    cnpj: null,
    ...extra,
  } as AgencyDomainInfo;
}

describe("paleta de 3 cores de ponta a ponta", () => {
  it("mantém a terciária independente da secundária", () => {
    const vars = brandThemeVars(
      agencyBrandInput(
        info({
          secondary_color: "#FFD600",
          secondary_auto: false,
          tertiary_color: "#F3EFF7",
          tertiary_auto: false,
        }),
      ),
    );
    expect(vars["--brand-secondary"]).toBe("#FFD600");
    expect(vars["--brand-tertiary"]).toBe("#F3EFF7");
    expect(vars["--brand-range-fill"]).toBe("#F3EFF7");
  });

  it("agência legada só com primária mantém o fallback seguro", () => {
    const vars = brandThemeVars(agencyBrandInput(info({})));
    expect(vars["--brand-primary"]).toBe("#4B2A6E");
    expect(vars["--brand-tertiary"]).toBe(deriveSecondaryColor("#4B2A6E"));
  });
});

describe("Site Lab é consumidor mestre do template compartilhado", () => {
  it("renderiza as páginas reais de site, área do cliente e gestão", () => {
    expect(root).toContain("AgencySiteHome");
    expect(root).toContain("AgencySiteLayout");
    expect(root).toContain("AgencyClientArea");
    expect(root).not.toMatch(/SiteLabAdmin(Demo|Surfaces)/);
  });

  it("resolve o tenant técnico e não usa o hostname reservado da plataforma", () => {
    expect(SITELAB_BASE.adminHostname).toBe(SITELAB_DEMO_HOSTNAME);
    expect(root).not.toContain("window.location.hostname");
    expect(SITELAB_BASE_PATH).toBe("/sitelab-base");
  });

  it("entrega a paleta completa ao template", () => {
    expect(root).toContain("tertiary_color: model.palette.tertiary");
    const model = sitelabModelFromRecord(SITELAB_BASE, {
      admin_hostname: "outro.local",
    });
    expect(model.adminHostname).toBe("outro.local");
    expect(sitelabModelFromRecord(SITELAB_BASE, null).adminHostname).toBe(
      SITELAB_DEMO_HOSTNAME,
    );
  });
});
