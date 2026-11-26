import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BLESSING_PREVIEW_JOB_ID, BLESSING_PREVIEW_PATH, BLESSING_PREVIEW_INFO as info, BLESSING_PREVIEW_PROFILE as profile, resolveAdsPreviewFixture, isCompletePresentationHost } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme, siteThemeRootClass } from "@/lib/agencySiteTheme";
import { resolveAgencyFaviconUrl, resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { GOLD_STANDARD_SECTION_ORDER } from "@/lib/goldStandardSiteTemplate";
import { resolveSections } from "@/lib/agencySiteConfig";
import { deriveTertiaryColor } from "@/lib/brandTheme";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import AdsBriefingPreview from "@/pages/adsPreview/AdsBriefingPreview";

vi.mock("@/pages/whitelabel/AgencySiteHome", () => ({ default: () => null }));
vi.mock("@/components/whitelabel/AgencySiteLayout", () => ({ AgencySiteLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>Not found</div> }));
afterEach(cleanup);
function mount(hostname = "localhost", suffix = "") {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname }, writable: true });
  return render(<MemoryRouter initialEntries={[`${BLESSING_PREVIEW_PATH}${suffix}`]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<AdsBriefingPreview />} /></Routes></MemoryRouter>);
}

describe("Blessingtravel — briefing-31-v1", () => {
  it("resolves only the exact path-keyed fixture and synthetic identity", () => {
    expect(BLESSING_PREVIEW_JOB_ID).toBe("briefing-31-v1");
    expect(BLESSING_PREVIEW_PATH).toBe("/ads-briefing-preview/briefing-31-v1");
    expect(resolveAdsPreviewFixture("briefing-31-v1")?.profile).toBe(profile);
    expect(resolveSiteProfile("briefing-31-v1.preview.local")).toBe(profile);
    for (const job of ["briefing-31-v2", "Briefing-30-v1", "briefing-31-v1 "]) expect(resolveAdsPreviewFixture(job)).toBeNull();
    expect(info.user_id).toBe("00000000-0000-0000-0000-00000000ad31");
    expect(info.agency_slug).toBe("");
    expect(info.public_slug).toBeNull();
    expect(info.is_primary).toBe(false);
    expect(profile.presentation).toBe(true);
    expect(profile.demo).toBe(false);
  });
  it("does not bind either public domain spelling or affect previous tenants/fixtures", () => {
    for (const host of ["blessingtravel.com.br", "www.blessingtravel.com.br", "briefing-31-v1.preview.local.evil.com"]) expect(resolveSiteProfile(host)).not.toBe(profile);
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
    expect(resolveAdsPreviewFixture("briefing-30-v1")?.profile.key).toBe("jeViagensBriefing30");
    expect(resolveAdsPreviewFixture("briefing-29-v1")?.profile.key).toBe("rbTourBriefing29");
    expect(resolveAdsPreviewFixture("briefing-28-v1")?.profile.key).toBe("roteirosDaTerraBriefing28");
    expect(resolveAdsPreviewFixture("briefing-27-v1")?.profile.key).toBe("viajeNaMagiaBriefing27");
  });
  it("uses only shared neutral SiteLab tokens on the shared SiteLab theme", () => {
    expect(info.primary_color).toBe("#0F1729");
    expect(info.secondary_color).toBe("#0F1729");
    expect(info.tertiary_color).toBe("#F6F6F8");
    expect(deriveTertiaryColor).toBeTypeOf("function");
    expect(resolveSiteTheme(info.hostname)).toBe("siteBaseEditorial");
    expect(siteThemeRootClass(info.hostname)).toBe(siteThemeRootClass("sitelab.local"));
  });
  it("never resolves an unconfirmed logo or another agency favicon", () => {
    expect(info.logo_url).toBeNull();
    expect(profile.textualWordmark).toBe(true);
    expect(resolveAgencyLogoUrl(info)).toBeNull();
    expect(resolveAgencyFaviconUrl(info)).toBeNull();
  });
  it("retains the authorized founding year", () => {
    expect(profile.about?.badge?.value).toBe("Desde 2011");
    expect(profile.about?.facts).toContain("Fundada em 2011");
  });
  it("retains the authorized location without a street address or legal identity", () => {
    expect(info.city).toBe("São Paulo");
    expect(info.state).toBe("SP");
    expect(info.cnpj).toBeNull();
    expect(info.phone).toBeNull();
    expect(profile.footer?.address).toBeUndefined();
    expect(profile.footer?.cnpj).toBeUndefined();
    expect(profile.footer?.legalName).toBeUndefined();
    expect(profile.footer?.email).toBeUndefined();
    expect(profile.footer?.instagram).toBeUndefined();
    expect(profile.footer?.whatsapp).toBeUndefined();
    expect(profile.about?.ownerName).toBeUndefined();
    expect(profile.about?.credential).toBeUndefined();
    expect(profile.socialStrip).toBeUndefined();
    expect(profile.testimonials).toBeUndefined();
    expect(profile.seo?.canonical).toBeUndefined();
  });
  it("retains the complete gold-standard inventory and shared product continuities", () => {
    expect(resolveSections(profile.sections).map(s => s.key)).toEqual(GOLD_STANDARD_SECTION_ORDER);
    expect(resolveAdsPreviewFixture(BLESSING_PREVIEW_JOB_ID)?.pages).toMatchObject({ xcaret: expect.any(Object), resorts: expect.any(Object), orlandoTickets: true, visa: true, dmc: true, editorial: true });
    expect(profile.modules).toHaveLength(6);
    expect(profile.destinations).toHaveLength(5);
    expect(profile.differentials).toHaveLength(4);
    expect(profile.conciergePoints).toHaveLength(4);
  });
  it.each(["agentedesonhoproject.lovable.app", "blessingtravel.com.br", "www.blessingtravel.com.br", "another.lovable.app", "id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app.evil.com"])("rejects nontechnical host %s", async host => {
    expect(isCompletePresentationHost(host)).toBe(false);
    mount(host);
    await screen.findByText("Not found");
  });
  it("rejects management routes", async () => {
    mount("localhost", "/gestao");
    await screen.findByText("Not found");
  });
  it("refuses commercial submissions independently of the page interceptor", async () => {
    const { result } = renderHook(() => useAgencySiteRequest(info.hostname));
    await act(async () => { expect(await result.current.submit({ name: "Revisão técnica", service_type: "pacotes" })).toEqual({ error: true }); });
    expect(result.current.state).toBe("error");
  });
  it("blocks all backend reads/writes, RPCs, functions, forms and external actions", async () => {
    const view = mount();
    await screen.findByRole("status");
    expect(resolveAdsPreviewFixture(BLESSING_PREVIEW_JOB_ID)?.strictBackendBlock).toBe(true);
    const backend = import.meta.env.VITE_SUPABASE_URL;
    if (!backend) throw new Error("Backend configuration required for guard verification");
    for (const [path, method] of [["/rest/v1/profiles", "GET"], ["/rest/v1/profiles", "POST"], ["/rest/v1/rpc/get_public_profile", "POST"], ["/functions/v1/submit-agency-site-request", "POST"], ["/functions/v1/google-place-reviews", "GET"], ["/functions/v1/club-med-snow-places", "GET"]]) {
      await expect(window.fetch(`${backend}${path}`, { method })).rejects.toThrow("backend desativado");
    }
    expect(window.open("https://blessingtravel.com.br")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    const link = document.createElement("a"); link.href = "https://blessingtravel.com.br"; document.body.append(link);
    expect(link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); link.remove(); view.unmount();
  });
});