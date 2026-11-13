import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { isUniversalLandingEnabled } from "@/lib/universalLandingAccess";
import { OrlandoEditorialGallery } from "@/components/orlando/OrlandoEditorialGallery";
import { ARENA_PREVIEW_INFO, ARENA_PREVIEW_PROFILE, MUNDO_EM_CORES_PREVIEW_PROFILE } from "@/lib/adsBriefingPreview";

afterEach(cleanup);
describe("Arena finalization gates", () => {
  it("enables Universal only for the exact Arena preview host", () => {
    expect(isUniversalLandingEnabled("briefing-23-v1.preview.local")).toBe(true);
    expect(isUniversalLandingEnabled("briefing-23-v1.preview.local.example.com")).toBe(false);
  });
  it("allows Arena's nine Orlando experiences and rejects unknown tenants", () => {
    const { unmount } = render(<OrlandoEditorialGallery hostname="briefing-23-v1.preview.local" />);
    expect(screen.getAllByRole("button", { name: /^Ver / })).toHaveLength(9);
    unmount();
    render(<OrlandoEditorialGallery hostname="unknown.preview.local" />);
    expect(screen.queryByRole("region", { name: "Parques e experiências em Orlando" })).toBeNull();
  });
  it("keeps the authorized legal identity with only the phone hidden", () => {
    expect(ARENA_PREVIEW_PROFILE.footer).toMatchObject({ legalName: "ARENA TRAVEL GROUP LTDA", cnpj: "57.332.735/0001-30", phoneHidden: true, whatsapp: "(47) 99269-0807" });
    expect(ARENA_PREVIEW_INFO.user_id).toBe("00000000-0000-0000-0000-00000000ad23");
    expect(ARENA_PREVIEW_INFO.agency_slug).toBe("");
  });
  it("retains other tenant cruise copy", () => {
    expect(MUNDO_EM_CORES_PREVIEW_PROFILE.authority?.companies?.title).toBe("Na Mundo em Cores, você encontra as principais companhias de cruzeiros do mundo.");
  });
});