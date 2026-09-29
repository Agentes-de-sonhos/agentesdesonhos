import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { isTechnicalPreviewHost, ADS_PREVIEW_HOST, ADS_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Página não encontrada</p> }));

describe("prévia ADS ads-email-test-v1", () => {
  it("só aceita o host técnico id-preview (e localhost de dev)", () => {
    expect(isTechnicalPreviewHost("id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app")).toBe(true);
    for (const h of ["agentedesonhoproject.lovable.app", "app.agentesdesonhos.com.br", "www.destinoscomaju.com.br",
      "preview--x.lovable.app", "id-preview--x.lovable.app.evil.com", "vitrine.tur.br"]) {
      expect(isTechnicalPreviewHost(h)).toBe(false);
    }
  });
  it("host sintético resolve o perfil da fixture e não toca tenants", () => {
    expect(resolveSiteProfile(ADS_PREVIEW_HOST).key).toBe("adsEmailTestV1");
    expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
    expect(ADS_PREVIEW_INFO.agency_slug).toBe("");
    expect(ADS_PREVIEW_INFO.public_slug).toBeNull();
    expect(ADS_PREVIEW_INFO.phone).toBeNull();
  });
  it("em host de produção a rota mostra página não encontrada", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "agentedesonhoproject.lovable.app" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
    expect(screen.queryByText(/Agência Teste ADS/)).toBeNull();
  });
});
