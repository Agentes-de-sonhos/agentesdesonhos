import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  isTechnicalPreviewHost,
  ADS_PREVIEW_HOST,
  ADS_PREVIEW_INFO,
  MUNDO_EM_CORES_PREVIEW_HOST,
  MUNDO_EM_CORES_PREVIEW_INFO,
  DRICA_VIAGENS_PREVIEW_HOST,
  DRICA_VIAGENS_PREVIEW_INFO,
  VIAJAR_TIRISMO_PREVIEW_HOST,
  VIAJAR_TIRISMO_PREVIEW_INFO,
  resolveAdsPreviewFixture,
} from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Página não encontrada</p> }));

/** O layout consulta o status do blog (React Query): envolve com um client de teste. */
const renderPreview = (ui: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("prévia ADS ads-email-test-v1", () => {
  it("aceita os mesmos hosts técnicos do sistema (e localhost de dev)", () => {
    expect(isTechnicalPreviewHost("id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app")).toBe(true);
    expect(isTechnicalPreviewHost("preview--x.lovableproject.com")).toBe(true);
    for (const h of ["www.destinoscomaju.com.br", "id-preview--x.lovable.app.evil.com",
      "vitrine.tur.br", "app.agentesdesonhos.com.br"]) {
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
    renderPreview(<MemoryRouter><Page /></MemoryRouter>);
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
    expect(screen.queryByText(/Agência Teste ADS/)).toBeNull();
  });
  it("renderiza o aviso real apenas para o briefing-14 no host técnico", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    renderPreview(
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
    renderPreview(
      <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-16-v1"]}>
        <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-16-v1"]')).toBeInTheDocument();
  });

  describe("briefing-17-v1 (Viajar Tirismo)", () => {
    it("resolve somente pelo job_id exato", () => {
      expect(resolveAdsPreviewFixture("briefing-17-v1")?.profile.key).toBe("viajarTirismoBriefing17");
      for (const id of ["briefing-17", "Briefing-17-v1", "briefing-17-v1 ", "briefing-17-v2", "briefing-17-v1/"]) {
        expect(resolveAdsPreviewFixture(id)).toBeNull();
      }
    });
    it("usa identidade local, host e user_id sintéticos, sem tenant real", () => {
      const f = resolveAdsPreviewFixture("briefing-17-v1")!;
      expect(f.info.agency_name).toBe("Viajar Tirismo");
      expect(f.info.owner_name).toBe("Paula Gasparini");
      expect(VIAJAR_TIRISMO_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-000000000017");
      expect(VIAJAR_TIRISMO_PREVIEW_INFO.agency_slug).toBe("");
      expect(VIAJAR_TIRISMO_PREVIEW_INFO.public_slug).toBeNull();
      expect(VIAJAR_TIRISMO_PREVIEW_INFO.phone).toBeNull();
      expect(VIAJAR_TIRISMO_PREVIEW_HOST.endsWith(".preview.local")).toBe(true);
      expect(resolveSiteProfile(VIAJAR_TIRISMO_PREVIEW_HOST).key).toBe("viajarTirismoBriefing17");
      expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
    });
    it("mantém ações comerciais desativadas e seções sem conteúdo desligadas", () => {
      const p = resolveAdsPreviewFixture("briefing-17-v1")!.profile;
      expect(p.hideConciergeActions).toBe(true);
      for (const k of ["offers", "dmc", "team", "testimonials", "avaliacoes", "newsletter", "authority", "credentials"] as const) {
        expect(p.sections?.[k]).toEqual({ enabled: false });
      }
    });
    it("em host de produção não renderiza", async () => {
      Object.defineProperty(window, "location", { value: { ...window.location, hostname: "agentedesonhoproject.lovable.app" }, writable: true });
      const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
      renderPreview(
        <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-17-v1"]}>
          <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="briefing-17-v1"]')).toBeNull();
    });
    it("no host técnico bloqueia backend, cliques e envios", async () => {
      Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
      const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
      renderPreview(
        <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-17-v1"]}>
          <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="briefing-17-v1"]')).toBeInTheDocument();
      const backend = import.meta.env.VITE_SUPABASE_URL as string;
      if (backend) await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow(/backend desativado/);
      expect(window.open("https://example.com")).toBeNull();
      const form = document.createElement("form");
      document.body.appendChild(form);
      const ev = new Event("submit", { cancelable: true, bubbles: true });
      form.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
      const a = document.createElement("a");
      a.href = "https://wa.me/5527992419444";
      document.body.appendChild(a);
      const click = new MouseEvent("click", { cancelable: true, bubbles: true });
      a.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    });
  });
});
