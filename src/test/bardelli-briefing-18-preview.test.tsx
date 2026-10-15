import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BARDELLI_BRIEFING18_HOST as HOST,
  BARDELLI_BRIEFING18_INFO as INFO,
  BARDELLI_BRIEFING18_PATH as PATH,
  resolveAdsPreviewFixture,
} from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSections } from "@/lib/agencySiteConfig";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Página não encontrada</p> }));

const NOTICE = "Prévia para revisão — sem publicação · ações desativadas";
const renderPage = async (hostname: string) => {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
  const { default: Page } = await import("@/pages/adsPreview/AdsBriefingPreview");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (n: ReactNode) => <QueryClientProvider client={qc}>{n}</QueryClientProvider>;
  render(wrap(
    <MemoryRouter initialEntries={[PATH]}>
      <Routes><Route path="/ads-briefing-preview/:jobId" element={<Page />} /></Routes>
    </MemoryRouter>,
  ));
};

describe("briefing-18-v1 (Bardelli Viagens)", () => {
  it("resolve somente pelo job_id exato", () => {
    expect(PATH).toBe("/ads-briefing-preview/briefing-18-v1");
    expect(resolveAdsPreviewFixture("briefing-18-v1")?.profile.key).toBe("bardelliBriefing18");
    for (const id of ["briefing-18", "Briefing-18-v1", "briefing-18-v1 ", "briefing-18-v2", "briefing-18-v1/"]) {
      expect(resolveAdsPreviewFixture(id)).toBeNull();
    }
    expect(resolveAdsPreviewFixture("bardelli-completa-v1")?.profile.key).toBe("bardelliPresentation");
  });

  it("usa host e user_id sintéticos e identidade local", () => {
    expect(HOST).toBe("briefing-18-v1.preview.local");
    expect(INFO.hostname).toBe(HOST);
    expect(INFO.user_id).toBe("00000000-0000-0000-0000-000000000018");
    expect(INFO.agency_slug).toBe("");
    expect(INFO.public_slug).toBeNull();
    expect(INFO.phone).toBeNull();
    expect(INFO.primary_color).toBe("#e32400");
    expect(INFO.secondary_color).toBe("#000000");
    expect(INFO.logo_url).toContain("briefing-18-v1-logo");
    expect(resolveSiteProfile(HOST).key).toBe("bardelliBriefing18");
  });

  it("não se vincula ao domínio real nem altera outros tenants", () => {
    for (const real of ["bardelliviagens.com.br", "www.bardelliviagens.com.br"]) {
      expect(resolveSiteProfile(real).key).toBe("bardelliCurated");
    }
    expect(resolveSiteProfile("www.destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
    expect(JSON.stringify(resolveAdsPreviewFixture("briefing-18-v1"))).not.toMatch(/bardelliviagens\.com\.br"/);
  });

  it("omite endereço residencial e dados privados", () => {
    const f = resolveAdsPreviewFixture("briefing-18-v1")!;
    expect(f.profile.footer?.address).toBeUndefined();
    const json = JSON.stringify(f);
    expect(json).not.toMatch(/Cabiúna|Apto|Vila Mascote|CPF|contrato/i);
    expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(f.profile.footer?.legalName).toBe("JP Serviços de Informação e Assessoramento em Turismo Ltda");
  });

  it("mantém seções completas do padrão ouro sem depoimentos reais", () => {
    const p = resolveAdsPreviewFixture("briefing-18-v1")!.profile;
    const keys = resolveSections(p.sections).map((s) => s.key);
    for (const k of ["orlando", "resorts", "destinations", "authority", "offers", "avaliacoes", "newsletter"]) expect(keys).toContain(k);
    expect(p.about?.text?.split("\n\n")).toHaveLength(3);
    expect(p.testimonials).toBeUndefined();
    expect(p.hideConciergeActions).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/Juliana|Destinos com a Ju/);
  });

  it("em host de produção ou real não renderiza", async () => {
    await renderPage("www.bardelliviagens.com.br");
    expect(await screen.findByText("Página não encontrada")).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-18-v1"]')).toBeNull();
  });

  it("no host técnico mostra o aviso e bloqueia backend, janelas, envios e links externos", async () => {
    await renderPage("localhost");
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-18-v1"]')).toBeInTheDocument();
    const backend = import.meta.env.VITE_SUPABASE_URL as string;
    if (backend) await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow(/backend desativado/);
    expect(window.open("https://example.com")).toBeNull();
    const form = document.createElement("form");
    document.body.appendChild(form);
    const ev = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    const a = document.createElement("a");
    a.href = "https://wa.me/5511975767319";
    document.body.appendChild(a);
    const click = new MouseEvent("click", { cancelable: true, bubbles: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});
