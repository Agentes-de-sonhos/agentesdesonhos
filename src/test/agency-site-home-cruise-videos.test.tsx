import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import AgencySiteHome from "@/pages/whitelabel/AgencySiteHome";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";

// jsdom não implementa reprodução de mídia; o player editorial chama play().catch().
HTMLMediaElement.prototype.play = (() => Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.pause = (() => {}) as typeof HTMLMediaElement.prototype.pause;


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
  it("renderiza Disney Wish, Legend of the Seas e MSC World America na ordem correta", () => {
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

    // A galeria mostra apenas o vídeo ativo: começa no Disney Wish...
    expect(screen.getByText("Disney Wish")).toBeTruthy();
    expect(container.querySelector('video[src*="disney-wish-cruise.mp4"]')).toBeTruthy();

    // ...e navega para o Legend of the Seas com a seta "Próximo vídeo".
    fireEvent.click(screen.getByRole("button", { name: "Próximo vídeo" }));

    expect(screen.getByText("Legend of the Seas")).toBeTruthy();
    expect(container.querySelector('video[src*="legend-of-the-seas.mp4"]')).toBeTruthy();

    // ...e mantém o MSC World America na terceira posição da galeria.
    fireEvent.click(screen.getByRole("button", { name: "Próximo vídeo" }));

    expect(screen.getByText("MSC World America")).toBeTruthy();
    expect(container.querySelector('video[src*="msc-world-america.mp4"]')).toBeTruthy();
  });
});
