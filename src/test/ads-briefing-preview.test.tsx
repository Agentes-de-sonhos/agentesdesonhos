import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  isTechnicalPreviewHost,
  ADS_PREVIEW_HOST,
  ADS_PREVIEW_INFO,
  MUNDO_EM_CORES_PREVIEW_HOST,
  MUNDO_EM_CORES_PREVIEW_INFO,
  DRICA_VIAGENS_PREVIEW_HOST,
  DRICA_VIAGENS_PREVIEW_INFO,
  resolveAdsPreviewFixture,
} from "@/lib/adsBriefingPreview";
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
  it("mantém briefing-14 separado, sem contexto de tenant ou domínio público", () => {
    const fixture = resolveAdsPreviewFixture("briefing-14-v1");
    expect(fixture?.profile.key).toBe("mundoEmCoresBriefing14");
    expect(resolveSiteProfile(MUNDO_EM_CORES_PREVIEW_HOST).key).toBe("mundoEmCoresBriefing14");
    expect(MUNDO_EM_CORES_PREVIEW_INFO.agency_slug).toBe("");
    expect(MUNDO_EM_CORES_PREVIEW_INFO.public_slug).toBeNull();
    expect(MUNDO_EM_CORES_PREVIEW_INFO.hostname).not.toContain("omundoemcores.com.br");
    expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
  });
  it("mantém briefing-16 isolado, com identidade e conteúdo locais", () => {
    const fixture = resolveAdsPreviewFixture("briefing-16-v1");
    expect(fixture?.profile.key).toBe("dricaViagensBriefing16");
    expect(fixture?.info.agency_name).toBe("Drica Viagens");
    expect(resolveSiteProfile(DRICA_VIAGENS_PREVIEW_HOST).key).toBe("dricaViagensBriefing16");
    expect(DRICA_VIAGENS_PREVIEW_INFO.agency_slug).toBe("");
    expect(DRICA_VIAGENS_PREVIEW_INFO.public_slug).toBeNull();
    expect(DRICA_VIAGENS_PREVIEW_INFO.phone).toBeNull();
    expect(DRICA_VIAGENS_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-000000000016");
    expect(DRICA_VIAGENS_PREVIEW_INFO.hostname).not.toContain("dricaviagens.rio");
    expect(resolveSiteProfile("dricaviagens.rio").key).toBe("classic");
    expect(fixture?.profile.sections?.offers).toEqual({ enabled: false });
    expect(fixture?.profile.sections?.testimonials).toEqual({ enabled: false });
  });
  it("não resolve identificadores desconhecidos", () => {
    expect(resolveAdsPreviewFixture("briefing-999-v1")).toBeNull();
  });
  it("em host de produção a rota mostra página não encontrada", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "agentedesonhoproject.lovable.app" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
    expect(screen.queryByText(/Agência Teste ADS/)).toBeNull();
  });
  it("renderiza o aviso real apenas para o briefing-14 no host técnico", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    render(
      <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-14-v1"]}>
        <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
    expect(screen.queryByText(/agência fictícia/i)).toBeNull();
  });
  it("renderiza o briefing-16 somente pela rota técnica", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    render(
      <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-16-v1"]}>
        <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
    expect(await screen.findByText("Drica Viagens")).toBeInTheDocument();
  });
});
