import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";
import { KARIBU_PREVIEW_INFO } from "@/lib/adsBriefingPreview";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [], error: null })),
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
}));
vi.mock("@/lib/resortCuration", async (original) => ({
  ...await original<typeof import("@/lib/resortCuration")>(),
  useAgencyResortCuration: () => ({ data: undefined }),
}));
vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ submit: vi.fn(), reset: vi.fn(), state: "idle" }),
}));
afterEach(cleanup);

function home(hostname: string) {
  const info = { ...KARIBU_PREVIEW_INFO, hostname, agency_name: "IM&M Viagens e Turismo" };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider><QueryClientProvider client={client}><MemoryRouter>
      <AgencySiteLayout info={info}><AgencySiteHome info={info} noindex /></AgencySiteLayout>
    </MemoryRouter></QueryClientProvider></HelmetProvider>,
  ).container;
}


describe("IMM social links", () => {
  it.each(["immturismo.com.br", "www.immturismo.com.br"])("shows matching social links immediately below Novidades on %s", (hostname) => {
    const root = home(hostname);
    const strip = root.querySelector('#novidades + section[aria-label="Acompanhe a IMM"]');
    expect(strip).not.toBeNull();
    const instagram = strip?.querySelector('a[aria-label="Instagram da agência"]');
    const facebook = strip?.querySelector('a[aria-label="Facebook da agência"]');
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/imm_turismo/");
    expect(facebook).toHaveAttribute("href", "https://www.facebook.com/immturismo/");
    for (const link of [instagram, facebook]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link?.getAttribute("rel")).toContain("noopener");
    }
  });
  it.each(["omundoemcores.com.br", "paraisoviagens.com", "kaributurismo.com.br"])("does not add IMM accounts to %s", (hostname) => {
    const root = home(hostname);
    expect(root.querySelector('[aria-label="Acompanhe a IMM"]')).toBeNull();
    expect(root.querySelector('a[href*="instagram.com/imm_turismo"]')).toBeNull();
    expect(root.querySelector('a[href*="facebook.com/immturismo"]')).toBeNull();
  });
});
