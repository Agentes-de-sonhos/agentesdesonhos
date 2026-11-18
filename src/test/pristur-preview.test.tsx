import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PRISTUR_PREVIEW_HOST, PRISTUR_PREVIEW_INFO, PRISTUR_PREVIEW_PROFILE, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import AdsBriefingPreview from "@/pages/adsPreview/AdsBriefingPreview";
import { resolveAgencyLogoOverride, resolveAgencyFaviconUrl } from "@/lib/agencySiteBrand";
import { cadasturCertificateFor } from "@/components/whitelabel/CadasturSeal";
import { resolveAgencySpinnerMark } from "@/components/whitelabel/AgencyBrandSpinner";
import { siteNavLinks } from "@/components/whitelabel/AgencySiteLayout";
import { resolveSections } from "@/lib/agencySiteConfig";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Not found</p> }));
afterEach(cleanup);
function preview(hostname = "localhost", suffix = "") {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/ads-briefing-preview/briefing-22-v1${suffix}`]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<AdsBriefingPreview />} /></Routes></MemoryRouter></QueryClientProvider>);
}
describe("Pristur briefing-22-v1", () => {
  it("resolves only the exact job and synthetic host", () => {
    expect(resolveAdsPreviewFixture("briefing-22-v1")?.profile).toBe(PRISTUR_PREVIEW_PROFILE);
    expect(resolveSiteProfile("briefing-22-v1.preview.local")).toBe(PRISTUR_PREVIEW_PROFILE);
    for (const id of ["briefing-22", "Briefing-22-v1", "briefing-22-v2", "briefing-22-v1 "]) expect(resolveAdsPreviewFixture(id)).toBeNull();
    expect(resolveSiteProfile("pristur.preview.local").key).toBe("classic");
  });
  it("has no real tenant association or private briefing data", () => {
    expect(PRISTUR_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-00000000ad22");
    expect(PRISTUR_PREVIEW_INFO.hostname).toBe("briefing-22-v1.preview.local");
    expect(PRISTUR_PREVIEW_INFO.agency_slug).toBe("");
    expect(PRISTUR_PREVIEW_INFO.public_slug).toBeNull();
    expect(PRISTUR_PREVIEW_INFO.is_primary).toBe(false);
    expect(PRISTUR_PREVIEW_INFO.phone).toBeNull();
    expect(PRISTUR_PREVIEW_INFO.cnpj).toBeNull();
    expect(PRISTUR_PREVIEW_PROFILE.footer?.cnpj).toBe("57.385.871/0001-98");
    expect(PRISTUR_PREVIEW_PROFILE.footer?.legalName).toBe("Priscila Vasconcelos");
    expect(PRISTUR_PREVIEW_PROFILE.footer?.address).toBe("São Paulo/SP");
  });
  it("uses the shared editorial theme with the supplied logo and brand palette", () => {
    expect(PRISTUR_PREVIEW_INFO.logo_url).toBeNull();
    expect(PRISTUR_PREVIEW_PROFILE.textualWordmark).toBe(false);
    expect(resolveSiteTheme(PRISTUR_PREVIEW_HOST)).toBe("siteBaseEditorial");
    expect(resolveAgencyLogoOverride(PRISTUR_PREVIEW_HOST)).toContain("logo-pristur.png");
    expect(PRISTUR_PREVIEW_INFO.primary_color).toBe("#30206D");
  });
  it("does not enable unconfirmed reviews, certifications, team or offers", () => {
    for (const key of ["avaliacoes", "testimonials", "credentials", "team", "offers", "dmc"] as const) expect(PRISTUR_PREVIEW_PROFILE.sections?.[key]).toEqual({ enabled: false });
    expect(PRISTUR_PREVIEW_PROFILE.sections?.authority).toEqual({ enabled: true, order: 3.5 });
    expect(PRISTUR_PREVIEW_PROFILE.sections?.newsletter).toEqual({ enabled: true, order: 10 });
    expect(PRISTUR_PREVIEW_PROFILE.team).toBeUndefined();
    expect(PRISTUR_PREVIEW_PROFILE.credentials).toBeUndefined();
    expect(PRISTUR_PREVIEW_PROFILE.visaHome).toBe(false);
    expect(PRISTUR_PREVIEW_PROFILE.hideConciergeActions).toBe(true);
  });
  it("retains the authorized founding year and public contacts", () => {
    expect(PRISTUR_PREVIEW_PROFILE.about?.badge?.value).toBe("Desde 2009");
    expect(PRISTUR_PREVIEW_PROFILE.about?.ownerName).toBe("Priscila Vasconcelos");
    expect(PRISTUR_PREVIEW_PROFILE.footer?.phoneHidden).toBe(true);
    expect(PRISTUR_PREVIEW_PROFILE.footer?.whatsapp).toBe("(11) 98301-7038");
    expect(PRISTUR_PREVIEW_PROFILE.footer?.email).toBe("consultoriapristurviagens@gmail.com");
    expect(PRISTUR_PREVIEW_PROFILE.footer?.instagramLabel).toBe("@priturismo");
  });
  it("leaves existing fixture and official profile resolutions intact", () => {
    expect(resolveAdsPreviewFixture("briefing-21-v1")?.profile.key).toBe("karibuBriefing21");
    expect(resolveSiteProfile("curtiviagens.com.br").key).toBe("curtiViagensOfficial");
    expect(resolveSiteProfile("essyatur.com.br").key).toBe("essyaOfficial");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
  });
  it.each(["agentedesonhoproject.lovable.app", "essyatur.com.br", "vitrine.tur.br", "id-preview--fake.lovable.app.evil.com", "another.lovable.app"])("rejects public/unapproved host %s", async (host) => {
    preview(host);
    expect(await screen.findByText("Not found")).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-22-v1"]')).toBeNull();
  });
  it("rejects CRM and unsupported inner routes", async () => {
    preview("localhost", "/gestao");
    expect(await screen.findByText("Not found")).toBeInTheDocument();
  });
  it("blocks forms, commercial links, window opening and backend on the real preview route", async () => {
    const result = preview();
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
    const backend = import.meta.env.VITE_SUPABASE_URL;
    if (!backend) throw new Error("Backend configuration required to exercise the guard");
    await expect(window.fetch(`${backend}/rest/v1/profiles`)).rejects.toThrow("backend desativado");
    await expect(window.fetch(`${backend}/functions/v1/agency-site-request`, { method: "POST" })).rejects.toThrow("backend desativado");
    expect(window.open("https://wa.me/5511983017038")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    const a = document.createElement("a"); a.href = "https://wa.me/5511983017038"; document.body.append(a);
    expect(a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); a.remove(); result.unmount();
  });
});
describe("Pristur — seções escolhidas por Fernando", () => {
  it("keeps supplied branding and certificate scoped to the synthetic preview", () => {
    expect(resolveAgencySpinnerMark(PRISTUR_PREVIEW_HOST)).toBe(resolveAgencyLogoOverride(PRISTUR_PREVIEW_HOST));
    expect(resolveAgencyFaviconUrl(PRISTUR_PREVIEW_INFO)).toBe("/pristur/favicon.png");
    expect(cadasturCertificateFor(PRISTUR_PREVIEW_HOST)?.agency).toBe("Pristur Viagens");
    expect(cadasturCertificateFor(PRISTUR_PREVIEW_HOST)?.url).toContain("certificado-cadastur-pristur.png");
    expect(resolveAgencyLogoOverride("pristur.preview.local")).toBeNull();
    expect(cadasturCertificateFor("pristur.preview.local")).toBeNull();
  });
  it("sem Xcaret e sem Avaliações do Google na home e no menu", () => {
    expect(PRISTUR_PREVIEW_PROFILE.featuredExperience).toBeUndefined();
    expect(PRISTUR_PREVIEW_PROFILE.sections?.avaliacoes).toEqual({ enabled: false });
    const links = JSON.stringify(PRISTUR_PREVIEW_PROFILE.nav);
    expect(links).not.toContain("/xcaret");
    expect(links).not.toContain("/#avaliacoes");
    expect(links).not.toContain("/oportunidades-novembro");
    expect(resolveAdsPreviewFixture("briefing-22-v1")?.pages?.xcaret).toBeUndefined();
  });
  it("includes the cruise section and Orlando landing in the requested navigation", () => {
    const links = siteNavLinks(PRISTUR_PREVIEW_HOST);
    expect(links.map(({ label }) => label)).toEqual([
      "Início", "Destinos", "Especialidades", "Parques Orlando / Disney",
      "Cruzeiros 26/27", "Resorts Brasil", "Sobre",
    ]);
    expect(links.at(-1)?.children?.map(({ label }) => label)).toEqual(["Quem Somos", "Dúvidas Frequentes"]);
    expect(isUniversalLandingEnabled(PRISTUR_PREVIEW_HOST)).toBe(true);
    expect(resolveSections(PRISTUR_PREVIEW_PROFILE.sections).map(({ key }) => key))
      .toEqual(["signature", "destinations", "orlando", "authority", "resorts", "about", "differentials", "concierge", "faq", "newsletter"]);
    expect(PRISTUR_PREVIEW_PROFILE.newsletterMedia?.src).toContain("mundo-newsletter-wing.jpg");
  });
});
