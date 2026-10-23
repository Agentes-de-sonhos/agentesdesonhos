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
  BAGAGEM_NA_MAO_PREVIEW_HOST,
  BAGAGEM_NA_MAO_PREVIEW_INFO,
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
      Object.defineProperty(window, "location", { value: { ...window.location, hostname: "www.destinoscomaju.com.br" }, writable: true });
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

  describe("briefing-19-v1 (Bagagem na Mão Viagens)", () => {
    it("resolve somente pelo job_id exato", () => {
      expect(resolveAdsPreviewFixture("briefing-19-v1")?.profile.key).toBe("bagagemNaMaoBriefing19");
      for (const id of ["briefing-19", "Briefing-19-v1", "briefing-19-v1 ", "briefing-19-v2", "briefing-19-v1/"]) {
        expect(resolveAdsPreviewFixture(id)).toBeNull();
      }
    });
    it("usa identidade local, host e user_id sintéticos, sem tenant real", () => {
      const f = resolveAdsPreviewFixture("briefing-19-v1")!;
      expect(f.info.agency_name).toBe("Bagagem na Mão Viagens");
      expect(f.info.owner_name).toBe("Márcia Baccarini");
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-000000000019");
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.agency_slug).toBe("");
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.public_slug).toBeNull();
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.phone).toBeNull();
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.primary_color).toBe("#27C7C3");
      expect(BAGAGEM_NA_MAO_PREVIEW_INFO.secondary_color).toBe("#FF9418");
      expect(BAGAGEM_NA_MAO_PREVIEW_HOST.endsWith(".preview.local")).toBe(true);
      expect(BAGAGEM_NA_MAO_PREVIEW_HOST).not.toContain("bagagemnamao.com.br");
      expect(resolveSiteProfile(BAGAGEM_NA_MAO_PREVIEW_HOST).key).toBe("bagagemNaMaoBriefing19");
      expect(resolveSiteProfile("www.bagagemnamao.com.br").key).toBe("classic");
      expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
    });
    it("mantém ações comerciais desativadas e seções sem dados confirmados desligadas", () => {
      const f = resolveAdsPreviewFixture("briefing-19-v1")!;
      const p = f.profile;
      expect(p.presentation).toBe(true);
      expect(p.hideConciergeActions).toBe(true);
      expect(p.visaHome).toBe(false);
      expect(p.featuredExperience).toBeUndefined();
      expect(p.dmc).toBeUndefined();
      expect(p.credentials).toBeUndefined();
      expect(p.team).toBeUndefined();
      for (const k of ["offers", "dmc", "team", "testimonials", "avaliacoes", "newsletter", "credentials"] as const) {
        expect(p.sections?.[k]).toEqual({ enabled: false });
      }
      // Sem páginas especiais Xcaret, DMC, Visto ou editorial (ofertas/blog).
      expect(f.pages?.xcaret).toBeUndefined();
      expect(f.pages?.visa).toBeUndefined();
      expect(f.pages?.dmc).toBeUndefined();
      expect(f.pages?.editorial).toBeUndefined();
    });
    it("carrega os contatos públicos somente como texto de rodapé", () => {
      const p = resolveAdsPreviewFixture("briefing-19-v1")!.profile;
      expect(p.footer?.whatsapp).toBe("(21) 98855-9515");
      expect(p.footer?.email).toBe("bagagemnamaoviagens@gmail.com");
      expect(p.footer?.instagram).toBe("https://www.instagram.com/bagagemnamaoviagens/");
      expect(p.footer?.legalName).toBe("Bagagem na Mão Viagens Ltda");
      expect(p.footer?.cnpj).toBe("64.731.514/0001-08");
      expect(p.footer?.address).toContain("Rua Conde de Bonfim, 211");
      expect(p.about?.ownerName).toBe("Márcia Baccarini");
      expect(p.about?.badge?.value).toBe("Desde 2014");
    });
    it("em host de produção não renderiza", async () => {
      Object.defineProperty(window, "location", { value: { ...window.location, hostname: "agentedesonhoproject.lovable.app" }, writable: true });
      const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
      renderPreview(
        <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-19-v1"]}>
          <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="briefing-19-v1"]')).toBeNull();
    });
    it("no host técnico renderiza com aviso, noindex e backend bloqueado", async () => {
      Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
      const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
      renderPreview(
        <MemoryRouter initialEntries={["/ads-briefing-preview/briefing-19-v1"]}>
          <Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Page />} /></Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="briefing-19-v1"]')).toBeInTheDocument();
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
      const backend = import.meta.env.VITE_SUPABASE_URL as string;
      if (backend) await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow(/backend desativado/);
      expect(window.open("https://wa.me/5521988559515")).toBeNull();
      const form = document.createElement("form");
      document.body.appendChild(form);
      const ev = new Event("submit", { cancelable: true, bubbles: true });
      form.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    });
  });
});


describe("Drica complete route security", () => {
  it("blocks rendering on real and published hosts", async () => {
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    for (const hostname of ["dricaviagens.rio", "www.dricaviagens.rio", "agentedesonhoproject.lovable.app", "another.lovable.app"]) {
      Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
      const result = renderPreview(<MemoryRouter initialEntries={["/ads-briefing-preview/drica-completa-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Page />} /></Routes></MemoryRouter>);
      expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="drica-completa-v1"]')).toBeNull();
      result.unmount();
    }
  });
  it("sets noindex and prevents backend, external actions and submits on technical host", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    const result = renderPreview(<MemoryRouter initialEntries={["/ads-briefing-preview/drica-completa-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Page />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Drica Viagens · apresentação completa para revisão/)).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
    const backend = import.meta.env.VITE_SUPABASE_URL as string;
    if (backend) await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow(/backend desativado/);
    expect(window.open("https://wa.me/5521987907853")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); result.unmount();
  });
});

describe("briefing-20-v1 (Curti Viagens)", () => {
  const route = (h: string) => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: h }, writable: true });
  };
  it("resolve apenas o job_id exato", () => {
    expect(resolveAdsPreviewFixture("briefing-20-v1")?.profile.key).toBe("curtiViagensBriefing20");
    for (const id of ["briefing-20", "Briefing-20-v1", "briefing-20-v1 ", "briefing-20-v2", "briefing-20-v1/", "curti-viagens", "curtiviagens"]) {
      expect(resolveAdsPreviewFixture(id)).toBeNull();
    }
  });
  it("usa identidade sintética e não toca outros perfis", () => {
    const i = resolveAdsPreviewFixture("briefing-20-v1")!.info;
    expect(i.user_id).toBe("00000000-0000-0000-0000-000000000020");
    expect(i.hostname).toBe("briefing-20-v1.preview.local");
    expect(i.agency_slug).toBe("");
    expect(i.public_slug).toBeNull();
    expect(i.is_primary).toBe(false);
    expect(i.phone).toBeNull();
    expect(i.primary_color).toBe("#2502FF");
    expect(i.secondary_color).toBe("#639682");
    expect(resolveSiteProfile("briefing-20-v1.preview.local").key).toBe("curtiViagensBriefing20");
    for (const h of ["curtiviagens.com.br", "www.curtiviagens.com.br", "briefing-20.preview.local"]) {
      expect(resolveSiteProfile(h).key).toBe("classic");
    }
    expect(resolveSiteProfile(BAGAGEM_NA_MAO_PREVIEW_HOST).key).toBe("bagagemNaMaoBriefing19");
    expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("www.omundoemcores.com.br").key).toBe("mundoEmCoresBriefing14");
  });
  it("mantém desligado o que não foi confirmado", () => {
    const f = resolveAdsPreviewFixture("briefing-20-v1")!;
    const p = f.profile;
    expect(p.hideConciergeActions).toBe(true);
    expect(p.visaHome).toBe(false);
    expect(p.featuredExperience).toBeUndefined();
    expect(p.dmc).toBeUndefined();
    expect(p.credentials).toBeUndefined();
    expect(p.team).toBeUndefined();
    for (const k of ["offers", "dmc", "team", "testimonials", "avaliacoes", "newsletter", "credentials"] as const) {
      expect(p.sections?.[k]).toEqual({ enabled: false });
    }
    expect(f.pages).toBeUndefined();
    expect(p.about?.badge?.value).toBe("Desde 2011");
    expect(p.footer?.cnpj).toBe("35.133.431/0001-00");
    expect(p.footer?.email).toBe("vendas@curtiviagens.com.br");
  });
  it("não renderiza em hosts públicos/reais", async () => {
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    for (const h of ["curtiviagens.com.br", "agentedesonhoproject.lovable.app", "www.omundoemcores.com.br"]) {
      route(h);
      const r = renderPreview(<MemoryRouter initialEntries={["/ads-briefing-preview/briefing-20-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Page />} /></Routes></MemoryRouter>);
      expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
      expect(document.querySelector('[data-ads-preview="briefing-20-v1"]')).toBeNull();
      r.unmount();
    }
  });
  it("no host técnico renderiza com aviso, noindex e ações bloqueadas", async () => {
    route("localhost");
    const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
    const r = renderPreview(<MemoryRouter initialEntries={["/ads-briefing-preview/briefing-20-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<Page />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Prévia para revisão — sem publicação · ações desativadas")).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-20-v1"]')).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
    const backend = import.meta.env.VITE_SUPABASE_URL as string;
    if (backend) await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow(/backend desativado/);
    expect(window.open("https://wa.me/5511992506672")).toBeNull();
    const a = document.createElement("a"); a.href = "https://curtiviagens.com.br/"; document.body.append(a);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); a.remove(); r.unmount();
  });
});
