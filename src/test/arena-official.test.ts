import { describe, expect, it } from "vitest";
import { ARENA_PREVIEW_INFO, ARENA_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { resolveSiteAssist, isWithinAssistHours } from "@/lib/agencySiteAssist";
import { resolveSiteContacts } from "@/lib/agencySiteContacts";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";
import { cadasturCertificateFor } from "@/components/whitelabel/CadasturSeal";

describe("Arena official host opt-in", () => {
  it.each(["arenatravelgroup.com.br", "www.arenatravelgroup.com.br"])("resolves %s to the approved non-demo profile", host => {
    const profile = resolveSiteProfile(host);
    expect(profile.key).toBe("arenaOfficial");
    expect(profile.presentation).toBe(false);
    expect(profile.demo).toBe(false);
    expect(profile.hero).toEqual(ARENA_PREVIEW_PROFILE.hero);
    expect(profile.destinations).toEqual(ARENA_PREVIEW_PROFILE.destinations);
    expect(profile.faq).toEqual(ARENA_PREVIEW_PROFILE.faq);
    expect(profile.destinationsFixedOrder).toBe(true);
    expect(siteThemeRootClass(host)).toContain("wl-arena");
    expect(isUniversalLandingEnabled(host)).toBe(true);
    expect(cadasturCertificateFor(host)).toEqual(cadasturCertificateFor("briefing-23-v1.preview.local"));
  });
  it("keeps synthetic identity and unrelated hosts isolated", () => {
    expect(resolveSiteProfile("briefing-23-v1.preview.local")).toBe(ARENA_PREVIEW_PROFILE);
    expect(ARENA_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-00000000ad23");
    expect(ARENA_PREVIEW_INFO.agency_slug).toBe("");
    expect(resolveSiteProfile("arenatravelgroup.com.br.example.com").key).toBe("classic");
    expect(resolveSiteProfile("destinoscomaju.com.br").key).toBe("editorialRose");
    expect(resolveSiteAssist("briefing-23-v1.preview.local")).toBeNull();
  });
  it("uses only Rafael's authorized contact on both hosts", () => {
    for (const host of ["arenatravelgroup.com.br", "www.arenatravelgroup.com.br"]) {
      expect(resolveSiteContacts(host)).toMatchObject({ email: "arenatravel@arenatravelgroup.com.br", phone: "5547992690807" });
    }
  });
  it("opens at 09:00 and closes at 18:00 in Sao Paulo, Monday through Friday only", () => {
    const assist = resolveSiteAssist("arenatravelgroup.com.br");
    if (!assist) throw new Error("Arena assist missing");
    expect(assist.hours).toEqual({ days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080 });
    expect(resolveSiteAssist("www.arenatravelgroup.com.br")).toBe(assist);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-13T11:59:00Z"))).toBe(false);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-13T12:00:00Z"))).toBe(true);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-13T20:59:00Z"))).toBe(true);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-13T21:00:00Z"))).toBe(false);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-14T15:00:00Z"))).toBe(false);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-15T15:00:00Z"))).toBe(false);
    expect(isWithinAssistHours(assist.hours, new Date("2026-11-16T12:00:00Z"))).toBe(true);
  });
});