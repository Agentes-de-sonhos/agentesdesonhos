import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ROTEIROS_DA_TERRA_PREVIEW_INFO as info, ROTEIROS_DA_TERRA_PREVIEW_PROFILE as profile, resolveAdsPreviewFixture, isCompletePresentationHost } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme } from "@/lib/agencySiteTheme";
import { resolveAgencyFaviconUrl } from "@/lib/agencySiteBrand";
import { resolveSections } from "@/lib/agencySiteConfig";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import AdsBriefingPreview from "@/pages/adsPreview/AdsBriefingPreview";

vi.mock("@/pages/whitelabel/AgencySiteHome", () => ({ default: () => null }));
vi.mock("@/components/whitelabel/AgencySiteLayout", () => ({ AgencySiteLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>Not found</div> }));
afterEach(cleanup);

function mount(hostname = "localhost") {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
  return render(<MemoryRouter initialEntries={["/ads-briefing-preview/briefing-28-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<AdsBriefingPreview />} /></Routes></MemoryRouter>);
}

describe("ROTEIROS DA TERRA — briefing-28-v1 isolation", () => {
  it("uses only the exact synthetic fixture, no public account or slug", () => {
    expect(resolveAdsPreviewFixture("briefing-28-v1")?.profile).toBe(profile);
    expect(resolveSiteProfile("briefing-28-v1.preview.local")).toBe(profile);
    expect(resolveAdsPreviewFixture("briefing-28-v2")).toBeNull();
    expect(info.user_id).toBe("00000000-0000-0000-0000-00000000ad28");
    expect(info.public_slug).toBeNull();
    expect(info.agency_slug).toBe("");
    expect(info.is_primary).toBe(false);
    expect(profile.presentation).toBe(true);
    expect(profile.demo).toBe(false);
  });
  it("keeps the confirmed palette and independent favicon", () => {
    expect(info.primary_color).toBe("#23314D");
    expect(info.secondary_color).toBe("#F8E1E5");
    expect(info.tertiary_color).toBe("#E5E6EA");
    expect(resolveSiteTheme(info.hostname)).toBe("siteBaseEditorial");
    expect(resolveAgencyFaviconUrl(info)).toBe("/roteiros-da-terra/favicon.png");
  });
  it("does not publish private identity, invented social accounts, certificates, reviews or an active domain", () => {
    expect(info.cnpj).toBeNull();
    expect(profile.footer?.address).toBeUndefined();
    expect(profile.footer?.cnpj).toBeUndefined();
    expect(profile.footer?.legalName).toBeUndefined();
    expect(profile.footer?.instagram).toBeUndefined();
    expect(profile.socialStrip).toBeUndefined();
    expect(profile.credentials).toBeUndefined();
    expect(profile.team).toBeUndefined();
    expect(profile.testimonials).toBeUndefined();
    expect(profile.seo?.canonical).toBeUndefined();
    expect(resolveSections(profile.sections).map(s => s.key)).not.toContain("avaliacoes");
    expect(profile.about?.badge?.value).toBe("Desde 2019");
    expect(profile.about?.ownerName).toBe("Andrea Machado Terra");
  });
  it("retains complete product continuities from the shared gold standard", () => {
    const pages = resolveAdsPreviewFixture("briefing-28-v1")?.pages;
    expect(pages?.xcaret).toBeDefined();
    expect(pages?.visa).toBe(true);
    expect(pages?.orlandoTickets).toBe(true);
    expect(pages?.resorts).toBeDefined();
    expect(pages?.dmc).toBe(true);
    expect(pages?.editorial).toBe(true);
    expect(resolveSections(profile.sections).map(s => s.key)).toEqual(expect.arrayContaining(["modules", "orlando", "destinations", "resorts", "authority", "dmc", "about", "faq", "newsletter", "offers"]));
  });
  it("preserves reference tenants and never binds the supplied public domain", () => {
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
    expect(resolveSiteProfile("roteirosdaterra.com.br")).not.toBe(profile);
    expect(resolveSiteProfile("www.roteirosdaterra.com.br")).not.toBe(profile);
  });
  it("rejects production, agency domains and deceptive preview hosts", async () => {
    for (const host of ["agentedesonhoproject.lovable.app", "roteirosdaterra.com.br", "another.lovable.app", "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app.evil.com"]) {
      expect(isCompletePresentationHost(host)).toBe(false);
      const view = mount(host);
      await screen.findByText("Not found");
      view.unmount();
    }
    expect(isCompletePresentationHost("localhost")).toBe(true);
    expect(isCompletePresentationHost("id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app")).toBe(true);
  });
  it("refuses commercial submissions independently of interception", async () => {
    const { result } = renderHook(() => useAgencySiteRequest(info.hostname));
    await act(async () => { expect(await result.current.submit({ name: "Revisão técnica", service_type: "pacotes" })).toEqual({ error: true }); });
    expect(result.current.state).toBe("error");
  });
  it("blocks reads, writes, RPC, functions, forms and external navigation", async () => {
    const view = mount();
    await screen.findByRole("status");
    const backend = import.meta.env.VITE_SUPABASE_URL;
    if (!backend) throw new Error("Backend configuration required for guard verification");
    for (const [path, method] of [["/rest/v1/profiles", "GET"], ["/rest/v1/profiles", "POST"], ["/rest/v1/rpc/get_public_profile", "POST"], ["/functions/v1/submit-agency-site-request", "POST"], ["/functions/v1/google-place-reviews", "GET"], ["/functions/v1/club-med-snow-places", "GET"]]) {
      await expect(window.fetch(`${backend}${path}`, { method })).rejects.toThrow("backend desativado");
    }
    expect(window.open("https://wa.me/5521988974969")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    const link = document.createElement("a"); link.href = "mailto:andrea@roteirosdaterra.com.br"; document.body.append(link);
    expect(link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); link.remove(); view.unmount();
  });
});