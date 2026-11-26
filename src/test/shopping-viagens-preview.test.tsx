import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SHOPPING_PREVIEW_HOST, SHOPPING_PREVIEW_INFO, SHOPPING_PREVIEW_PROFILE, resolveAdsPreviewFixture } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import AdsBriefingPreview from "@/pages/adsPreview/AdsBriefingPreview";

vi.mock("@/pages/NotFound", () => ({ default: () => <p>Not found</p> }));
afterEach(cleanup);
function preview(hostname = "localhost", suffix = "") {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<HelmetProvider><QueryClientProvider client={client}><MemoryRouter initialEntries={[`/ads-briefing-preview/briefing-25-v1${suffix}`]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<AdsBriefingPreview />} /></Routes></MemoryRouter></QueryClientProvider></HelmetProvider>);
}
describe("Shopping briefing-25-v1", () => {
  it("resolves only the exact job and synthetic host", () => {
    expect(resolveAdsPreviewFixture("briefing-25-v1")?.profile).toBe(SHOPPING_PREVIEW_PROFILE);
    expect(resolveSiteProfile("briefing-25-v1.preview.local")).toBe(SHOPPING_PREVIEW_PROFILE);
    for (const id of ["briefing-22", "Briefing-22-v1", "briefing-22-v2", "briefing-25-v1 "]) expect(resolveAdsPreviewFixture(id)).toBeNull();
    expect(resolveSiteProfile("shopping.preview.local").key).toBe("classic");
  });
  it("has no real tenant association or private briefing data", () => {
    expect(SHOPPING_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-00000000ad25");
    expect(SHOPPING_PREVIEW_INFO.hostname).toBe("briefing-25-v1.preview.local");
    expect(SHOPPING_PREVIEW_INFO.agency_slug).toBe("");
    expect(SHOPPING_PREVIEW_INFO.public_slug).toBeNull();
    expect(SHOPPING_PREVIEW_INFO.is_primary).toBe(false);
    expect(SHOPPING_PREVIEW_INFO.phone).toBeNull();
    expect(SHOPPING_PREVIEW_INFO.cnpj).toBeNull();
    expect(SHOPPING_PREVIEW_PROFILE.footer?.cnpj).toBeUndefined();
    expect(SHOPPING_PREVIEW_PROFILE.footer?.legalName).toBeUndefined();
    expect(SHOPPING_PREVIEW_PROFILE.footer?.address).toBe("São Paulo/SP");
  });
  it("uses the shared neutral theme and only a textual wordmark", () => {
    expect(SHOPPING_PREVIEW_INFO.logo_url).toBeNull();
    expect(SHOPPING_PREVIEW_PROFILE.textualWordmark).toBe(true);
    expect(resolveSiteTheme(SHOPPING_PREVIEW_HOST)).toBe("siteBaseEditorial");
    expect(siteThemeRootClass(SHOPPING_PREVIEW_HOST)).toContain("wl-shopping-mundo");
  });
  it("does not enable unconfirmed reviews, certifications, team or offers", () => {
    for (const key of ["avaliacoes", "testimonials", "credentials", "team", "offers", "dmc", "newsletter", "orlando"] as const) expect(SHOPPING_PREVIEW_PROFILE.sections?.[key]).toEqual({ enabled: false });
    expect(SHOPPING_PREVIEW_PROFILE.team).toBeUndefined();
    expect(SHOPPING_PREVIEW_PROFILE.credentials).toBeUndefined();
    expect(SHOPPING_PREVIEW_PROFILE.visaHome).toBe(false);
    expect(SHOPPING_PREVIEW_PROFILE.hideConciergeActions).toBe(true);
  });
  it("retains the authorized founding year and public contacts", () => {
    expect(SHOPPING_PREVIEW_PROFILE.about?.badge?.value).toBe("Desde 2002");
    expect(SHOPPING_PREVIEW_PROFILE.about?.ownerName).toBe("Cristina Vale");
    expect(SHOPPING_PREVIEW_PROFILE.footer?.phone).toBe("(11) 2096-7777");
    expect(SHOPPING_PREVIEW_PROFILE.footer?.whatsapp).toBe("(11) 94714-8466");
    expect(SHOPPING_PREVIEW_PROFILE.footer?.email).toBe("info@shoppingviagens.com.br");
    expect(SHOPPING_PREVIEW_PROFILE.footer?.instagramLabel).toBe("@shoppingviagens");
  });
  it("renders briefing-specific content in the IMM-inspired order without borrowed identity or offers", async () => {
    preview();
    await screen.findByRole("heading", { name: "Ideias para a sua próxima viagem" }, { timeout: 9_000 });
    const home = document.querySelector('[data-ads-preview="briefing-25-v1"]')!;
    const ids = [...home.querySelectorAll("section[id]")].map(s => s.id);
    for (const id of ["campanhas", "destinos", "resorts", "autoridade", "sobre", "atendimento", "faq"]) expect(ids).toContain(id);
    expect(ids.indexOf("campanhas")).toBeLessThan(ids.indexOf("destinos"));
    expect(ids.indexOf("resorts")).toBeLessThan(ids.indexOf("autoridade"));
    expect(screen.getByText("Caribe e México", { selector: "h3" })).toBeInTheDocument();
    expect(home.querySelector('[href*="xcaret"], [href*="oportunidades-novembro"]')).toBeNull();
    expect(home.textContent).not.toMatch(/Xcaret|Ivete Meneghello|Vanessa/);
  }, 12_000);
  it("maps editorial subjects to the correct reusable image slots", () => {
    expect(SHOPPING_PREVIEW_PROFILE.hero?.map(s => s.image)).toEqual(["capitaisItalia", "cruzeiro", "iberostarPraiaDoForte"]);
    expect(SHOPPING_PREVIEW_PROFILE.destinations?.map(d => d.title)).toEqual(["Itália", "Caribe e México", "Resorts no Nordeste", "Estados Unidos"]);
    expect(SHOPPING_PREVIEW_PROFILE.about?.media).toBe("hidden");
  });
  it("leaves existing fixture and official profile resolutions intact", () => {
    expect(resolveAdsPreviewFixture("briefing-22-v1")?.profile.key).toBe("pristurBriefing22");
    expect(resolveSiteProfile("curtiviagens.com.br").key).toBe("curtiViagensOfficial");
    expect(resolveSiteProfile("essyatur.com.br").key).toBe("essyaOfficial");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
  });
  it.each(["agentedesonhoproject.lovable.app", "essyatur.com.br", "vitrine.tur.br", "id-preview--fake.lovable.app.evil.com", "another.lovable.app"])("rejects public/unapproved host %s", async (host) => {
    preview(host);
    expect(await screen.findByText("Not found")).toBeInTheDocument();
    expect(document.querySelector('[data-ads-preview="briefing-25-v1"]')).toBeNull();
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
    expect(window.open("https://wa.me/5511947148466")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    const a = document.createElement("a"); a.href = "https://wa.me/5511947148466"; document.body.append(a);
    expect(a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); a.remove(); result.unmount();
  });
});