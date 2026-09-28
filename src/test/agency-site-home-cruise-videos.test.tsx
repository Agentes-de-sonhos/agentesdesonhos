import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

const info: AgencyDomainInfo = {
  user_id: "00000000-0000-0000-0000-000000000000",
  agency_slug: "destinos-com-a-ju",
  hostname: "www.destinoscomaju.com.br",
  is_primary: true,
  agency_name: "Destinos com a Ju",
  owner_name: "Juliana",
  logo_url: null,
  cover_image_url: null,
  primary_color: "#9d174d",
  secondary_color: null,
  secondary_auto: true,
  tertiary_color: null,
  tertiary_auto: true,
  on_secondary_color: null,
  phone: null,
  whatsapp: null,
  email: null,
  instagram: null,
  address: null,
  status: "active",
} as unknown as AgencyDomainInfo;

describe("galeria de vídeos de cruzeiros — Destinos com a Ju", () => {
  it("renderiza Disney Wish e Legend of the Seas com o vídeo correto", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    });
    const { container } = render(
      <HelmetProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AgencySiteHome info={info} />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );

    expect(screen.getByText("Disney Wish")).toBeTruthy();
    expect(screen.getByText("Legend of the Seas")).toBeTruthy();

    const legendVideo = container.querySelector(
      'video[src*="legend-of-the-seas.mp4"]',
    );
    expect(legendVideo).toBeTruthy();
  });
});
