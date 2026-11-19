import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VIAJE_NA_MAGIA_PREVIEW_INFO as info, VIAJE_NA_MAGIA_PREVIEW_PROFILE as profile, resolveAdsPreviewFixture, isCompletePresentationHost } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { resolveSiteTheme } from "@/lib/agencySiteTheme";
import { resolveAgencyFaviconUrl } from "@/lib/agencySiteBrand";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { renderHook, act } from "@testing-library/react";
import AdsBriefingPreview from "@/pages/adsPreview/AdsBriefingPreview";

vi.mock("@/pages/whitelabel/AgencySiteHome", () => ({ default: () => null }));
vi.mock("@/components/whitelabel/AgencySiteLayout", () => ({ AgencySiteLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/pages/NotFound", () => ({ default: () => <div>Not found</div> }));
afterEach(cleanup);

describe("Viaje na Magia — isolated briefing-27-v1", () => {
  it("resolves the exact local fixture without binding the confirmed real account", () => {
    expect(resolveAdsPreviewFixture("briefing-27-v1")?.profile).toBe(profile);
    expect(resolveSiteProfile("briefing-27-v1.preview.local")).toBe(profile);
    expect(resolveAdsPreviewFixture("briefing-27-v2")).toBeNull();
    expect(info.user_id).toBe("00000000-0000-0000-0000-00000000ad27");
    expect(info.user_id).not.toBe("22a28c0e-b2ac-4898-b6a9-f09fea1cc0e2");
    expect(info.agency_slug).toBe("");
    expect(info.public_slug).toBeNull();
    expect(info.is_primary).toBe(false);
    expect(profile.presentation).toBe(true);
    expect(profile.demo).toBe(false);
  });
  it("uses the three-color contract and SiteLab theme without changing other hosts", () => {
    expect(info.primary_color).toBe("#164f76");
    expect(info.secondary_color).toBe("#ffffff");
    expect(info.tertiary_color).toBe("#E3EAEF");
    expect(resolveSiteTheme(info.hostname)).toBe("siteBaseEditorial");
    expect(resolveAgencyFaviconUrl(info)).toBe("/viaje-na-magia/favicon.png");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteProfile("100limites.tur.br").key).toBe("editorialDmc");
  });
  it("does not assign unknown certificates, reviews, social accounts, legal identity or domains", () => {
    expect(info.cnpj).toBeNull();
    expect(profile.credentials).toBeUndefined();
    expect(profile.testimonials).toBeUndefined();
    expect(profile.socialStrip).toBeUndefined();
    expect(profile.footer?.instagram).toBeUndefined();
    expect(profile.footer?.cnpj).toBeUndefined();
    expect(profile.seo?.canonical).toBeUndefined();
    expect(profile.about?.badge?.value).toBe("Desde 2020");
    expect(profile.about?.ownerName).toBe("Elisangela Silva");
  });
  it("keeps public and unapproved hosts outside the technical presentation", () => {
    for (const host of ["agentedesonhoproject.lovable.app", "pristur.com.br", "another.lovable.app", "id-preview--fake.lovable.app.evil.com"]) expect(isCompletePresentationHost(host)).toBe(false);
    expect(isCompletePresentationHost("localhost")).toBe(true);
  });
  it("blocks request submission independently of the page interception", async () => {
    const { result } = renderHook(() => useAgencySiteRequest(info.hostname));
    await act(async () => { expect(await result.current.submit({ name: "Revisão", service_type: "pacotes" })).toEqual({ error: true }); });
    expect(result.current.state).toBe("error");
  });
  it("blocks all backend endpoints including previously allowed public exceptions, forms and external actions", async () => {
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "localhost" }, writable: true });
    const rendered = render(<MemoryRouter initialEntries={["/ads-briefing-preview/briefing-27-v1"]}><Routes><Route path="/ads-briefing-preview/:jobId/*" element={<AdsBriefingPreview />} /></Routes></MemoryRouter>);
    await screen.findByRole("status");
    const backend = import.meta.env.VITE_SUPABASE_URL;
    if (!backend) throw new Error("Backend config required for guard test");
    for (const path of ["/rest/v1/profiles", "/functions/v1/submit-agency-site-request", "/functions/v1/google-place-reviews", "/functions/v1/club-med-snow-places"]) await expect(window.fetch(`${backend}${path}`)).rejects.toThrow("backend desativado");
    expect(window.open("https://wa.me/5511984028192")).toBeNull();
    const form = document.createElement("form"); document.body.append(form);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(false);
    const link = document.createElement("a"); link.href = "https://wa.me/5511984028192"; document.body.append(link);
    expect(link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);
    form.remove(); link.remove(); rendered.unmount();
  });
});