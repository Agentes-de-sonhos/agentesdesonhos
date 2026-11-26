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

describe("IMM home surfaces", () => {
  it.each(["immturismo.com.br", "www.immturismo.com.br"])(
    "keeps Opportunities first and white, alternates the middle, and ends in a white Newsletter on %s",
    (hostname) => {
      const root = home(hostname);
      const bands = Array.from(root.querySelectorAll<HTMLElement>(".wl-imm > main > [data-imm-surface]"));
      expect(bands.length).toBeGreaterThan(6);
      expect(bands[0].querySelector("#ofertas")).not.toBeNull();
      expect(bands.at(-1)?.querySelector("#novidades")).not.toBeNull();
      expect(bands.at(-1)?.nextElementSibling).toBeNull();
      expect(bands.at(-1)?.parentElement?.nextElementSibling).toHaveAttribute("id", "rodape");
      expect(bands.map((band) => band.dataset.immSurface)).toEqual(
        bands.map((_, i) => i === bands.length - 1 || i % 2 === 0 ? "white" : "gradient"),
      );
      expect(root.querySelector("#autoridade [data-testid='cruise-season-authority']")).not.toBeNull();
    },
  );
  it("does not opt O Mundo em Cores into the IMM backgrounds", () => {
    const root = home("omundoemcores.com.br");
    expect(root.querySelector(".wl-imm")).toBeNull();
    expect(root.querySelector("[data-imm-surface]")).toBeNull();
  });
});
